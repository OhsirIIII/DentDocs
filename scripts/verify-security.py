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


def verify(command,port):
    report={'services':{},'port':port}
    for name in ['api','handwriting','db','web']:
        identity=run([*command,'ps','-q',name]).decode().strip()
        if not identity:raise RuntimeError('Required service is not running: '+name)
        state=json.loads(run([docker(),'inspect',identity]))[0]
        assert state['State']['Running'],name
        network_details=[json.loads(run([docker(),'network','inspect',value['NetworkID']]))[0] for value in state['NetworkSettings']['Networks'].values()]
        if name!='web':
            assert network_details and all(network['Internal'] for network in network_details),name
            assert not any(state['NetworkSettings']['Ports'].values()),name
        else:
            published=[binding for values in state['NetworkSettings']['Ports'].values() for binding in (values or [])]
            assert len(published)==1 and published[0]['HostIp']=='127.0.0.1' and published[0]['HostPort']==str(port)
        item={'internalNetworkOnly':name!='web','noPublishedPort':name!='web'}
        if name in {'api','handwriting'}:
            host=state['HostConfig']
            assert host['ReadonlyRootfs'] and not host['Privileged'],name
            assert 'ALL' in host['CapDrop'],name
            assert host['Memory']>0 and host['NanoCpus']>0 and 0<host['PidsLimit']<=128,name
            item.update(json.loads(run([*command,'exec','-T',name,'python','-'],input=PROCESS.encode())))
            item['readOnlyRoot']=True
        report['services'][name]=item
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
    print('PASS: nonroot, read-only API/reader, no privilege escalation/capabilities, bounded temporary files/resources, pip removed, private backend network and loopback browser headers.')


if __name__=='__main__':main()
