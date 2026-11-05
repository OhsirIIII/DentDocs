"""Import explicitly verified local crop labels; never train or infer missing labels."""
import argparse
import csv
import hashlib
import json
from pathlib import Path


def collect(manifest_path, review_path):
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    sources = {row['id']: row for row in manifest['samples']}
    accepted, pending, seen = [], [], set()
    with review_path.open(encoding='utf-8-sig', newline='') as handle:
        for row in csv.DictReader(handle):
            key = row['id']
            if key in seen or key not in sources:
                raise ValueError('Unknown or duplicate sample ID')
            seen.add(key)
            source = sources[key]
            text = row.get('corrected_transcription', '').strip()
            reviewer = row.get('reviewer', '').strip()
            writer = row.get('writer_group', '').strip()
            verified = row.get('verified', '').strip().lower() == 'true'
            eligible = verified and text and reviewer and writer and row.get('crop_quality', '').strip().lower() == 'accepted' and '[unclear]' not in text.lower()
            if not eligible:
                pending.append(key)
                continue
            crop = Path(source['crop'])
            if hashlib.sha256(crop.read_bytes()).hexdigest() != source['crop_sha256']:
                raise ValueError('Reviewed crop has changed; review it again')
            accepted.append({'id': key, 'image': str(crop), 'text': text, 'reviewer': reviewer,
                             'writer_group': writer, 'source_sha256': source['source_sha256'],
                             'crop_sha256': source['crop_sha256'], 'status': 'staff_verified'})
    if seen != set(sources):
        raise ValueError('Review sheet must retain every original sample ID')
    return {'verified_lines': accepted, 'pending_ids': pending,
            'note': 'Verified label candidates only. No training or automatic split performed. Split by confirmed writer group before evaluation.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    root = Path('work/handwriting/dental-examples')
    parser.add_argument('--manifest', type=Path, default=root / 'review-manifest.json')
    parser.add_argument('--review', type=Path, default=root / 'staff-review.csv')
    parser.add_argument('--output', type=Path, default=root / 'verified-lines.json')
    args = parser.parse_args()
    result = collect(args.manifest, args.review)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(f"Verified: {len(result['verified_lines'])}; pending: {len(result['pending_ids'])}. No training performed.")
