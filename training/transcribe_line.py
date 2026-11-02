"""Offline draft transcription of a staff-selected line; never certifies clinical content."""
import argparse
import hashlib
import json
from pathlib import Path
import time

from PIL import Image, ImageOps
import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel


def transcribe(image_path, checkpoint, box=None, rotate=0):
    started = time.monotonic()
    Image.MAX_IMAGE_PIXELS = 30_000_000
    with Image.open(image_path) as source:
        image = ImageOps.exif_transpose(source).convert('RGB')
        if rotate:
            image = image.rotate(rotate, expand=True)
        if box:
            x0, y0, x1, y1 = box
            if not 0 <= x0 < x1 <= image.width or not 0 <= y0 < y1 <= image.height:
                raise ValueError('Crop must stay inside the rotated image')
            image = image.crop(box)
        if image.width < 16 or image.height < 8:
            raise ValueError('Select a readable text line')
    torch.set_num_threads(4)
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    processor = TrOCRProcessor.from_pretrained(checkpoint, local_files_only=True, use_fast=False)
    model = VisionEncoderDecoderModel.from_pretrained(checkpoint, local_files_only=True, use_safetensors=True).to(device).eval()
    with torch.inference_mode():
        pixels = processor(images=image, return_tensors='pt').pixel_values.to(device)
        ids = model.generate(pixels, max_new_tokens=64, num_beams=1)
        text = processor.batch_decode(ids, skip_special_tokens=True)[0]
    weights = checkpoint / 'model.safetensors'
    with weights.open('rb') as handle:
        model_hash = hashlib.file_digest(handle, 'sha256').hexdigest()
    with image_path.open('rb') as handle:
        image_hash = hashlib.file_digest(handle, 'sha256').hexdigest()
    return {'text': text, 'status': 'draft', 'requiresStaffVerification': True, 'confidence': None,
            'warning': 'May contain invented or misread text. Verify every word, date, amount and tooth number against the crop.',
            'sourceSha256': image_hash, 'rotationCounterclockwise': rotate, 'cropAfterRotation': box,
            'modelPath': str(checkpoint.resolve()), 'modelSha256': model_hash,
            'device': device, 'secondsIncludingModelLoad': time.monotonic() - started}, image


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('image', type=Path)
    parser.add_argument('--checkpoint', type=Path, default=Path('work/handwriting/pretrained-base'))
    parser.add_argument('--box', type=int, nargs=4)
    parser.add_argument('--rotate', type=int, choices=[0, 90, 180, 270], default=0)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--crop-preview', type=Path)
    args = parser.parse_args()
    result, crop = transcribe(args.image, args.checkpoint, args.box, args.rotate)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    if args.crop_preview:
        args.crop_preview.parent.mkdir(parents=True, exist_ok=True)
        crop.save(args.crop_preview)
    print('Draft transcription saved locally. Staff verification required.')
