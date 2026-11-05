"""Offline validation-only ablation; never trains, modifies weights or promotes a reader.

The existing AMR labels are research drafts, not independently confirmed dental truth.
The previously inspected test split is deliberately not evaluated here.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import statistics
import time

from PIL import Image, ImageOps


def normalized(text):
    return ' '.join(text.upper().split())


def distance(a, b):
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        current = [i]
        for j, cb in enumerate(b, 1):
            current.append(min(current[-1]+1, previous[j]+1, previous[j-1]+(ca != cb)))
        previous = current
    return previous[-1]


def prepare(image, profile):
    if profile == 'raw':
        return image.copy(), 0
    image = ImageOps.autocontrast(ImageOps.grayscale(image), cutoff=1)
    if profile == 'contrast':
        return image.convert('RGB'), 0
    if profile != 'deskew-contrast':
        raise ValueError('Unknown image preparation')
    # Bounded projection-profile experiment. No thresholding/rule removal is
    # applied to the inference image, and rotation expands to avoid clipping ink.
    probe = image.copy()
    probe.thumbnail((800, 160))
    def score(angle):
        rotated = probe.rotate(angle, Image.Resampling.BICUBIC, expand=True, fillcolor=255)
        pixels = list(rotated.getdata())
        rows = [sum(255-v for v in pixels[y*rotated.width:(y+1)*rotated.width]) for y in range(rotated.height)]
        return sum((rows[i]-rows[i-1])**2 for i in range(1, len(rows)))
    angles = [0, -1, 1, -2, 2, -3, 3]
    scores = {angle: score(angle) for angle in angles}
    angle = max(angles, key=lambda a: scores[a])
    # Require a material projection improvement; do not force arbitrary rotation.
    if scores[angle] < scores[0]*1.05:
        angle = 0
    if angle:
        image = image.rotate(angle, Image.Resampling.BICUBIC, expand=True, fillcolor=255)
    return image.convert('RGB'), angle


def evaluate(args):
    import importlib.metadata as metadata
    import torch
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    if args.output.exists():
        raise ValueError('Use a new output directory; previous evidence is never overwritten')
    root = args.dataset.resolve()
    rows = json.loads((root/'validation.json').read_text(encoding='utf-8'))
    train = json.loads((root/'train.json').read_text(encoding='utf-8'))
    if not rows or {r['writer'] for r in rows} & {r['writer'] for r in train}:
        raise ValueError('Validation must be nonempty and writer-disjoint from training')
    for row in rows:
        path = (root/row['image']).resolve()
        if not path.is_relative_to(root) or hashlib.sha256(path.read_bytes()).hexdigest() != row['sha256']:
            raise ValueError('Invalid crop path/hash')
        if not isinstance(row['text'], str) or not normalized(row['text']):
            raise ValueError('Missing reference text')
    torch.set_num_threads(2)
    device = 'cuda' if args.device == 'cuda' else 'cpu'
    if device == 'cuda' and not torch.cuda.is_available():
        raise ValueError('CUDA requested but unavailable')
    processor = TrOCRProcessor.from_pretrained(args.checkpoint, local_files_only=True, use_fast=False)
    model = VisionEncoderDecoderModel.from_pretrained(args.checkpoint, local_files_only=True, use_safetensors=True).to(device).eval()
    with (args.checkpoint/'model.safetensors').open('rb') as handle:
        model_hash = hashlib.file_digest(handle, 'sha256').hexdigest()
    args.output.mkdir(parents=True)
    results = []
    # Warm up every decoding strategy; measured samples exclude cold model load.
    for beams in args.beams:
        with Image.open(root/rows[0]['image']) as source:
            pixels = processor(images=source.convert('RGB'), return_tensors='pt').pixel_values.to(device)
        with torch.inference_mode():
            model.generate(pixels, max_new_tokens=64, num_beams=beams, max_time=40)
    for profile in args.profiles:
        for beams in args.beams:
            errors = chars = exact = numeric_exact = numeric_samples = truncated = 0
            latencies, predictions = [], []
            for row in rows:
                if device == 'cuda': torch.cuda.synchronize()
                started = time.monotonic()
                with Image.open(root/row['image']) as source:
                    image, angle = prepare(ImageOps.exif_transpose(source).convert('RGB'), profile)
                with torch.inference_mode():
                    pixels = processor(images=image, return_tensors='pt').pixel_values.to(device)
                    ids = model.generate(pixels, max_new_tokens=64, num_beams=beams, max_time=40)
                    text = processor.batch_decode(ids, skip_special_tokens=True)[0]
                if device == 'cuda': torch.cuda.synchronize()
                seconds = time.monotonic()-started
                latencies.append(seconds)
                expected, actual = normalized(row['text']), normalized(text)
                edits = distance(expected, actual)
                errors += edits; chars += len(expected); exact += expected == actual
                numbers = re.findall(r'\d+(?:[./,-]\d+)*', expected)
                if numbers:
                    numeric_samples += 1
                    numeric_exact += numbers == re.findall(r'\d+(?:[./,-]\d+)*', actual)
                # Output may stop because of token/time limits: never hide it as completion.
                complete = int(ids[0, -1]) == model.generation_config.eos_token_id
                truncated += not complete
                predictions.append(dict(image=row['image'], reference=row['text'], prediction=text,
                                        edits=edits, seconds=seconds, rotation=angle, completed=complete))
            result = dict(profile=profile, beams=beams, samples=len(rows), edits=errors,
                          reference_characters=chars, cer=errors/chars, exact_lines=exact,
                          numeric_samples=numeric_samples, numeric_exact_lines=numeric_exact,
                          incomplete_generations=truncated, median_seconds=statistics.median(latencies),
                          p95_seconds=sorted(latencies)[math.ceil(.95*len(latencies))-1])
            results.append(result)
            (args.output/f'{profile}-beams-{beams}.json').write_text(json.dumps(predictions, indent=2), encoding='utf-8')
            print(json.dumps(result), flush=True)
    report = dict(scope='Previously inspected AMR validation only; not dental validation or untouched test',
                  labels='Assistant-checked research labels; not independently clinician-confirmed',
                  device=device, torch=metadata.version('torch'), transformers=metadata.version('transformers'),
                  pillow=metadata.version('Pillow'), model_sha256=model_hash,
                  validation_manifest_sha256=hashlib.sha256((root/'validation.json').read_bytes()).hexdigest(),
                  max_new_tokens=64, max_time=40, results=results, promoted=False,
                  numeric_metric='Exact ordered numeric strings only; not validated clinical field attribution')
    (args.output/'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, default=Path('work/handwriting/amr-lines'))
    parser.add_argument('--checkpoint', type=Path, default=Path('work/handwriting/amr-base-run-001/trained'))
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--device', choices=['cpu', 'cuda'], default='cpu')
    parser.add_argument('--profiles', nargs='+', choices=['raw', 'contrast', 'deskew-contrast'], default=['raw', 'contrast', 'deskew-contrast'])
    parser.add_argument('--beams', nargs='+', type=int, choices=[1, 2, 4], default=[1, 4])
    evaluate(parser.parse_args())
