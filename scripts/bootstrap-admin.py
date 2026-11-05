"""Generate first-use credentials privately; never replace an existing secret."""
from pathlib import Path
import secrets

root = Path(__file__).resolve().parents[1]
env_file = root / '.env'
if not env_file.exists():
    raise SystemExit('Run scripts/create-env.py first')
text = env_file.read_text(encoding='utf-8')
if 'APP_DB_PASSWORD=' not in text:
    text += '\nAPP_DB_PASSWORD=' + secrets.token_hex(24) + '\n'
if 'BOOTSTRAP_ADMIN_PASSWORD=' not in text:
    password = secrets.token_urlsafe(24)
    text += 'BOOTSTRAP_ADMIN_PASSWORD=' + password + '\n'
    credentials = root / 'work' / 'initial-admin.txt'
    credentials.parent.mkdir(parents=True, exist_ok=True)
    credentials.write_text('DentDocs initial administrator\nEmail: admin@dentdocs.local\nTemporary password: ' + password + '\nChange it immediately on first sign-in.\n', encoding='utf-8')
    print('Initial sign-in details saved privately to work/initial-admin.txt')
env_file.write_text(text, encoding='utf-8')
print('Authentication configuration ready; existing secrets preserved')
