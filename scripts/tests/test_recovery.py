import base64
import importlib.util
import io
import json
import os
from pathlib import Path
import tarfile
import pytest
from cryptography.exceptions import InvalidTag

spec=importlib.util.spec_from_file_location('recovery',Path(__file__).parents[1]/'recovery.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)


def encrypted(tmp_path,payload=b'private record',name='files.tar'):
    key=os.urandom(32);path=tmp_path/'payload.enc'
    expected=r.encrypt_stream(path,key,name,io.BytesIO(payload))
    return key,path,expected


def test_streaming_roundtrip_and_no_plaintext_in_bundle(tmp_path):
    payload=os.urandom(r.BLOCK*2+79);key,path,expected=encrypted(tmp_path,payload)
    assert payload[:40] not in path.read_bytes()
    r.decrypt(path,tmp_path/'result',key,'files.tar',expected)
    assert (tmp_path/'result').read_bytes()==payload


@pytest.mark.parametrize('failure',['tamper','wrong-key','truncated','name-swap','manifest-mismatch'])
def test_failures_never_publish_unauthenticated_plaintext(tmp_path,failure):
    key,path,expected=encrypted(tmp_path)
    name='files.tar'
    if failure=='tamper':
        data=bytearray(path.read_bytes());data[-20]^=1;path.write_bytes(data)
    if failure=='wrong-key':key=os.urandom(32)
    if failure=='truncated':path.write_bytes(path.read_bytes()[:-17])
    if failure=='name-swap':name='config.env'
    if failure=='manifest-mismatch':expected={'sha256':'0'*64,'size':14}
    with pytest.raises((InvalidTag,ValueError)):
        r.decrypt(path,tmp_path/'result',key,name,expected)
    assert not (tmp_path/'result').exists()
    assert not (tmp_path/'result.unauthenticated').exists()


@pytest.mark.parametrize('name,kind',[('../escape',tarfile.REGTYPE),('/absolute',tarfile.REGTYPE),('C:/escape',tarfile.REGTYPE),('folder\\escape',tarfile.REGTYPE),('link',tarfile.SYMTYPE),('hardlink',tarfile.LNKTYPE)])
def test_archive_traversal_and_links_rejected_before_extract(tmp_path,name,kind):
    path=tmp_path/'source.tar'
    with tarfile.open(path,'w') as archive:
        member=tarfile.TarInfo(name);member.type=kind;member.linkname='../escape';archive.addfile(member)
    with pytest.raises(ValueError):r.safe_extract(path,tmp_path/'extracted')
    assert not list((tmp_path/'extracted').iterdir())


def test_existing_output_is_never_overwritten(tmp_path):
    key,path,expected=encrypted(tmp_path);output=tmp_path/'existing';output.write_bytes(b'keep')
    with pytest.raises(ValueError):r.decrypt(path,output,key,'files.tar',expected)
    assert output.read_bytes()==b'keep'
    with pytest.raises(ValueError):r.stage(tmp_path,tmp_path/'missing-key',output)


def test_incomplete_bundle_cannot_extract_or_start_services(tmp_path):
    bundle=tmp_path/'bundle';bundle.mkdir();key=os.urandom(32);keyfile=tmp_path/'key';keyfile.write_bytes(base64.b64encode(key))
    r.encrypt_stream(bundle/'manifest.enc',key,'manifest',io.BytesIO(json.dumps({'format':1,'components':{}}).encode()))
    target=tmp_path/'restore'
    with pytest.raises(ValueError):r.stage(bundle,keyfile,target)
    assert not (target/'source').exists()


def test_failed_snapshot_restarts_live_services(tmp_path,monkeypatch):
    keyfile=tmp_path/'key';keyfile.write_bytes(base64.b64encode(os.urandom(32)))
    calls=[]
    def run(args,**kwargs):
        calls.append(args)
        if '--services' in args:return b'db\napi\nweb\nhandwriting\n'
        if '{{.Image}}' in args:return ('sha256:'+'a'*64).encode()
        return b'fictional-container'
    monkeypatch.setattr(r,'docker',lambda:'docker')
    monkeypatch.setattr(r,'run',run)
    def fail(*args):raise RuntimeError('snapshot failed')
    monkeypatch.setattr(r,'encrypt_process',fail)
    with pytest.raises(RuntimeError):r.backup(tmp_path/'backup',keyfile)
    assert any(args[-3:]==['start','api','web'] for args in calls)
    assert not (tmp_path/'backup').exists()

@pytest.mark.parametrize('risk',['external-volume','live-volume','outside-bind','public-port','fixed-container','live-project'])
def test_drill_cannot_attach_live_or_public_resources(tmp_path,risk):
    project='dentdocs-drill-0123456789'
    config={'volumes':{'files':{'name':project+'_files'}},'networks':{'default':{'name':project+'_default'}},'services':{'web':{'ports':[{'host_ip':'127.0.0.1','published':'18080'}]},'api':{}}}
    if risk=='external-volume':config['volumes']['files']['external']=True
    if risk=='live-volume':config['volumes']['files']['name']='dentdocs_files'
    if risk=='outside-bind':config['services']['api']['volumes']=[{'type':'bind','source':str(tmp_path.parent)}]
    if risk=='public-port':config['services']['web']['ports'][0]['host_ip']='0.0.0.0'
    if risk=='fixed-container':config['services']['api']['container_name']='dentdocs-api-1'
    if risk=='live-project':project='dentdocs'
    with pytest.raises(ValueError):r.validate_resources(config,project,tmp_path,18080)


def test_cleanup_refuses_workspace_and_live_paths():
    with pytest.raises(ValueError):r.cleanup(r.ROOT)
    with pytest.raises(ValueError):r.cleanup(r.ROOT/'work/recovery-drills')
