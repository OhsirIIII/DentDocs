"""Paired, offline reader comparison; no training, new labels or deployment changes.

Existing AMR validation references are assistant-checked research labels. Transformed
copies of one line are repeated measurements, not new independent test examples.
"""
import argparse
import hashlib
import importlib.metadata as metadata
import json
import math
from pathlib import Path
import re
import statistics
import time


CONFIGS = [('baseline', 'raw', 1), ('contrast-greedy', 'contrast', 1), ('contrast-beam', 'contrast', 4)]


def normalize(text):
    return ' '.join(text.upper().split())


def edits(a, b):
    previous = list(range(len(b)+1))
    for i, left in enumerate(a, 1):
        current = [i]
        for j, right in enumerate(b, 1):
            current.append(min(current[-1]+1, previous[j]+1, previous[j-1]+(left != right)))
        previous = current
    return previous[-1]


def measure(reference, prediction):
    expected, actual = normalize(reference), normalize(prediction)
    if not expected:
        raise ValueError('Empty reference')
    numbers = lambda s: re.findall(r'\d+(?:[./,-]\d+)*', s)
    return dict(character_edits=edits(expected, actual), characters=len(expected),
                word_edits=edits(expected.split(), actual.split()), words=len(expected.split()),
                exact=expected == actual, numeric_reference=bool(numbers(expected)),
                numeric_exact=numbers(expected) == numbers(actual),
                invented_numbers=not numbers(expected) and bool(numbers(actual)))


def summarize(rows):
    n = len(rows)
    times = sorted(r['seconds'] for r in rows)
    return dict(measurements=n, underlying_lines=len({r['image'] for r in rows}),
                cer=sum(r['character_edits'] for r in rows)/sum(r['characters'] for r in rows),
                wer=sum(r['word_edits'] for r in rows)/sum(r['words'] for r in rows),
                exact_lines=sum(r['exact'] for r in rows),
                numeric_lines=sum(r['numeric_reference'] for r in rows),
                numeric_correct=sum(r['numeric_reference'] and r['numeric_exact'] for r in rows),
                invented_number_lines=sum(r['invented_numbers'] for r in rows),
                incomplete=sum(not r['complete'] for r in rows),
                median_seconds=statistics.median(times),p95_seconds=times[math.ceil(.95*n)-1])


def compare(rows, condition, candidate):
    keys = lambda r: (r['image'],r['repeat'])
    base={keys(r):r for r in rows if r['condition']==condition and r['config']=='baseline'}
    selected={keys(r):r for r in rows if r['condition']==condition and r['config']==candidate}
    if set(base)!=set(selected):raise ValueError('Comparison requires identical cases')
    pairs=[(base[k],selected[k]) for k in base]
    return dict(improved=sum(b['character_edits']>c['character_edits'] for b,c in pairs),
                unchanged=sum(b['character_edits']==c['character_edits'] for b,c in pairs),
                worsened=sum(b['character_edits']<c['character_edits'] for b,c in pairs),
                lost_exact=sum(b['exact'] and not c['exact'] for b,c in pairs),
                gained_exact=sum(not b['exact'] and c['exact'] for b,c in pairs),
                numeric_regressions=sum(b['numeric_exact'] and not c['numeric_exact'] for b,c in pairs),
                numeric_improvements=sum(not b['numeric_exact'] and c['numeric_exact'] for b,c in pairs))


def main(args):
    import torch
    from PIL import Image, ImageOps, ImageEnhance, ImageFilter
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    if args.output.exists():raise ValueError('Use a new evidence directory')
    root=args.dataset.resolve()
    manifest=root/'validation.json'
    data=json.loads(manifest.read_text(encoding='utf-8'))
    train=json.loads((root/'train.json').read_text(encoding='utf-8'))
    if not data or {r['writer'] for r in data}&{r['writer'] for r in train}:
        raise ValueError('Expected nonempty writer-disjoint research validation')
    for row in data:
        path=(root/row['image']).resolve()
        if not path.is_relative_to(root) or hashlib.sha256(path.read_bytes()).hexdigest()!=row['sha256']:
            raise ValueError('Crop hash/path mismatch')
        measure(row['text'], row['text'])
    if args.device=='cuda' and not torch.cuda.is_available():raise ValueError('CUDA unavailable')
    torch.set_num_threads(2)
    torch.manual_seed(42)
    processor=TrOCRProcessor.from_pretrained(args.checkpoint,local_files_only=True,use_fast=False)
    model=VisionEncoderDecoderModel.from_pretrained(args.checkpoint,local_files_only=True,use_safetensors=True).to(args.device).eval()
    with (args.checkpoint/'model.safetensors').open('rb') as handle: model_hash=hashlib.file_digest(handle,'sha256').hexdigest()
    args.output.mkdir(parents=True)
    def image_for(row, condition, preparation):
        with Image.open(root/row['image']) as source:image=ImageOps.exif_transpose(source).convert('RGB')
        if condition=='dim-low-contrast':
            image=ImageEnhance.Brightness(ImageEnhance.Contrast(image).enhance(.6)).enhance(.65)
        elif condition=='soft-blur':image=image.filter(ImageFilter.GaussianBlur(.7))
        elif condition!='original':raise ValueError('Unknown condition')
        if preparation=='contrast': image=ImageOps.autocontrast(ImageOps.grayscale(image),cutoff=1).convert('RGB')
        return image
    def generate(image, beams):
        with torch.inference_mode():
            pixels=processor(images=image,return_tensors='pt').pixel_values.to(args.device)
            ids=model.generate(pixels,max_new_tokens=64,num_beams=beams,max_time=40)
            text=processor.batch_decode(ids,skip_special_tokens=True)[0]
        return text,int(ids[0,-1])==model.generation_config.eos_token_id
    for _,prep,beams in CONFIGS: generate(image_for(data[0],'original',prep),beams)
    rows=[]
    for condition in args.conditions:
        for repeat in range(args.repeats):
            for i,row in enumerate(data):
                # Rotate configuration order to reduce systematic warmup/thermal bias.
                offset=(i+repeat)%len(CONFIGS)
                for name,prep,beams in CONFIGS[offset:]+CONFIGS[:offset]:
                    if args.device=='cuda':torch.cuda.synchronize()
                    start=time.monotonic()
                    text,complete=generate(image_for(row,condition,prep),beams)
                    if args.device=='cuda':torch.cuda.synchronize()
                    rows.append(dict(image=row['image'],condition=condition,repeat=repeat,config=name,
                                     prediction=text,reference=row['text'],seconds=time.monotonic()-start,
                                     complete=complete,**measure(row['text'],text)))
            print(json.dumps(dict(condition=condition,repeat=repeat+1,completed=len(rows))),flush=True)
        (args.output/'predictions.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
    results={condition:{name:summarize([r for r in rows if r['condition']==condition and r['config']==name]) for name,_,_ in CONFIGS} for condition in args.conditions}
    pairs={condition:{name:compare(rows,condition,name) for name,_,_ in CONFIGS if name!='baseline'} for condition in args.conditions}
    report=dict(scope='Previously inspected AMR validation, not independent dental accuracy',
                labels='Assistant-checked research references, not staff-confirmed',
                device=args.device,versions={p:metadata.version(p) for p in ['torch','transformers','Pillow']},
                model_sha256=model_hash,validation_manifest_sha256=hashlib.sha256(manifest.read_bytes()).hexdigest(),
                base_lines=len(data),writers=len({r['writer'] for r in data}),repeats=args.repeats,
                conditions=args.conditions,results=results,paired=pairs,promoted=False,
                limits=dict(max_new_tokens=64,max_time=40,threads=2),
                numeric_scope='Exact ordered digit strings including false insertions, not clinical field correctness')
    (args.output/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(dict(results=results,paired=pairs)),flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--dataset',type=Path,default=Path('work/handwriting/amr-lines'))
    p.add_argument('--checkpoint',type=Path,default=Path('work/handwriting/amr-base-run-001/trained'))
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--device',choices=['cpu','cuda'],default='cpu')
    p.add_argument('--conditions',nargs='+',choices=['original','dim-low-contrast','soft-blur'],default=['original','dim-low-contrast','soft-blur'])
    p.add_argument('--repeats',type=int,choices=[1,2,3],default=1)
    main(p.parse_args())
