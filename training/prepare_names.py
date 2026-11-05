"""Prepare a bounded, reproducible subset of the supplied handwriting-name archive.

Archive contents are data only. Never extract arbitrary paths or execute bundled files.
"""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import random
import zipfile


def valid_label(value):
    return bool(value and len(value) <= 48 and value.upper() not in {'UNREADABLE', 'SEGMENTATION_ERROR', 'NAN'}
                and any(c.isalpha() for c in value) and all(c.isalpha() or c in " '-." for c in value))


def prepare(archive, output, train=2048, validation=128, test=128, seed=42):
    output.mkdir(parents=True, exist_ok=True)
    seen = set()
    report = {'seed': seed, 'source': str(archive.resolve()), 'scope': 'Handwritten names only; not dental notes or full forms', 'splits': {}}
    with zipfile.ZipFile(archive) as source:
        for split, folder, count in [('train', 'train', train), ('validation', 'validation', validation), ('test', 'test', test)]:
            name = f'written_name_{split}_v2.csv'
            rows = list(csv.DictReader(io.TextIOWrapper(source.open(name), encoding='utf-8-sig')))
            random.Random(seed).shuffle(rows)
            selected, skipped = [], 0
            directory = output / split
            directory.mkdir(exist_ok=True)
            for row in rows:
                label = ' '.join((row.get('IDENTITY') or '').split())
                filename = row.get('FILENAME', '')
                if not valid_label(label) or Path(filename).name != filename or not filename.lower().endswith('.jpg'):
                    skipped += 1
                    continue
                member = f'{folder}_v2/{folder}/{filename}'
                info = source.getinfo(member)
                if info.file_size > 2 * 1024**2:
                    skipped += 1
                    continue
                image = source.read(member)
                digest = hashlib.sha256(image).hexdigest()
                if digest in seen:
                    skipped += 1
                    continue
                seen.add(digest)
                target = directory / filename
                target.write_bytes(image)
                selected.append({'image': f'{split}/{filename}', 'text': label, 'sha256': digest, 'archive_member': member})
                if len(selected) == count:
                    break
            if len(selected) != count:
                raise ValueError(f'Insufficient valid samples in {split}')
            (output / f'{split}.json').write_text(json.dumps(selected, indent=2), encoding='utf-8')
            report['splits'][split] = {'source_rows': len(rows), 'selected': len(selected), 'skipped_before_selection': skipped}
    report['archive_sha256'] = hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()
    report['license_note'] = 'No license/readme was bundled. User-supplied local experiment; verify original dataset terms before distributing data or trained weights.'
    (output / 'dataset-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report['splits']), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('--output', type=Path, default=Path('work/handwriting/dataset'))
    parser.add_argument('--train', type=int, default=2048)
    parser.add_argument('--validation', type=int, default=128)
    parser.add_argument('--test', type=int, default=128)
    args = parser.parse_args()
    prepare(args.archive, args.output, args.train, args.validation, args.test)
