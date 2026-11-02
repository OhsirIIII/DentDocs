"""Create local mock deployment secrets without printing them."""
from pathlib import Path
import base64
import secrets

destination = Path(__file__).resolve().parents[1] / '.env'
if destination.exists():
    raise SystemExit('.env already exists; refusing to replace file encryption keys')
destination.write_text('POSTGRES_PASSWORD=' + secrets.token_hex(24) + '\nFILE_ENCRYPTION_KEY=' + base64.urlsafe_b64encode(secrets.token_bytes(32)).decode() + '\n', encoding='utf-8')
print('Created .env. Keep it private and include the encryption key in your recovery plan.')
