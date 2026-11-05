"""Encrypted recovery bundles and isolated restore drills. Never restore over live volumes."""
import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile
import time
from datetime import datetime, timezone
from uuid import uuid4

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

ROOT = Path(__file__).resolve().parents[1]
MAGIC = b'DENTDOCS-BACKUP-1\0'
BLOCK = 1024 * 1024
LIMIT = 60 * 1024**3  # below AES-GCM's per-message limit
COMPONENTS = {'database.dump', 'files.tar', 'source.tar', 'config.env', 'models.tar', 'images.tar'}


def run(args, **kwargs):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, **kwargs)
    if result.returncode:
        raise RuntimeError('Recovery command failed: ' + ' '.join(args[:3]) + ' (details suppressed to protect configuration)')
    return result.stdout


def docker():
    found = shutil.which('docker')
    if not found:
        candidate = Path.home() / 'AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe'
        if candidate.exists(): found = str(candidate)
    if not found: raise RuntimeError('Docker Desktop is required')
    return found


def compose(*args):
    return [docker(), 'compose', '--project-directory', str(ROOT), '--profile', 'semantic', *args]


def restrict_access(path):
    """Fresh recovery artifacts are readable only by the current OS account."""
    path = Path(path)
    if os.name == 'nt':
        identity = subprocess.check_output(['whoami','/user','/fo','csv','/nh'],text=True)
        sid = re.search(r'S-1-\d+(?:-\d+)+',identity)
        if not sid: raise RuntimeError('Unable to determine recovery file owner')
        rights = '(OI)(CI)F' if path.is_dir() else 'F'
        result = subprocess.run(['icacls',str(path),'/inheritance:r','/grant:r',f"*{sid.group()}:{rights}"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        if result.returncode: raise RuntimeError('Unable to restrict recovery file access')
    else:
        path.chmod(0o700 if path.is_dir() else 0o600)


def key_read(path):
    value = base64.b64decode(Path(path).read_bytes().strip(), validate=True)
    if len(value) != 32: raise ValueError('Recovery key must contain 32 random bytes')
    return value


class EncryptedWriter:
    def __init__(self, path, key, name):
        self.path = Path(path)
        self.file = self.path.open('xb')
        nonce = os.urandom(12)
        self.file.write(MAGIC + nonce)
        self.cipher = Cipher(algorithms.AES(key), modes.GCM(nonce)).encryptor()
        self.cipher.authenticate_additional_data(MAGIC + name.encode())
        self.digest = hashlib.sha256()
        self.size = 0

    def write(self, data):
        if self.size + len(data) > LIMIT: raise ValueError('Recovery component exceeds supported size')
        self.file.write(self.cipher.update(data))
        self.digest.update(data)
        self.size += len(data)
        return len(data)

    def flush(self): self.file.flush()

    def finish(self):
        self.file.write(self.cipher.finalize())
        self.file.write(self.cipher.tag)
        self.file.flush(); os.fsync(self.file.fileno()); self.file.close()
        return {'sha256': self.digest.hexdigest(), 'size': self.size}

    def abort(self):
        self.file.close()
        self.path.unlink(missing_ok=True)


def encrypt_stream(path, key, name, stream):
    writer = EncryptedWriter(path, key, name)
    try:
        while data := stream.read(BLOCK): writer.write(data)
        return writer.finish()
    except BaseException:
        writer.abort(); raise


def encrypt_process(path, key, name, args):
    # stderr is intentionally not surfaced; it can contain host/configuration details.
    with subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL) as process:
        try:
            result = encrypt_stream(path, key, name, process.stdout)
        except BaseException:
            process.kill(); process.wait(); raise
        if process.wait() != 0:
            Path(path).unlink(missing_ok=True)
            raise RuntimeError('Recovery stream command failed')
        return result


def decrypt(path, output, key, name, expected=None):
    path, output = Path(path), Path(output)
    partial = output.with_name(output.name + '.unauthenticated')
    if output.exists() or partial.exists(): raise ValueError('Refusing to overwrite recovery output')
    try:
        with path.open('rb') as source, partial.open('xb') as target:
            if source.read(len(MAGIC)) != MAGIC: raise ValueError('Unknown recovery format')
            nonce = source.read(12)
            remaining = path.stat().st_size - len(MAGIC) - 12 - 16
            if not 0 <= remaining <= LIMIT: raise ValueError('Invalid recovery component length')
            source.seek(-16, 2); tag = source.read(16); source.seek(len(MAGIC) + 12)
            cipher = Cipher(algorithms.AES(key), modes.GCM(nonce, tag)).decryptor()
            cipher.authenticate_additional_data(MAGIC + name.encode())
            digest, size = hashlib.sha256(), 0
            while remaining:
                data = source.read(min(BLOCK, remaining))
                if not data: raise ValueError('Truncated recovery component')
                plain = cipher.update(data); target.write(plain); digest.update(plain)
                size += len(plain); remaining -= len(data)
            target.write(cipher.finalize())  # no use of plaintext before authentication
            if expected and expected != {'sha256': digest.hexdigest(), 'size': size}:
                raise ValueError('Recovery manifest mismatch')
        partial.rename(output)
    except BaseException:
        partial.unlink(missing_ok=True); raise


def safe_extract(archive, target):
    target = Path(target).resolve()
    target.mkdir(parents=True, exist_ok=False)
    with tarfile.open(archive) as source:
        members = source.getmembers()
        for member in members:
            path = PurePosixPath(member.name)
            if (not path.parts or path.is_absolute() or '..' in path.parts or '\\' in member.name
                or ':' in member.name or not (member.isfile() or member.isdir())
                or not (target / member.name).resolve().is_relative_to(target)):
                raise ValueError('Unsafe recovery archive member')
        source.extractall(target, members=members, filter='data')


def archive_paths(path, key, name, paths):
    writer = EncryptedWriter(path, key, name)
    try:
        with tarfile.open(fileobj=writer, mode='w|') as archive:
            for local, relative in paths:
                if local.is_symlink(): raise ValueError('Symlinks are not supported in recovery archives')
                archive.add(local, arcname=relative, recursive=False)
        return writer.finish()
    except BaseException:
        writer.abort(); raise


def backup(destination, key_path):
    destination = Path(destination).resolve()
    if destination.exists(): raise ValueError('Backup destination must be new')
    key = key_read(key_path)
    if Path(key_path).resolve().is_relative_to(destination): raise ValueError('Keep key separate from bundle')
    partial = destination.with_name(destination.name + '.incomplete')
    partial.mkdir(parents=True, exist_ok=False)
    restrict_access(partial)
    manifest = {'format':1, 'createdAt':datetime.now(timezone.utc).isoformat(), 'components':{}, 'images':{}}
    def capture(name, args):
        manifest['components'][name] = encrypt_process(partial / (name+'.enc'), key, name, args)
    running = run(compose('ps','--services','--status','running')).decode().split()
    if not {'db','api','web','handwriting','ocr'}.issubset(running):
        raise ValueError('Start the complete semantic profile before a full backup')
    for service in ['db','api','web','handwriting','ocr']:
        container = run(compose('ps','-q',service)).decode().strip()
        manifest['images'][service] = run([docker(),'inspect','--format','{{.Image}}',container]).decode().strip()
    for service,image in manifest['images'].items():
        try: run([docker(),'image','inspect','--format','{{.Id}}',image])
        except RuntimeError: raise RuntimeError(f'Running {service} image is unavailable for export; recreate that service from its prepared image without removing volumes, then retry') from None
    # Owner dump excludes ownership/ACL; isolated migration recreates runtime grants.
    stopped = False
    try:
        stopped = True
        run(compose('stop','web','api'))
        capture('database.dump',compose('exec','-T','db','pg_dump','-U','dentdocs','-d','dentdocs_mock','-Fc','--no-owner','--no-acl'))
        capture('files.tar',compose('run','--rm','--no-deps','-T','api','python','-c',
            "import sys,tarfile; t=tarfile.open(fileobj=sys.stdout.buffer,mode='w|'); t.add('/data/files',arcname='files'); t.close()"))
    finally:
        if stopped: run(compose('start','api','web'))
    capture('images.tar',[docker(),'image','save',*sorted(set(manifest['images'].values()))])
    manifest['components']['config.env'] = encrypt_stream(partial/'config.env.enc',key,'config.env',io.BytesIO((ROOT/'.env').read_bytes()))
    names = run(['git','-C',str(ROOT),'ls-files','-z']).decode().split('\0')
    paths = [(ROOT/name,name) for name in sorted(set(names)) if name and (ROOT/name).is_file()]
    manifest['components']['source.tar'] = archive_paths(partial/'source.tar.enc',key,'source.tar',paths)
    paths = []
    for folder in ['work/handwriting/amr-base-run-001/trained','work/semantic/model']:
        root = ROOT/folder
        if not root.is_dir(): raise ValueError('Required offline model missing')
        paths.extend((p,p.relative_to(ROOT).as_posix()) for p in sorted(root.rglob('*')) if p.is_file())
    manifest['components']['models.tar'] = archive_paths(partial/'models.tar.enc',key,'models.tar',paths)
    encrypt_stream(partial/'manifest.enc',key,'manifest',io.BytesIO(json.dumps(manifest).encode()))
    partial.rename(destination)
    print('Encrypted full backup completed. Key custody and an off-device copy remain operator responsibilities.')


def stage(bundle, key_path, target):
    bundle, target = Path(bundle).resolve(), Path(target).resolve()
    if target.exists(): raise ValueError('Restore destination must be new; live paths cannot be overwritten')
    if target == ROOT or ROOT.is_relative_to(target): raise ValueError('Unsafe restore destination')
    key = key_read(key_path)
    target.mkdir(parents=True)
    restrict_access(target)
    decrypt(bundle/'manifest.enc',target/'manifest.json',key,'manifest')
    manifest = json.loads((target/'manifest.json').read_text())
    if manifest.get('format') != 1 or set(manifest.get('components',{})) != COMPONENTS:
        raise ValueError('Incomplete or unsupported recovery bundle')
    for name, expected in manifest['components'].items():
        decrypt(bundle/(name+'.enc'),target/name,key,name,expected)
    # All components authenticate and hash-check before any extraction or Docker execution.
    safe_extract(target/'source.tar',target/'source')
    safe_extract(target/'models.tar',target/'models')
    safe_extract(target/'files.tar',target/'originals')
    return manifest


def validate_resources(resolved, project, source, port):
    if not re.fullmatch(r'dentdocs-drill-[0-9a-f]{10}',project): raise ValueError('Invalid drill identity')
    source = Path(source).resolve()
    for category in ['volumes','networks']:
        for resource in resolved.get(category,{}).values():
            if resource.get('external') or not resource.get('name','').startswith(project+'_'):
                raise ValueError('Restore resources must belong exclusively to the drill project')
    for name,service in resolved['services'].items():
        if service.get('container_name'): raise ValueError('Fixed container names are not supported in drills')
        for mount in service.get('volumes',[]):
            if mount['type']=='bind' and not Path(mount['source']).resolve().is_relative_to(source):
                raise ValueError('Restore bind mounts must stay inside the isolated source directory')
        for binding in service.get('ports',[]):
            if name!='web' or binding.get('host_ip')!='127.0.0.1' or int(binding.get('published',0))!=port:
                raise ValueError('Only the isolated loopback web port may be published')


def cleanup(target):
    target = Path(target).resolve()
    allowed = (ROOT/'work/recovery-drills').resolve()
    if target==allowed or not target.is_relative_to(allowed):
        raise ValueError('Automatic cleanup is restricted to a named workspace recovery drill')
    state = json.loads((target/'drill-project.json').read_text())
    project,port = state['project'],state['port']
    source = target/'source'
    command = [docker(),'compose','--project-directory',str(source),'-p',project,'--profile','semantic','-f',str(source/'compose.yaml'),'-f',str(target/'drill.yaml')]
    validate_resources(json.loads(run([*command,'config','--format','json'])),project,source,port)
    run([*command,'down','--volumes'])
    # The absolute deletion target is checked against the dedicated workspace subtree above.
    shutil.rmtree(target)
    print('Isolated drill containers, volumes and decrypted files removed. Live installation and encrypted bundles retained.')


def drill(bundle, key_path, target, port):
    target = Path(target).resolve()
    if not 1024 <= port <= 65535 or port == 8080: raise ValueError('Use a separate unprivileged drill port')
    manifest = stage(bundle,key_path,target)
    run([docker(),'image','load','-i',str(target/'images.tar')])
    source = target/'source'
    shutil.copyfile(target/'config.env',source/'.env')
    shutil.copytree(target/'models/work',source/'work',dirs_exist_ok=True)
    project = 'dentdocs-drill-'+uuid4().hex[:10]
    override = target/'drill.yaml'
    text = 'services:\n'
    images = {**manifest['images'], 'migrate':manifest['images']['api']}
    for service,image in images.items():
        if not re.fullmatch(r'sha256:[0-9a-f]{64}',image): raise ValueError('Invalid recovered image identity')
        text += f'  {service}:\n    build: !reset null\n    image: {image}\n    pull_policy: never\n'
        if service == 'web': text += f'    ports: !override ["127.0.0.1:{port}:80"]\n'
        if service == 'api': text += f'    environment:\n      APP_ORIGIN: http://127.0.0.1:{port}\n      COOKIE_SECURE: \"false\"\n'
    override.write_text(text)
    command = [docker(),'compose','--project-directory',str(source),'-p',project,'--profile','semantic','-f',str(source/'compose.yaml'),'-f',str(override)]
    validate_resources(json.loads(run([*command,'config','--format','json'])),project,source,port)
    # Save exact isolated project identity before creating resources; no cleanup can target live volumes.
    (target/'drill-project.json').write_text(json.dumps({'project':project,'port':port,'command':command},indent=2))
    run([*command,'up','-d','--no-build','db'])
    for _ in range(60):
        try:
            run([*command,'exec','-T','db','pg_isready','-h','127.0.0.1','-U','dentdocs','-d','dentdocs_mock']); break
        except RuntimeError: time.sleep(1)
    else: raise RuntimeError('Isolated database did not become ready')
    with (target/'database.dump').open('rb') as dump:
        run([*command,'exec','-T','db','pg_restore','--single-transaction','--exit-on-error','--no-owner','--no-acl','-U','dentdocs','-d','dentdocs_mock'],stdin=dump)
    run([*command,'create','--no-build','migrate'])
    container = run([*command,'ps','-a','-q','migrate']).decode().strip()
    run([docker(),'cp',str(target/'originals/files')+'/.',container+':/data/files'])
    run([*command,'up','-d','--no-build'])
    # Never resurrect sessions that were valid at the backup's point in time.
    revoke = "import os; from sqlalchemy import create_engine,text; e=create_engine(os.environ['DATABASE_URL']); c=e.begin(); db=c.__enter__(); db.execute(text('UPDATE sessions SET revoked=true')); c.__exit__(None,None,None)"
    run([*command,'exec','-T','api','python','-c',revoke])
    print(f'Isolated restore started on http://127.0.0.1:{port}; project {project}. Run verification before declaring recovery successful.')
    print('Decrypted drill files contain secrets. Restrict access and remove the drill after verification; keep the encrypted backup and separate key.')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    commands=parser.add_subparsers(dest='command',required=True)
    clean=commands.add_parser('cleanup'); clean.add_argument('--target',required=True)
    key=commands.add_parser('keygen'); key.add_argument('--key',required=True)
    for name in ['backup','stage','drill']:
        command=commands.add_parser(name); command.add_argument('--key',required=True); command.add_argument('--bundle',required=True)
        if name!='backup': command.add_argument('--target',required=True)
        if name=='drill': command.add_argument('--port',type=int,default=18080)
    args=parser.parse_args()
    if args.command=='cleanup': cleanup(args.target)
    elif args.command=='keygen':
        path=Path(args.key); path.parent.mkdir(parents=True,exist_ok=True)
        with path.open('xb') as output: output.write(base64.b64encode(os.urandom(32))+b'\n')
        restrict_access(path)
        print('Recovery key created; never store or send it with the backup bundle.')
    elif args.command=='backup': backup(args.bundle,args.key)
    elif args.command=='stage': stage(args.bundle,args.key,args.target); print('All backup components authenticated and staged; no services changed.')
    else: drill(args.bundle,args.key,args.target,args.port)


if __name__=='__main__':
    try: main()
    except Exception as exc:
        detail = str(exc) if isinstance(exc,(RuntimeError,ValueError)) else type(exc).__name__
        raise SystemExit(f'Recovery failed: {detail}. Inspect local state before retrying; live volumes are never restore targets.') from None
