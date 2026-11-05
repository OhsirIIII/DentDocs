import React, { useEffect, useRef, useState } from 'react';
import { request } from '../data/apiClient';
import type { HandwritingSource } from '../types/dental';

type Box = [number, number, number, number];

export function HandwritingInput({ file, patientId, ensureUpload, onUse, onBusy }: {
  file: File; patientId: string; ensureUpload: () => Promise<string>;
  onUse: (text: string) => void; onBusy: (busy: boolean) => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [preview, setPreview] = useState('');
  const [box, setBox] = useState<Box | null>(null);
  const [drafts, setDrafts] = useState<{ source: HandwritingSource; text: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const anchor = useRef<[number, number] | null>(null);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let disposed = false;
    setPreview(''); setBox(null);
    createImageBitmap(file).then(bitmap => {
      if (bitmap.width * bitmap.height > 30_000_000) { bitmap.close(); throw new Error('Choose an image under 30 megapixels.'); }
      const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = rotation % 180 ? height : width;
      canvas.height = rotation % 180 ? width : height;
      const context = canvas.getContext('2d')!;
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(-rotation * Math.PI / 180);
      context.drawImage(bitmap, -width / 2, -height / 2, width, height);
      bitmap.close();
      if (!disposed) setPreview(canvas.toDataURL('image/png'));
    }).catch(e => { if (!disposed) setError(e instanceof Error ? e.message : 'Image preview unavailable. Use manual entry.'); });
    return () => { disposed = true; };
  }, [file, rotation]);

  const point = (event: React.PointerEvent<HTMLDivElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))];
  };
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!anchor.current || busy) return;
    const end = point(event), start = anchor.current;
    setBox([Math.min(start[0], end[0]), Math.min(start[1], end[1]), Math.max(start[0], end[0]), Math.max(start[1], end[1])]);
  };
  const generate = async () => {
    if (!box || busy || box[0] >= box[2] || box[1] >= box[3]) return;
    setBusy(true); onBusy(true); setError('');
    try {
      const id = await ensureUpload();
      const source = await request<HandwritingSource>(`/files/${encodeURIComponent(id)}/handwriting`, {
        method: 'POST', body: JSON.stringify({ patientId, rotation, box }),
      });
      if (!active.current) return;
      if (!source.text.trim()) { setError('No usable suggestion. Select another line or use manual entry.'); return; }
      setDrafts(previous => [...previous, { source, text: source.text }]);
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : 'Reader unavailable. Retry or use manual entry.'); }
    finally { if (active.current) { setBusy(false); onBusy(false); } }
  };
  return <details className="border-t border-slate-200 pt-4">
    <summary className="font-semibold text-sm text-slate-900 cursor-pointer">Handwriting assistance · experimental</summary>
    <div className="mt-4 space-y-4 text-sm">
      <p className="text-slate-700">Select one complete handwritten line. Suggestions can be wrong; compare every word, tooth number, date and amount with the original. Add more lines as needed.</p>
      <label className="block text-xs font-semibold text-slate-800">Rotate image
        <select aria-label="Rotate image" value={rotation} disabled={busy} onChange={e => { setRotation(Number(e.target.value)); setError(''); }} className="block mt-1 border border-slate-300 rounded-lg p-2 bg-white">
          <option value={0}>Original orientation</option><option value={90}>90° counterclockwise</option><option value={180}>180°</option><option value={270}>90° clockwise</option>
        </select>
      </label>
      <p className="text-xs text-slate-600">Drag across a line below, or enter its boundaries as percentages.</p>
      {preview && <div className="relative touch-none select-none border border-slate-300 overflow-hidden" onPointerDown={e => {
        if (busy) return; e.currentTarget.setPointerCapture(e.pointerId); anchor.current = point(e); setBox(null);
      }} onPointerMove={move} onPointerUp={e => { move(e); anchor.current = null; }} onPointerCancel={() => { anchor.current = null; }}>
        <img src={preview} alt="Original image for handwriting region selection" draggable={false} className="w-full block" />
        {box && <div className="absolute border-2 border-amber-700 bg-amber-200/20 pointer-events-none" style={{ left: `${box[0] * 100}%`, top: `${box[1] * 100}%`, width: `${(box[2] - box[0]) * 100}%`, height: `${(box[3] - box[1]) * 100}%` }} />}
      </div>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['Left (%)', 'Top (%)', 'Right (%)', 'Bottom (%)'].map((label, index) => <label key={label} className="text-xs font-semibold text-slate-800">{label}
          <input type="number" min={0} max={100} step={0.1} disabled={busy} value={Math.round((box || [0, 0, 1, .2])[index] * 1000) / 10}
            onChange={e => { const next: Box = [...(box || [0, 0, 1, .2])] as Box; next[index] = Math.max(0, Math.min(1, Number(e.target.value) / 100)); setBox(next); }}
            className="block mt-1 w-full border border-slate-300 rounded-lg p-2 bg-white" />
        </label>)}
      </div>
      {error && <p role="alert" className="text-rose-900 bg-rose-50 p-3 rounded-lg">{error}</p>}
      {busy && <p role="status">Reading selected handwriting locally… This may take up to a minute.</p>}
      <button type="button" disabled={busy || !preview || !box || box[0] >= box[2] || box[1] >= box[3]} onClick={generate}
        className="rounded-xl px-4 py-2 bg-slate-800 text-white font-semibold disabled:opacity-50">Suggest transcription</button>
      {drafts.map((draft, index) => <div key={draft.source.id} className="space-y-2 border-t border-slate-200 pt-4">
        <label className="block font-semibold text-slate-900" htmlFor={`handwriting-line-${index}`}>Suggested line {index + 1} · unverified</label>
        <textarea id={`handwriting-line-${index}`} value={draft.text} disabled={busy} onChange={e => setDrafts(previous => previous.map((item, i) => i === index ? { ...item, text: e.target.value } : item))}
          className="block w-full min-h-24 p-3 border border-slate-300 rounded-xl bg-white text-slate-900" />
        <button type="button" disabled={busy} onClick={() => setDrafts(previous => previous.filter((_, i) => i !== index))} className="text-xs underline text-slate-700">Remove from transcription</button>
      </div>)}
      {drafts.length > 0 && <>
        <p className="text-xs text-slate-600">Generated suggestions are retained as source history. Your edited text will be saved separately and sent for staff review. Handwriting has no validated confidence score.</p>
        <button type="button" disabled={busy || !drafts.some(d => d.text.trim())} onClick={() => onUse(drafts.map(d => d.text.trim()).filter(Boolean).join('\n'))}
          className="rounded-xl px-4 py-2 bg-slate-800 text-white font-semibold disabled:opacity-50">Continue to metadata review</button>
      </>}
    </div>
  </details>;
}
