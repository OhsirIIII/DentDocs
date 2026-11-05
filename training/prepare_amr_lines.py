"""Reproduce reviewed AMR line crops without automatic/pseudo transcription labels."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image


def prepare(source, output, annotations):
    manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
    records = {row['id']: row for row in manifest['records']}
    hashes = {row['path']: row['sha256'] for row in manifest['files']}
    rows = json.loads(annotations.read_text(encoding='utf-8'))
    output.mkdir(parents=True, exist_ok=True)
    seen = set()
    writers = {'train': set(), 'validation': set(), 'test': set()}
    for row in rows:
        record = records[row['record']]
        assert record['split'] == row['split'] and record['writer'] == row['writer']
        assert row['source'] in record['images']
        payload = (source / row['source']).read_bytes()
        assert hashlib.sha256(payload).hexdigest() == hashes[row['source']]
        assert Path(row['image']).name == row['image']
        with Image.open(source / row['source']) as image:
            x0, y0, x1, y1 = row['bbox']
            assert 0 <= x0 < x1 <= image.width and 0 <= y0 < y1 <= image.height
            crop = image.convert('RGB').crop(row['bbox'])
            digest = hashlib.sha256(crop.tobytes()).hexdigest()
            assert digest not in seen
            seen.add(digest)
            crop.save(output / row['image'])
            row['sha256'] = hashlib.sha256((output / row['image']).read_bytes()).hexdigest()
        writers[row['split']].add(row['writer'])
    assert not writers['train'] & writers['validation'] and not writers['train'] & writers['test'] and not writers['validation'] & writers['test']
    for split in writers:
        selected = [row for row in rows if row['split'] == split]
        assert selected
        (output / f'{split}.json').write_text(json.dumps(selected, indent=2), encoding='utf-8')
    report = {'repo': manifest['repo'], 'revision': manifest['revision'], 'license': manifest['license'],
              'attribution': manifest['attribution'], 'counts': {split: sum(r['split'] == split for r in rows) for split in writers},
              'writers_per_split': {split: len(writers[split]) for split in writers},
              'limitation': 'Small manually selected feasibility sample. Assistant-checked crop labels, not independently clinician-verified. Not dental validation.'}
    (output / 'dataset-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report['counts']))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=Path('work/handwriting/amr'))
    parser.add_argument('--output', type=Path, default=Path('work/handwriting/amr-lines'))
    parser.add_argument('--annotations', type=Path, default=Path('training/amr-line-annotations.json'))
    args = parser.parse_args()
    prepare(args.source, args.output, args.annotations)
