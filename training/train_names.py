"""Small GPU fine-tuning experiment, with baseline/validation/test comparisons.

Uses only local prepared image/transcription pairs. Never uploads training images.
Downloads the Microsoft model once. Results are name recognition, not clinical accuracy.
"""
import argparse
import json
import os
from pathlib import Path
import random
import time

os.environ.setdefault('HF_HOME', str(Path('work/handwriting/hf-cache').resolve()))
os.environ.setdefault('HF_HUB_DISABLE_TELEMETRY', '1')
os.environ.setdefault('HF_HUB_DISABLE_SYMLINKS_WARNING', '1')

import torch
from PIL import Image, ImageOps
from torch.utils.data import DataLoader, Dataset
from transformers import TrOCRProcessor, VisionEncoderDecoderModel


def distance(a, b):
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        current = [i]
        for j, cb in enumerate(b, 1):
            current.append(min(current[-1] + 1, previous[j] + 1, previous[j-1] + (ca != cb)))
        previous = current
    return previous[-1]


def normalized(text):
    return ' '.join(text.upper().split())


class Names(Dataset):
    def __init__(self, root, split, processor):
        self.root, self.processor = root, processor
        self.rows = json.loads((root / f'{split}.json').read_text(encoding='utf-8'))

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index):
        row = self.rows[index]
        with Image.open(self.root / row['image']) as original:
            image = ImageOps.exif_transpose(original).convert('RGB')
            pixels = self.processor(images=image, return_tensors='pt').pixel_values[0]
        labels = self.processor.tokenizer(row['text'], padding='max_length', max_length=32, truncation=True, return_tensors='pt').input_ids[0]
        labels[labels == self.processor.tokenizer.pad_token_id] = -100
        return {'pixel_values': pixels, 'labels': labels, 'index': index}


@torch.inference_mode()
def evaluate(model, processor, data, device, batch_size=4):
    model.eval()
    errors, characters, exact, predictions = 0, 0, 0, []
    start = time.monotonic()
    for batch in DataLoader(data, batch_size=batch_size, shuffle=False):
        output = model.generate(batch['pixel_values'].to(device), max_new_tokens=32, num_beams=1)
        decoded = processor.batch_decode(output, skip_special_tokens=True)
        for index, prediction in zip(batch['index'].tolist(), decoded):
            row = data.rows[index]
            expected, actual = normalized(row['text']), normalized(prediction)
            errors += distance(expected, actual)
            characters += len(expected)
            exact += expected == actual
            predictions.append({'image': row['image'], 'expected': row['text'], 'prediction': prediction})
    return {'samples': len(data), 'character_error_rate': errors / max(1, characters),
            'exact_match_rate': exact / len(data), 'seconds': time.monotonic() - start}, predictions


def main(args):
    random.seed(42); torch.manual_seed(42)
    torch.set_num_threads(4)
    args.output.mkdir(parents=True, exist_ok=True)
    if not torch.cuda.is_available():
        raise RuntimeError('CUDA GPU is unavailable. Refusing an unexpectedly slow CPU training run.')
    device = torch.device('cuda')
    model_id = args.model
    print('Loading pretrained handwriting model; training images stay local.', flush=True)
    processor = TrOCRProcessor.from_pretrained(model_id)
    model = VisionEncoderDecoderModel.from_pretrained(model_id).to(device)
    # Preserve the checkpoint's start token. Small TrOCR starts with EOS (2),
    # not tokenizer CLS (0); overriding it makes baseline generation invalid.
    model.config.decoder_start_token_id = model.generation_config.decoder_start_token_id
    model.config.pad_token_id = model.generation_config.pad_token_id
    model.config.eos_token_id = model.generation_config.eos_token_id
    report = {'model': model_id, 'revision': getattr(model.config, '_commit_hash', None), 'gpu': torch.cuda.get_device_name(),
              'seed': 42, 'steps': args.steps, 'batch_size': 4, 'gradient_accumulation': 2, 'learning_rate': 1e-5,
              'scope': args.scope, 'encoder_frozen': True,
              'dataset_counts': {split: len(json.loads((args.dataset / f'{split}.json').read_text(encoding='utf-8'))) for split in ('train', 'validation', 'test')}}
    processor.save_pretrained(args.output / 'baseline')
    model.save_pretrained(args.output / 'baseline', safe_serialization=True)
    train, validation, test = [Names(args.dataset, split, processor) for split in ('train', 'validation', 'test')]
    report['baseline_validation'], predictions = evaluate(model, processor, validation, device)
    (args.output / 'baseline-validation-predictions.json').write_text(json.dumps(predictions, indent=2), encoding='utf-8')
    report['baseline_test'], predictions = evaluate(model, processor, test, device)
    (args.output / 'baseline-test-predictions.json').write_text(json.dumps(predictions, indent=2), encoding='utf-8')
    print('Baseline:', json.dumps({key: report[key] for key in ('baseline_validation','baseline_test')}), flush=True)
    for parameter in model.encoder.parameters():
        parameter.requires_grad = False
    optimizer = torch.optim.AdamW((p for p in model.parameters() if p.requires_grad), lr=1e-5)
    scaler = torch.amp.GradScaler('cuda')
    loader = DataLoader(train, batch_size=4, shuffle=True, generator=torch.Generator().manual_seed(42))
    start = time.monotonic()
    step, losses = 0, []
    optimizer.zero_grad(set_to_none=True)
    while step < args.steps:
        for microstep, batch in enumerate(loader):
            model.train(); model.encoder.eval()
            with torch.amp.autocast('cuda'):
                loss = model(pixel_values=batch['pixel_values'].to(device), labels=batch['labels'].to(device)).loss
            if not torch.isfinite(loss):
                raise RuntimeError('Nonfinite training loss')
            losses.append(loss.item())
            scaler.scale(loss / 2).backward()
            if (microstep + 1) % 2 == 0:
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                scaler.step(optimizer); scaler.update(); optimizer.zero_grad(set_to_none=True)
                step += 1
                if step % 16 == 0 or step == args.steps:
                    progress = {'step': step, 'steps': args.steps, 'recent_loss': sum(losses[-32:])/len(losses[-32:]), 'seconds': round(time.monotonic()-start, 1)}
                    (args.output / 'progress.json').write_text(json.dumps(progress), encoding='utf-8')
                    print(json.dumps(progress), flush=True)
                if step >= args.steps:
                    break
    report['training_seconds'] = time.monotonic() - start
    report['trained_validation'], predictions = evaluate(model, processor, validation, device)
    (args.output / 'trained-validation-predictions.json').write_text(json.dumps(predictions, indent=2), encoding='utf-8')
    report['trained_test'], predictions = evaluate(model, processor, test, device)
    (args.output / 'trained-test-predictions.json').write_text(json.dumps(predictions, indent=2), encoding='utf-8')
    # Selection uses validation only. The fixed test set is reported, never trained on.
    improved = report['trained_validation']['character_error_rate'] < report['baseline_validation']['character_error_rate']
    report['recommended_checkpoint'] = 'trained' if improved else 'baseline'
    report['clinically_validated'] = False
    report['integrated_in_app'] = False
    report['selection_note'] = 'Relative validation comparison only. Requires broader independent dental evaluation before promotion.'
    processor.save_pretrained(args.output / 'trained')
    model.save_pretrained(args.output / 'trained', safe_serialization=True)
    (args.output / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('FINISHED:', json.dumps(report), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', type=Path, default=Path('work/handwriting/dataset'))
    parser.add_argument('--output', type=Path, default=Path('work/handwriting/run-001'))
    parser.add_argument('--steps', type=int, default=256)
    parser.add_argument('--model', default='microsoft/trocr-small-handwritten')
    parser.add_argument('--scope', default='Handwritten names; no claim about dental records')
    main(parser.parse_args())
