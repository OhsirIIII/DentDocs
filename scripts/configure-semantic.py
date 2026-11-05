"""Download and verify the pinned public embedding artifact; never upload records."""
import hashlib
import json
from pathlib import Path
import urllib.request

MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
REVISION = '1110a243fdf4706b3f48f1d95db1a4f5529b4d41'
FILES = {
    'config.json': '953f9c0d463486b10a6871cc2fd59f223b2c70184f49815e7efbcab5d8908b41',
    'model.safetensors': '53aa51172d142c89d9012cce15ae4d6cc0ca6895895114379cacb4fab128d9db',
    'special_tokens_map.json': '303df45a03609e4ead04bc3dc1536d0ab19b5358db685b6f3da123d05ec200e3',
    'tokenizer.json': 'be50c3628f2bf5bb5e3a7f17b1f74611b2561a3a27eeab05e5aa30f411572037',
    'tokenizer_config.json': 'acb92769e8195aabd29b7b2137a9e6d6e25c476a4f15aa4355c233426c61576b',
    'vocab.txt': '07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3',
}
root = Path('work/semantic/model')
root.mkdir(parents=True, exist_ok=True)
for name, expected in FILES.items():
    target = root / name
    if target.exists():
        if hashlib.sha256(target.read_bytes()).hexdigest() != expected:
            raise SystemExit(f'Existing {name} differs from the pinned artifact; it was not replaced.')
        continue
    with urllib.request.urlopen(f'https://huggingface.co/{MODEL}/resolve/{REVISION}/{name}', timeout=120) as response:
        payload = response.read(100 * 1024**2)
    if hashlib.sha256(payload).hexdigest() != expected:
        raise SystemExit(f'Download integrity check failed for {name}')
    target.write_bytes(payload)
(root / 'source.json').write_text(json.dumps({'model': MODEL, 'revision': REVISION, 'dimensions': 384, 'maxTokens': 256, 'sha256': FILES}, indent=2), encoding='utf-8')
print('Pinned semantic model verified locally. Existing clinic settings and records were not changed.')
