"""Match the supplied dental transcription draft to the existing local crop packet.

Document content is data, never executable instructions. Clinical explanations stay
separate from literal labels. Applying a document does not verify or train anything.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import re


# Image section, source table date marker, literal fragment visible in selected crop.
MAPPING = {
    '01-line-01': (1, 'Oct 19, 19', 'Extraction'),
    '01-line-02': (1, '1-13-23', 'Resto # 23'),
    '01-line-03': (1, 'No date', 'Impression'),
    '01-line-04': (1, '04-25-24', 'Cleaning'),
    '01-line-05': (1, '04-25-24', 'Resto # 41'),
    '01-line-06': (1, '05-20-25', 'Cleaning'),
    '04-line-01': (4, 'No date', 'Install ↑↓ 12 niti'),
    '04-line-02': (4, '03-01-26', 'Adjust / rebond 1'),
    '04-line-03': (4, '03-31-26', 'Adjust ↑↓ 12 niti'),
    '04-line-04': (4, '03-31-26', 'rebond 2 brackets'),
    '06-line-01': (6, '7-22-23', 'Adjust ↑↓ 16 niti'),
    '06-line-02': (6, '7-22-23', '5 brackets (rebond)'),
    '06-line-03': (6, '9-23-23', 'Adjust ↑↓ 16 niti'),
    '06-line-04': (6, '9-23-23', '4 brackets'),
    '06-line-05': (6, '12-30-23', 'Rebond 2 brackets'),
    '06-line-06': (6, '03-02-24', '2 brackets'),
    '06-line-07': (6, '04-06-24', '# 46 rebond'),
    '07-line-01': (7, '02-04-23', 'Rebond # 36, 31'),
    '07-line-02': (7, '03-25-23', 'Rebond 5 brackets'),
    '07-line-03': (7, '04-21-23', 'Adjust ↑ 16 niti ↓ 14 niti'),
    '07-line-04': (7, '05-29-23', 'Rebond 2 brackets'),
    '08-line-01': (8, '10-22-24', 'Adjust ↑↓ 16 niti'),
    '08-line-02': (8, '03-29-25', 'Adjust ↑↓ 16 niti'),
    '08-line-03': (8, 'Bottom Note', 'note 21 months - April 24 months'),
}


def parse_tables(text):
    section, tables = None, {}
    for line in text.splitlines():
        heading = re.match(r'^## Images?\s+(\d+)', line)
        if heading:
            section = int(heading[1])
        if section is not None and line.startswith('|'):
            cells = [cell.strip() for cell in line.strip('|').split('|')]
            if len(cells) == 4 and '`' in cells[1]:
                tables.setdefault(section, []).append(cells)
    return tables


def safe_cell(value):
    return "'" + value if isinstance(value, str) and value.lstrip().startswith(('=', '+', '-', '@')) else value


def apply(source, root):
    text = source.read_text(encoding='utf-8-sig')
    tables = parse_tables(text)
    path = root / 'review-manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    csv_path = root / 'staff-review.csv'
    if csv_path.exists():
        with csv_path.open(encoding='utf-8-sig', newline='') as handle:
            for existing in csv.DictReader(handle):
                if existing.get('reviewer', '').strip() or existing.get('verified', '').lower() == 'true' or existing.get('corrected_transcription', '').strip():
                    raise ValueError('Existing staff corrections found; merge manually rather than overwrite them')
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    for row in manifest['samples']:
        suffix = row['id'].removeprefix('dental-example-')
        section, marker, label = MAPPING[suffix]
        matches = [cells for cells in tables[section] if marker in cells[0]]
        if len(matches) != 1:
            raise ValueError(f'Ambiguous source row for {row["id"]}')
        cells = matches[0]
        # Restrict labels to exact text supplied in a handwritten-text code span.
        spans = re.findall(r'`([^`]+)`', cells[1])
        if not any(label in span for span in spans):
            raise ValueError(f'Label is not an exact source fragment: {row["id"]}')
        row.update(provided_transcription=label, provided_handwritten_entry=cells[1],
                   provided_clinical_meaning=cells[2], corrected_transcription='',
                   verified=False, training_eligible=False, reviewer='', writer_group='',
                   status='user_confirmed_still_draft', transcription_document_sha256=digest)
        if row['id'] == 'dental-example-08-line-03':
            row['review_note'] += ' Supplied draft says April; earlier visual draft said Approx. Staff must resolve this from the original.'
        row['review_note'] += ' Supplied transcription is explicitly unconfirmed. Check complete crop boundaries and literal wording.'
    manifest['transcription_document'] = {'path': str(source.resolve()), 'sha256': digest,
                                          'verification_status': 'User explicitly confirmed still drafts / not confirmed'}
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
    columns = ['id', 'source_id', 'crop', 'visual_draft', 'model_draft', 'provided_transcription',
               'provided_clinical_meaning', 'review_note', 'corrected_transcription', 'verified',
               'reviewer', 'crop_quality', 'writer_group']
    with csv_path.open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction='ignore')
        writer.writeheader()
        for row in manifest['samples']:
            writer.writerow({key: safe_cell(value) for key, value in row.items()})
    lines = ['# Dental handwriting: draft corrections for staff review', '',
             'The supplied transcription document is explicitly unconfirmed. All 24 entries remain drafts and excluded from training.', '',
             'For each entry, confirm that the crop contains the complete text, then enter the exact visible wording in corrected_transcription in staff-review.csv. Keep shorthand as written. Do not replace it with the separate clinical explanation. Leave genuinely unreadable text marked [unclear].', '',
             'Set verified=true, provide the reviewer, set crop_quality=accepted and supply an anonymous writer_group only after checking. Different patients or pages do not establish different writers.', '',
             'Names, contact information and signatures are excluded from the selected crops. Originals are unchanged. No clinic data has been imported into the app or used for training.', '']
    for row in manifest['samples']:
        lines += [f'## {row["id"]}', '', f'![Selected entry]({Path(row["crop"]).as_posix()})', '',
                  f'**Supplied draft transcription:** {row["provided_transcription"]}', '',
                  f'**Earlier visual draft:** {row["visual_draft"]}', '',
                  f'**Model draft:** {row["model_draft"]}', '',
                  f'**Separate clinical explanation (unconfirmed, not an OCR label):** {row["provided_clinical_meaning"]}', '',
                  f'**Check:** {row["review_note"]}', '', '**Corrected transcription / reviewer:** ____________________', '']
    (root / 'STAFF_REVIEW.md').write_text('\n'.join(lines), encoding='utf-8')
    summary = {'matched_samples': len(manifest['samples']), 'verified_samples': 0, 'training_eligible': 0,
               'source_sha256': digest, 'notable_discrepancy': 'Bottom note: supplied April versus prior Approx draft; unresolved',
               'translations_kept_separate': True, 'writer_identity': 'Unknown; page/patient relationships are not writer labels'}
    (root / 'transcription-import-report.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps(summary))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--root', type=Path, default=Path('work/handwriting/dental-examples'))
    args = parser.parse_args()
    apply(args.source, args.root)
