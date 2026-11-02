"""Local printed-text OCR. No network, inferred clinical findings, or signature claims."""
import csv
import io
import json
import os
import re
import signal
import subprocess
import sys
import tempfile
import threading
from datetime import date
from pathlib import Path

SLOTS = threading.BoundedSemaphore(2)
MAX_PAGES = 10


class OcrError(Exception):
    pass


def run_local(payload, mime):
    if not SLOTS.acquire(blocking=False):
        raise OcrError('Local OCR is busy. Please retry shortly.')
    try:
        with tempfile.TemporaryDirectory(prefix='dentdocs-ocr-') as directory:
            source = Path(directory) / ('original.pdf' if mime == 'application/pdf' else 'original.image')
            source.write_bytes(payload)
            environment = {key: value for key, value in os.environ.items() if key in {'PATH', 'SYSTEMROOT', 'WINDIR', 'LANG', 'PYTHONPATH'}}
            environment['OMP_THREAD_LIMIT'] = '1'
            process = subprocess.Popen([sys.executable, '-m', 'app.ocr_worker', str(source), mime],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                       start_new_session=os.name == 'posix', env=environment)
            try:
                output, _ = process.communicate(timeout=90)
            except subprocess.TimeoutExpired:
                if os.name == 'posix':
                    os.killpg(process.pid, signal.SIGKILL)
                else:
                    process.kill()
                process.communicate()
                raise
            if process.returncode:
                raise OcrError('Cannot process this file. Use a readable, unencrypted PDF (up to 10 pages) or PNG/JPEG.')
            return json.loads(output)
    except FileNotFoundError:
        raise OcrError('Local OCR tools are unavailable. Contact the administrator.')
    except (subprocess.TimeoutExpired, ValueError):
        raise OcrError('Local OCR did not finish. Try a smaller or clearer scan.')
    finally:
        SLOTS.release()


def parse_tsv(value):
    lines, scores = {}, []
    for word in csv.DictReader(io.StringIO(value), delimiter='\t', quoting=csv.QUOTE_NONE):
        text = (word.get('text') or '').strip()
        if word.get('level') != '5' or not text:
            continue
        confidence = max(0, min(100, float(word['conf'])))
        scores.extend([confidence] * len(text))
        key = tuple(word[k] for k in ('page_num', 'block_num', 'par_num', 'line_num'))
        lines.setdefault(key, []).append(text)
    return '\n'.join(' '.join(words) for words in lines.values()), round(sum(scores) / len(scores)) if scores else 0


RULES = {
    'Consent Form': r'\b(informed consent|consent form|pahintulot)\b',
    'Prescription': r'\b(prescription|reseta|rx)\b',
    'Billing/Receipt': r'\b(official receipt|statement of account|invoice)\b',
    'Appointment Record': r'\b(appointment confirmation|appointment slip|appointment record)\b',
    'Treatment Plan': r'\b(treatment plan|treatment estimate)\b',
    'Laboratory Report': r'\b(laboratory report|laboratory request)\b',
    'X-ray': r'\b(radiograph|panoramic|x[ -]?ray)\b',
    'Patient Record': r'\b(patient record|clinical chart|examination record)\b',
}


def extract_fields(raw, patient):
    text, score = raw['text'], raw['confidence']
    matches = [kind for kind, rule in RULES.items() if re.search(rule, text, re.I)]
    kind = matches[0] if len(matches) == 1 else 'Patient Record'
    # Heuristic field scores are conservative evidence scores, not calibrated probabilities.
    fields = dict.fromkeys(('documentType', 'recordNo', 'date', 'toothNumbers', 'procedureCategory', 'tags'), 0)
    fields['documentType'] = min(score, 90) if len(matches) == 1 else 0
    records = set(re.findall(r'\bPT-\d{4}-\d{4}\b', text, re.I))
    records = {record.upper() for record in records}
    names = re.findall(r'^\s*(?:patient(?: name)?|received from)\s*:\s*([^\n\[|]+)', text, re.I | re.M)
    detected_name = re.split(r'\s*\(', names[0])[0].strip() if names else ''
    normalize = lambda value: ' '.join(re.findall(r'[a-z]+', value.lower()))
    mismatch = bool(records - {patient['recordNo'].upper()}) or bool(detected_name and normalize(detected_name) != normalize(patient['fullName']))
    fields['recordNo'] = min(score, 90) if records == {patient['recordNo'].upper()} and not mismatch else 0
    dates = set()
    for value in re.findall(r'\b\d{4}-\d{2}-\d{2}\b', text):
        try:
            dates.add(date.fromisoformat(value).isoformat())
        except ValueError:
            pass
    extracted_date = next(iter(dates)) if len(dates) == 1 else ''
    fields['date'] = min(score, 90) if extracted_date else 0
    teeth = sorted({int(number) for line in text.splitlines() if re.search(r'\b(teeth|tooth|FDI)\b', line, re.I)
                    for number in re.findall(r'\b[1-4][1-8]\b', line)})
    fields['toothNumbers'] = min(score, 85) if teeth else 0
    category = 'Billing & Administrative' if kind in {'Billing/Receipt', 'Appointment Record'} else 'Restorative'
    fields['procedureCategory'] = min(score, 85) if category == 'Billing & Administrative' else 0
    warnings = ['Verify all fields against the original. Signatures and completeness were not assessed.']
    if any(page['characters'] == 0 for page in raw.get('pageResults', [])):
        warnings.append('At least one page has no readable printed text. Check every page of the original.')
    if not text.strip():
        warnings.append('No readable printed text found. Enter metadata manually and request review.')
    if len(matches) != 1:
        warnings.append('Document type is uncertain; select the correct type.')
    if not extracted_date:
        warnings.append('No unambiguous ISO date found. Enter the document date from the original.')
    return dict(title=f"{patient['fullName']} - {kind}", type=kind, patientId=patient['id'],
                patientName=patient['fullName'], patientRecordNo=patient['recordNo'], date=extracted_date,
                displayDate=extracted_date, toothNumbers=teeth, procedureCategory=category, tags=[],
                extractedText=text, confidenceScore=score, fieldConfidence=fields,
                completenessStatus='needs_review', missingFields=['Staff completeness verification'],
                isNameMismatch=mismatch, mismatchedDetectedName=detected_name or ', '.join(sorted(records)),
                isBlurryWarning=False,
                extraction={'engine': 'tesseract-eng', 'rulesVersion': 1, 'pages': raw['pages'],
                            'status': 'extracted' if text.strip() else 'no_text', 'warnings': warnings,
                            'pageResults': raw.get('pageResults', [])})
