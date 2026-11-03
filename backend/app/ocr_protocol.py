"""Small data-only contract shared by the API and isolated OCR worker."""
import csv
import io
import math

MAX_PAGES = 10
MAX_FILE = 20 * 1024**2
MAX_TEXT = 150000

class OcrError(Exception):
    pass

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


def validate_result(value, mime):
    if not isinstance(value, dict) or set(value)!={'text','confidence','pages','pageResults'}:
        raise ValueError('Unexpected OCR response')
    def score(number):
        return type(number) in (int,float) and 0<=number<=100 and math.isfinite(number)
    if not isinstance(value['text'],str) or len(value['text'])>MAX_TEXT or not score(value['confidence']):
        raise ValueError('Invalid OCR text or score')
    value['text'].encode('utf-8')
    pages=value['pages']
    if type(pages) is not int or not 1<=pages<=MAX_PAGES or (mime!='application/pdf' and pages!=1):
        raise ValueError('Invalid OCR page count')
    results=value['pageResults']
    if not isinstance(results,list) or len(results)!=pages: raise ValueError('Invalid page details')
    for index,item in enumerate(results,1):
        if (not isinstance(item,dict) or set(item)!={'page','confidence','characters'}
            or type(item['page']) is not int or item['page']!=index or not score(item['confidence'])
            or type(item['characters']) is not int or not 0<=item['characters']<=MAX_TEXT):
            raise ValueError('Invalid page details')
    return value
