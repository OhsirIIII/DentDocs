"""Read-only verification of deployed container/security boundaries; prints no secrets."""
import argparse
import json
from pathlib import Path
import urllib.request
from recovery import compose, run, docker

PROCESS = r'''
import importlib.util,importlib.metadata as metadata,json,os,tempfile
from packaging.requirements import Requirement
from pathlib import Path
assert os.geteuid()!=0
status=Path('/proc/self/status').read_text()
assert any(line.split()==['NoNewPrivs:','1'] for line in status.splitlines())
assert any(line.startswith('CapEff:') and int(line.split()[1],16)==0 for line in status.splitlines())
assert importlib.util.find_spec('pip') is None
if importlib.util.find_spec('torch') is not None:
    assert metadata.version('setuptools')=='84.1.0'  # declared runtime dependency of PyTorch
else:
    assert importlib.util.find_spec('setuptools') is None
for distribution in metadata.distributions():
    for raw in distribution.requires or []:
        requirement=Requirement(raw)
        if requirement.marker and not requirement.marker.evaluate({'extra':''}): continue
        assert requirement.specifier.contains(metadata.version(requirement.name),prereleases=True),requirement.name
mount=next(line.split() for line in Path('/proc/mounts').read_text().splitlines() if line.split()[1]=='/tmp')
assert mount[2]=='tmpfs' and {'noexec','nosuid'}<=set(mount[3].split(','))
with tempfile.TemporaryDirectory() as temp: Path(temp,'test').write_text('ephemeral')
print(json.dumps({'nonroot':True,'noNewPrivileges':True,'effectiveCapabilitiesZero':True,'pipAbsent':True,'temporaryMemoryFilesystemVerified':True,'dependencyConsistencyVerified':True}))
'''


OCR_PROCESS = r'''
import importlib.util,json,os,tempfile
from pathlib import Path
assert os.geteuid()!=0
status=Path('/proc/self/status').read_text()
assert any(line.split()==['NoNewPrivs:','1'] for line in status.splitlines())
assert any(line.startswith('CapEff:') and int(line.split()[1],16)==0 for line in status.splitlines())
assert all(importlib.util.find_spec(name) is None for name in ['pip','setuptools','sqlalchemy','psycopg','cryptography','torch'])
assert all(not Path(path).exists() for path in ['/data/files','/model','/embedding-model','/app/seed'])
mount=next(line.split() for line in Path('/proc/mounts').read_text().splitlines() if line.split()[1]=='/tmp')
assert mount[2]=='tmpfs' and {'noexec','nosuid'}<=set(mount[3].split(','))
with tempfile.TemporaryDirectory() as temp:Path(temp,'test').write_text('ephemeral')
print(json.dumps({'nonroot':True,'noNewPrivileges':True,'effectiveCapabilitiesZero':True,'noDataStoreLibrariesOrMounts':True,'temporaryMemoryFilesystemVerified':True}))
'''


def verify(command,port):
    report={'services':{},'port':port}
    networks={}
    states={}
    for name in ['api','handwriting','db','web','ocr']:
        identity=run([*command,'ps','-q',name]).decode().strip()
        if not identity:raise RuntimeError('Required service is not running: '+name)
        state=json.loads(run([docker(),'inspect',identity]))[0]
        assert state['State']['Running'],name
        states[name]=state
        networks[name]={value['NetworkID'] for value in state['NetworkSettings']['Networks'].values()}
        network_details=[json.loads(run([docker(),'network','inspect',value['NetworkID']]))[0] for value in state['NetworkSettings']['Networks'].values()]
        if name!='web':
            assert network_details and all(network['Internal'] for network in network_details),name
            assert not any(state['NetworkSettings']['Ports'].values()),name
        else:
            published=[binding for values in state['NetworkSettings']['Ports'].values() for binding in (values or [])]
            assert len(published)==1 and published[0]['HostIp']=='127.0.0.1' and published[0]['HostPort']==str(port)
        item={'internalNetworkOnly':name!='web','noPublishedPort':name!='web'}
        if name in {'api','handwriting','ocr'}:
            host=state['HostConfig']
            assert host['ReadonlyRootfs'] and not host['Privileged'],name
            assert host['PidMode']!='host' and host['IpcMode']!='host',name
            assert 'ALL' in host['CapDrop'],name
            assert host['Memory']>0 and host['NanoCpus']>0 and 0<host['PidsLimit']<=128,name
            item.update(json.loads(run([*command,'exec','-T',name,'python','-'],input=(OCR_PROCESS if name=='ocr' else PROCESS).encode())))
            item['readOnlyRoot']=True
        report['services'][name]=item
    assert len(networks['ocr'])==1 and networks['ocr']<=networks['api']
    assert all(not networks['ocr'].intersection(networks[name]) for name in ['db','handwriting','web'])
    assert not any(mount['Type'] in {'bind','volume'} for mount in states['ocr']['Mounts'])
    forbidden={'DATABASE_URL','FILE_ENCRYPTION_KEY','APP_DB_PASSWORD','POSTGRES_PASSWORD','HANDWRITING_TOKEN','BOOTSTRAP_ADMIN_PASSWORD'}
    assert not forbidden.intersection(entry.split('=',1)[0] for entry in states['ocr']['Config']['Env'])
    api_probe="import shutil,importlib.util;assert all(shutil.which(tool) is None for tool in ['pdfinfo','pdftoppm','tesseract']);assert importlib.util.find_spec('app.ocr_worker') is None;assert importlib.util.find_spec('app.ocr_native') is None"
    run([*command,'exec','-T','api','python','-c',api_probe])
    db_address=next(iter(states['db']['NetworkSettings']['Networks'].values()))['IPAddress']
    probe="import socket;\ntry:\n s=socket.create_connection(("+repr(db_address)+",5432),timeout=1)\nexcept OSError:pass\nelse:s.close();raise RuntimeError('Parser can reach database')"
    run([*command,'exec','-T','ocr','python','-c',probe])
    report['parserHasNoDataStoreAccess']=True
    report['apiHasNoNativeParsers']=True
    base=f'http://127.0.0.1:{port}'
    with urllib.request.urlopen(base+'/api/health',timeout=10) as response:
        assert json.load(response)['mode']=='mock'
    with urllib.request.urlopen(base+'/',timeout=10) as response:
        assert "frame-ancestors 'none'" in response.headers['Content-Security-Policy']
        assert response.headers['Referrer-Policy']=='no-referrer'
        assert response.headers['X-Content-Type-Options']=='nosniff'
    report['mockModeAndBrowserHeadersVerified']=True
    return report


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--drill-target');parser.add_argument('--output',required=True)
    args=parser.parse_args()
    if args.drill_target:
        state=json.loads((Path(args.drill_target)/'drill-project.json').read_text())
        assert state['project'].startswith('dentdocs-drill-')
        command,port=state['command'],state['port']
    else:command,port=compose(),8080
    report=verify(command,port)
    Path(args.output).write_text(json.dumps(report,indent=2),encoding='utf-8')
    print('PASS: nonroot, read-only API/reader, no privilege escalation/capabilities, bounded temporary files/resources, pip removed, isolated parser without data-store access and loopback browser headers.')


if __name__=='__main__':main()
