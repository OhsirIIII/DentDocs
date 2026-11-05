"""Private, offline model service. Only the authenticated DentDocs API calls it."""
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
import os
from pathlib import Path
import threading
import warnings

from PIL import Image, ImageOps
import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel, AutoTokenizer, AutoModel

Image.MAX_IMAGE_PIXELS = 30_000_000
warnings.simplefilter('error', Image.DecompressionBombWarning)
SLOT = threading.BoundedSemaphore(1)
EMBED_SLOT = threading.BoundedSemaphore(1)
MAX_INPUT = 20 * 1024**2


def crop_image(payload, rotation, box):
    if rotation not in (0, 90, 180, 270) or len(box) != 4:
        raise ValueError('Invalid rotation or region')
    x0, y0, x1, y1 = box
    if not all(type(v) in (int, float) and 0 <= v <= 1 for v in box) or not x0 < x1 or not y0 < y1:
        raise ValueError('Select a region inside the image')
    with Image.open(io.BytesIO(payload)) as source:
        if source.format not in ('PNG', 'JPEG'):
            raise ValueError('Handwriting supports PNG/JPEG')
        image = ImageOps.exif_transpose(source).convert('RGB')
        image = image.rotate(rotation, expand=True)
        pixels = [round(x0 * image.width), round(y0 * image.height), round(x1 * image.width), round(y1 * image.height)]
        if pixels[2] - pixels[0] < 16 or pixels[3] - pixels[1] < 8:
            raise ValueError('Select a larger, readable line')
        return image.crop(pixels), pixels


def main():
    token = os.environ.get('HANDWRITING_TOKEN', '')
    if len(token) < 32:
        raise RuntimeError('Configure a private handwriting service token')
    checkpoint = Path('/model')
    weights = checkpoint / 'model.safetensors'
    with weights.open('rb') as handle:
        model_hash = hashlib.file_digest(handle, 'sha256').hexdigest()
    torch.set_num_threads(2)
    processor = TrOCRProcessor.from_pretrained(checkpoint, local_files_only=True, use_fast=False)
    model = VisionEncoderDecoderModel.from_pretrained(checkpoint, local_files_only=True, use_safetensors=True).eval()
    embed_root = Path('/embedding-model')
    embedder = tokenizer = None
    model_id = None
    if (embed_root / 'model.safetensors').is_file():
        source = json.loads((embed_root / 'source.json').read_text())
        if source.get('sha256'):
            for name, expected_hash in source['sha256'].items():
                if Path(name).name != name:
                    raise RuntimeError('Invalid embedding artifact path')
                with (embed_root / name).open('rb') as handle:
                    if hashlib.file_digest(handle, 'sha256').hexdigest() != expected_hash:
                        raise RuntimeError('Embedding artifact integrity check failed')
        tokenizer = AutoTokenizer.from_pretrained(embed_root, local_files_only=True)
        embedder = AutoModel.from_pretrained(embed_root, local_files_only=True, use_safetensors=True).eval()
        model_id = source['model'] + '@' + source['revision']

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # No images, transcriptions, identifiers or credentials in service logs.

        def reply(self, status, data):
            body = json.dumps(data).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            self.connection.settimeout(30)
            if self.path not in {'/transcribe', '/embed'} or not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token):
                self.reply(403, {'detail': 'Forbidden'})
                return
            if self.path == '/embed':
                if embedder is None or not EMBED_SLOT.acquire(blocking=False):
                    self.reply(503, {'detail': 'Embedding reader unavailable or busy'})
                    return
                try:
                    length = int(self.headers.get('Content-Length', '0'))
                    if not 0 < length <= 65536:
                        raise ValueError()
                    texts = json.loads(self.rfile.read(length))['texts']
                    if not isinstance(texts, list) or not 1 <= len(texts) <= 32 or any(not isinstance(t, str) or not t.strip() or len(t) > 1600 for t in texts):
                        raise ValueError()
                    tokens = tokenizer(texts, padding=True, truncation=False, return_tensors='pt')
                    if tokens['input_ids'].shape[1] > 256:
                        raise ValueError()
                    with torch.inference_mode():
                        output = embedder(**tokens).last_hidden_state
                        mask = tokens['attention_mask'].unsqueeze(-1).expand(output.size()).float()
                        vectors = torch.nn.functional.normalize((output * mask).sum(1) / mask.sum(1).clamp(min=1e-9), p=2, dim=1)
                    self.reply(200, {'model': model_id, 'vectors': vectors.tolist()})
                except (ValueError, KeyError, TypeError):
                    self.reply(422, {'detail': 'Unsupported embedding input'})
                except Exception:
                    self.reply(503, {'detail': 'Embedding reader failed'})
                finally:
                    EMBED_SLOT.release()
                return
            if not SLOT.acquire(blocking=False):
                self.reply(503, {'detail': 'Handwriting reader is busy; retry shortly'})
                return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= MAX_INPUT:
                    raise ValueError('Image must be at most 20 MB')
                config = json.loads(self.headers.get('X-Region', '{}'))
                payload = self.rfile.read(length)
                if len(payload) != length:
                    raise ValueError('Incomplete image')
                crop, pixels = crop_image(payload, config['rotation'], config['box'])
                with torch.inference_mode():
                    values = processor(images=crop, return_tensors='pt').pixel_values
                    ids = model.generate(values, max_new_tokens=64, num_beams=1, max_time=40)
                    text = processor.batch_decode(ids, skip_special_tokens=True)[0]
                self.reply(200, {'text': text, 'engine': 'trocr-base-amr-experimental', 'modelSha256': model_hash,
                                 'confidence': None, 'sourceSha256': hashlib.sha256(payload).hexdigest(),
                                 'rotation': config['rotation'], 'box': config['box'], 'pixelBox': pixels,
                                 'status': 'draft', 'requiresStaffVerification': True})
            except (ValueError, KeyError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning):
                self.reply(422, {'detail': 'Cannot read this region. Choose a readable PNG/JPEG line inside the image.'})
            except Exception:
                self.reply(503, {'detail': 'Handwriting reader failed; retry or use manual entry'})
            finally:
                SLOT.release()

    print('Offline handwriting reader ready', flush=True)
    ThreadingHTTPServer(('0.0.0.0', 8091), Handler).serve_forever()


if __name__ == '__main__':
    main()
