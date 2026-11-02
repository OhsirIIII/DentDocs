"""Exercise the deployed mock stack; run prepare, restart Compose, then verify.

Creates one fictional test document and archives it after verification. Never run
against a production endpoint; /api/health must explicitly report mock mode.
"""
import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import time

import httpx

parser = argparse.ArgumentParser()
parser.add_argument('step', choices=['prepare', 'verify'])
parser.add_argument('--url', default='http://127.0.0.1:8080')
args = parser.parse_args()
state_path = Path(__file__).resolve().parents[1] / 'work' / 'deployment-check.json'
original = b'%PDF-1.4\nDentDocs fictional deployment verification\n%%EOF'
replacement = b'%PDF-1.4\nDentDocs fictional replacement version\n%%EOF'

with httpx.Client(base_url=args.url, timeout=15) as client:
    for attempt in range(45):
        try:
            health = client.get('/api/health')
            if health.status_code == 200:
                break
        except httpx.HTTPError:
            pass
        time.sleep(1)
    else:
        raise SystemExit('API did not become healthy')
    assert health.json()['mode'] == 'mock', 'Refusing to test non-mock data'

    def call(method, url, **kwargs):
        response = client.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    def upload(payload):
        return call('POST', '/api/files', files={'file': ('fictional-check.pdf', payload, 'application/pdf')})['id']

    if args.step == 'prepare':
        snapshot = call('GET', '/api/bootstrap')
        fixture = dict(snapshot['documents'][0])
        fixture['title'] = 'Fictional deployment verification record'
        doc = call('POST', '/api/documents', json={'document': fixture, 'fileId': upload(original)})
        url = f'/api/documents/{doc["id"]}'
        body = {'expectedRevision': doc['revision'], 'updates': {'tags': ['deployment-verification']}}
        # Two clients with the same revision must produce one success and one conflict.
        with ThreadPoolExecutor(max_workers=2) as workers:
            statuses = sorted(workers.map(lambda _: client.patch(url, json=body).status_code, range(2)))
        assert statuses == [200, 409], statuses
        doc = call('GET', url)
        version2 = call('POST', url + '/versions', json={'expectedRevision': doc['revision'], 'note': 'Verify replacement original', 'fileId': upload(replacement), 'updates': {'title': 'Fictional revised deployment record'}})
        assert client.get(url + '/file').content == replacement
        restored = call('POST', url + '/versions/1/restore', json={'expectedRevision': version2['revision'], 'note': 'Verify restoration of original'})
        assert restored['version'] == 3
        assert restored['fileId'] == doc['fileId']
        assert client.get(url + '/file').content == original
        archived = call('POST', url + '/archive', headers={'X-Demo-Role': 'admin'}, json={'expectedRevision': restored['revision']})
        results = call('POST', '/api/documents/search', json={'query': ''})
        assert doc['id'] not in {d['id'] for d in results}
        active = call('POST', url + '/restore-archive', headers={'X-Demo-Role': 'admin'}, json={'expectedRevision': archived['revision']})
        before_restart = call('GET', '/api/bootstrap')
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(json.dumps({'id': doc['id'], 'revision': active['revision'], 'fileId': active['fileId'], 'count': len(before_restart['documents']), 'audits': len(before_restart['auditLogs'])}), encoding='utf-8')
        print('PASS: deployed health, original upload, concurrent conflict, replacement original, restore as v3, archive/search exclusion and recovery. Restart Compose, then run verify.')
    else:
        state = json.loads(state_path.read_text(encoding='utf-8'))
        url = f'/api/documents/{state["id"]}'
        doc = call('GET', url)
        assert doc['revision'] == state['revision']
        assert doc['version'] == 3 and doc['fileId'] == state['fileId']
        assert client.get(url + '/file').content == original
        assert client.get(url + '/file?version=2').content == replacement
        snapshot = call('GET', '/api/bootstrap')
        assert len(snapshot['documents']) == state['count'], 'Restart duplicated seeded records'
        assert len(snapshot['auditLogs']) == state['audits'], 'Restart changed audit records'
        call('POST', url + '/archive', headers={'X-Demo-Role': 'admin'}, json={'expectedRevision': doc['revision']})
        print('PASS: restart retained PostgreSQL records, version history, both original files, revision and audit events without duplicate seeding. Verification record archived.')
