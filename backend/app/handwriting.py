"""Authenticated API-to-private-reader transport, never external model inference."""
import json
import os
import hashlib
import math
import re
import threading
import httpx
from fastapi import HTTPException

SLOTS = threading.BoundedSemaphore(2)
MAX_INPUT = 20 * 1024**2
MAX_RESPONSE = 65536


def validate_result(result, payload, rotation, box):
    """Treat even the private image reader as an untrusted suggestion source."""
    expected = {'text', 'engine', 'modelSha256', 'confidence', 'sourceSha256',
                'rotation', 'box', 'pixelBox', 'status', 'requiresStaffVerification'}
    if not isinstance(result, dict) or set(result) != expected:
        raise ValueError('Invalid reader contract')
    if not isinstance(result['text'], str) or len(result['text']) > 4000:
        raise ValueError('Invalid transcription')
    result['text'].encode('utf-8', errors='strict')
    if result['engine'] != 'trocr-base-amr-experimental' or not isinstance(result['modelSha256'], str) or not re.fullmatch('[0-9a-f]{64}', result['modelSha256']):
        raise ValueError('Invalid model evidence')
    if result['sourceSha256'] != hashlib.sha256(payload).hexdigest():
        raise ValueError('Wrong original')
    if type(result['rotation']) is not int or result['rotation'] != rotation:
        raise ValueError('Wrong rotation')
    region = result['box']
    if not isinstance(region, list) or len(region) != 4 or any(type(v) not in (int, float) or not math.isfinite(v) for v in region) or region != box:
        raise ValueError('Wrong region')
    pixels = result['pixelBox']
    if not isinstance(pixels, list) or len(pixels) != 4 or any(type(v) is not int or not 0 <= v <= 30_000_000 for v in pixels) or not pixels[0] < pixels[2] or not pixels[1] < pixels[3]:
        raise ValueError('Invalid pixel region')
    if result['confidence'] is not None or result['status'] != 'draft' or result['requiresStaffVerification'] is not True:
        raise ValueError('Reader cannot approve its own draft')
    return result


def read_region(payload, rotation, box):
    url, token = os.getenv('HANDWRITING_URL', ''), os.getenv('HANDWRITING_TOKEN', '')
    if not url or len(token) < 32:
        raise HTTPException(503, 'Handwriting reader is unavailable. Use printed OCR or manual entry.')
    if not 0 < len(payload) <= MAX_INPUT:
        raise HTTPException(422, 'Use an image of at most 20 MB.')
    if not SLOTS.acquire(blocking=False):
        raise HTTPException(503, 'Handwriting reader is busy. Retry shortly.')
    try:
        with httpx.Client(timeout=httpx.Timeout(65, connect=3, write=15, pool=3), trust_env=False, follow_redirects=False) as client:
            with client.stream('POST', url + '/transcribe', content=payload,
                               headers={'Authorization': 'Bearer ' + token, 'X-Region': json.dumps({'rotation': rotation, 'box': box}),
                                        'Content-Type': 'application/octet-stream', 'Accept-Encoding': 'identity'}) as response:
                if response.status_code == 422:
                    raise HTTPException(422, 'Cannot read this region. Select a clearer, complete JPG/PNG line.')
                if response.status_code != 200:
                    raise HTTPException(503, 'Handwriting reader is busy or unavailable. Retry or enter text manually.')
                if response.headers.get('Content-Encoding', 'identity') != 'identity':
                    raise ValueError('Unexpected compressed response')
                output = bytearray()
                for chunk in response.iter_bytes(chunk_size=8192):
                    if len(output) + len(chunk) > MAX_RESPONSE:
                        raise ValueError('Oversized reader response')
                    output.extend(chunk)
                return validate_result(json.loads(output), payload, rotation, box)
    except (httpx.HTTPError, ValueError, TypeError, KeyError, OverflowError, RecursionError):
        raise HTTPException(503, 'Handwriting reader did not finish. Retry a smaller line or use manual entry.')
    finally:
        SLOTS.release()
