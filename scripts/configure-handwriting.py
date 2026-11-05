"""Add only the optional reader credential; preserve existing installation secrets."""
from pathlib import Path
import secrets

settings = Path('.env')
weights = Path('work/handwriting/amr-base-run-001/trained/model.safetensors')
if not settings.is_file():
    raise SystemExit('Configure the base installation first; no existing settings were changed.')
if not weights.is_file():
    raise SystemExit('Local handwriting weights are missing. See PHASE5_HANDWRITING.md; no settings were changed.')
text = settings.read_text(encoding='utf-8')
lines = text.splitlines()
keys = [i for i, line in enumerate(lines) if line.startswith('HANDWRITING_TOKEN=')]
if len(keys) > 1:
    raise SystemExit('Multiple reader settings found; review .env without replacing existing secrets.')
if keys and len(lines[keys[0]].split('=', 1)[1].strip()) >= 32:
    print('Existing handwriting service credential preserved.')
elif keys and lines[keys[0]].split('=', 1)[1].strip():
    raise SystemExit('Existing reader credential is too short; review it explicitly. It was not replaced.')
else:
    entry = 'HANDWRITING_TOKEN=' + secrets.token_urlsafe(48)
    if keys:
        lines[keys[0]] = entry
        settings.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    else:
        with settings.open('a', encoding='utf-8') as handle:
            handle.write('\n' + entry + '\n')
    print('Optional handwriting credential configured; existing settings preserved.')
