"""Compare an untouched restored snapshot with live data, before drill interaction.

Run only while no clinic user or maintenance task is changing the source. Reports
contain hashes/counts, not names, passwords, document text or encryption keys.
"""
import argparse
import json
from pathlib import Path
import sys
import time
import urllib.request
from recovery import compose, run

CHECK = r'''
import hashlib,json,os
from pathlib import Path
from sqlalchemy import create_engine,text
from cryptography.fernet import Fernet
from app.database import Base
engine=create_engine(os.environ['DATABASE_URL'],hide_parameters=True)
result={'tables':{},'originals':{},'historyProtected':True}
with engine.connect() as db:
 for name in sorted(Base.metadata.tables):
  if name in {'sessions','login_throttles'}: continue
  rows=db.execute(text('SELECT row_to_json(t) FROM "'+name+'" t')).scalars()
  hashes=sorted(hashlib.sha256(json.dumps(row,sort_keys=True,separators=(',',':')).encode()).hexdigest() for row in rows)
  result['tables'][name]={'count':len(hashes),'sha256':hashlib.sha256(''.join(hashes).encode()).hexdigest()}
 for row in db.execute(text('SELECT id,sha256 FROM document_files')).mappings():
  payload=Fernet(os.environ['FILE_ENCRYPTION_KEY']).decrypt((Path(os.environ['FILE_ROOT'])/row['id']).read_bytes())
  digest=hashlib.sha256(payload).hexdigest(); assert digest==row['sha256']; result['originals'][row['id']]=digest
 for name in ['audit_logs','review_events','validity_events','file_extractions','handwriting_drafts','summary_drafts','summary_decisions']:
  for privilege in ['UPDATE','DELETE','TRUNCATE']:
   assert not db.execute(text("SELECT has_table_privilege(current_user,:name,:privilege)"),{'name':name,'privilege':privilege}).scalar()
 result['activeSessions']=db.execute(text('SELECT count(*) FROM sessions WHERE revoked=false')).scalar()
 result['databaseRole']=db.execute(text('SELECT current_user')).scalar()
 result['vectorVersion']=db.execute(text("SELECT extversion FROM pg_extension WHERE extname='vector'")).scalar()
print(json.dumps(result,sort_keys=True))
'''


def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--target',required=True);args=parser.parse_args()
 target=Path(args.target).resolve();state=json.loads((target/'drill-project.json').read_text());command=state['command']
 if not state['project'].startswith('dentdocs-drill-') or state['project'] not in command: raise ValueError('Not an isolated drill')
 for _ in range(45):
  try:
   with urllib.request.urlopen(f"http://127.0.0.1:{state['port']}/api/health",timeout=5) as response:
    assert json.load(response)['mode']=='mock'
   break
  except Exception:time.sleep(1)
 else:raise RuntimeError('Restored service did not become healthy')
 live=json.loads(run(compose('exec','-T','api','python','-'),input=CHECK.encode()))
 restored=json.loads(run([*command,'exec','-T','api','python','-'],input=CHECK.encode()))
 assert live['tables']==restored['tables'],'Restored table hashes/counts differ from current live snapshot'
 assert live['originals']==restored['originals'],'Original file integrity differs'
 assert restored['activeSessions']==0,'Restored sessions must be revoked'
 assert restored['databaseRole']=='dentdocs_app' and restored['vectorVersion']=='0.8.7'
 result={'status':'passed','tablesCompared':len(live['tables']),'tableCounts':{k:v['count'] for k,v in live['tables'].items()},'originalsVerified':len(live['originals']),'allRestoredSessionsRevoked':True,'historyPrivilegesProtected':True,'separateProject':state['project'],'port':state['port']}
 (target/'verification.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result,indent=2))


if __name__=='__main__':main()
