"""Authenticated API-to-private-reader transport, never external model inference."""
import json
import os
import httpx
from fastapi import HTTPException


def read_region(payload, rotation, box):
    url, token = os.getenv('HANDWRITING_URL', ''), os.getenv('HANDWRITING_TOKEN', '')
    if not url or not token:
        raise HTTPException(503, 'Handwriting reader is unavailable. Use printed OCR or manual entry.')
    try:
        with httpx.Client(timeout=65, trust_env=False) as client:
            response = client.post(url + '/transcribe', content=payload,
                                   headers={'Authorization': 'Bearer ' + token, 'X-Region': json.dumps({'rotation': rotation, 'box': box}), 'Content-Type': 'application/octet-stream'})
        if response.status_code == 422:
            raise HTTPException(422, 'Cannot read this region. Select a clearer, complete JPG/PNG line.')
        if response.status_code != 200:
            raise HTTPException(503, 'Handwriting reader is busy or unavailable. Retry or enter text manually.')
        result = response.json()
        if not isinstance(result.get('text'), str) or len(result['text']) > 4000:
            raise ValueError('Invalid reader result')
        return result
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, 'Handwriting reader did not finish. Retry a smaller line or use manual entry.')
