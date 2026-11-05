"""Disposable, resource-limited parser process. All temporary plaintext is removed by parent."""
import json
import os
from pathlib import Path
import subprocess
import sys

from .ocr_protocol import MAX_PAGES, parse_tsv


def command(args):
    return subprocess.run(args, check=True, capture_output=True, timeout=60).stdout.decode('utf-8', errors='replace')


def main():
    if os.name == 'posix':
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (768 * 1024**2, 768 * 1024**2))
        resource.setrlimit(resource.RLIMIT_CPU, (70, 70))
        resource.setrlimit(resource.RLIMIT_FSIZE, (64 * 1024**2, 64 * 1024**2))
    source, mime = Path(sys.argv[1]), sys.argv[2]
    if mime == 'application/pdf':
        info = command(['pdfinfo', str(source)])
        details=dict(line.split(':',1) for line in info.splitlines() if ':' in line)
        pages=int(details['Pages'].strip())
        if not 1 <= pages <= MAX_PAGES or details.get('Encrypted','').strip().startswith('yes'):
            raise ValueError('Unsupported PDF')
        command(['pdftoppm', '-png', '-r', '200', '-scale-to', '2400', str(source), str(source.parent / 'page')])
        images = sorted(source.parent.glob('page-*.png'))
    else:
        images = [source]
    texts, scores, page_results = [], [], []
    for image in images:
        text, score = parse_tsv(command(['tesseract', str(image), 'stdout', '-l', 'eng', '--psm', '3', 'tsv']))
        texts.append(text)
        page_results.append({'page': len(texts), 'confidence': score, 'characters': len(text)})
        scores.extend([score] * max(1, len(text)))
    text = '\n\n'.join(texts)
    if len(text) > 150000:
        raise ValueError('Too much text')
    print(json.dumps({'text': text, 'confidence': round(sum(scores) / len(scores)), 'pages': len(images), 'pageResults': page_results}))


if __name__ == '__main__':
    main()
