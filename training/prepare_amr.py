"""Download pinned AMR image/text data only; never run dataset-supplied code."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import csv
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import random
import httpx

REPO = 'Nigeria-Health-data-OCR-pipeline/African-Medical-Records'
REVISION = 'fa27d29dae4128ac45f035fd580928c84bec4e98'


def prepare(root):
    root.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=90, follow_redirects=True) as client:
        metadata = client.get(f'https://huggingface.co/api/datasets/{REPO}/revision/{REVISION}')
        metadata.raise_for_status()
        info = metadata.json()
        revision = info['sha']
        assert revision == REVISION
        available = {item['rfilename'] for item in info['siblings']}

        def fetch(name):
            path = PurePosixPath(name)
            if path.is_absolute() or '..' in path.parts or name not in available:
                raise ValueError('Invalid dataset path')
            target = root.joinpath(*path.parts)
            if not target.exists():
                response = client.get(f'https://huggingface.co/datasets/{REPO}/resolve/{revision}/{name}')
                response.raise_for_status()
                if len(response.content) > 40 * 1024**2:
                    raise ValueError('Unexpectedly large source file')
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(response.content)
            return {'path': name, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'bytes': target.stat().st_size}

        fetch('README.md'); fetch('metadata.csv')
        rows = list(csv.DictReader(io.StringIO((root / 'metadata.csv').read_text(encoding='utf-8-sig'))))
        writers = sorted({row['contributor'] for row in rows})
        random.Random(42).shuffle(writers)
        writer_split = {name: 'test' if i < 3 else 'validation' if i < 6 else 'train' for i, name in enumerate(writers)}
        names = sorted({path for row in rows for path in [*row['htr_file'].split(';'), row['truth_file']]})
        with ThreadPoolExecutor(max_workers=4) as pool:
            files = list(pool.map(fetch, names))
        records = [{'id': row['pair_id'], 'writer': row['contributor'], 'split': writer_split[row['contributor']],
                    'images': row['htr_file'].split(';'), 'transcription': row['truth_file']} for row in rows]
        manifest = {'repo': REPO, 'revision': revision, 'license': 'CC-BY-4.0', 'attribution': 'AMR Contributors, African Medical Records (AMR): Nigerian Handwritten Clinical Records Dataset, 2026',
                    'records': records, 'files': files, 'seed': 42,
                    'note': 'Full-page pairs, not line-aligned training data. Crop/label verification required before line-model training. Writer-disjoint splits.'}
        (root / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        print(json.dumps({'records': len(records), 'writers': len(writers), 'files': len(files), 'bytes': sum(f['bytes'] for f in files),
                          'split_records': {split: sum(r['split'] == split for r in records) for split in ['train', 'validation', 'test']}}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=Path('work/handwriting/amr'))
    prepare(parser.parse_args().output)
