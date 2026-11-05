"""Data extraction rules and private OCR transport; no native parsers in the API."""
import json
import os
import re
import threading
from datetime import date
import httpx
from .ocr_protocol import OcrError, MAX_PAGES, MAX_FILE, parse_tsv, validate_result

SLOTS = threading.BoundedSemaphore(2)

def run_local(payload, mime):
    url,token=os.getenv('OCR_URL',''),os.getenv('OCR_TOKEN','')
    if not url or len(token)<32:
        raise OcrError('Local OCR service is unavailable. Retry or enter text manually.')
    if mime not in {'application/pdf','image/png','image/jpeg'} or not 0<len(payload)<=MAX_FILE:
        raise OcrError('Use a PDF, PNG or JPEG of at most 20 MB.')
    if not SLOTS.acquire(blocking=False):raise OcrError('Local OCR is busy. Please retry shortly.')
    try:
        with httpx.Client(timeout=httpx.Timeout(100,connect=3,write=15,pool=3),trust_env=False,follow_redirects=False) as client:
            with client.stream('POST',url+'/extract',content=payload,headers={'Authorization':'Bearer '+token,'Content-Type':mime,'Accept-Encoding':'identity'}) as response:
                if response.status_code==422:
                    raise OcrError('Cannot process this file. Use a readable, unencrypted PDF (up to 10 pages) or PNG/JPEG.')
                if response.status_code!=200:
                    raise OcrError('Local OCR service is busy or unavailable. Retry or enter text manually.')
                if response.headers.get('Content-Encoding','identity')!='identity':raise ValueError('Unexpected content encoding')
                output=bytearray()
                for chunk in response.iter_bytes(chunk_size=65536):
                    if len(output)+len(chunk)>1024*1024:raise ValueError('Oversized response')
                    output.extend(chunk)
                return validate_result(json.loads(output),mime)
    except OcrError:raise
    except (httpx.HTTPError,ValueError,TypeError,KeyError,OverflowError,RecursionError):
        raise OcrError('Local OCR did not return a usable result. Retry or enter text manually.') from None
    finally:SLOTS.release()


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
