import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DentalDocument } from '../types/dental';
import { request } from '../data/apiClient';
import { useClinic } from '../context/ClinicContext';

type Item = {
  id: string; text: string; createdAt: string; createdBy: string; engine: string;
  sourceVersion: number; sourceRevision: number; fileId: string | null; currentSource: boolean;
  status: 'draft' | 'approved' | 'rejected' | 'outdated_source';
  evidence: { field: string; start: number; end: number; quote: string }[];
  decision: null | { action: 'approve' | 'reject'; text: string | null; note: string; decidedBy: string; decidedAt: string };
};
type History = { accepted: Item | null; items: Item[]; documentRevision: number; sourceReviewPending: boolean; historyCount: number; draftId?: string };

export function SummaryPanel({ document: doc }: { document: DentalDocument }) {
  const { currentUser } = useClinic();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<History | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const canDecide = currentUser.role === 'admin' || currentUser.role === 'dentist';
  const selected = data?.items.find(item => item.id === selectedId);
  const choose = useCallback((item?: Item) => {
    setSelectedId(item?.id || ''); setText(item?.decision?.text || item?.text || ''); setNote(''); setConfirmed(false);
  }, []);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setError(''); setData(null);
    request<History>(`/documents/${doc.id}/summaries`).then(result => {
      if (active) { setData(result); choose(result.items[0]); }
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load summaries'); });
    return () => { active = false; };
  }, [open, doc.id, doc.revision, doc.review?.revision, choose]);
  const generate = async () => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await request<History>(`/documents/${doc.id}/summaries`, { method: 'POST', body: JSON.stringify({ expectedRevision: data?.documentRevision || doc.revision }) });
      setData(result); choose(result.items.find(item => item.id === result.draftId));
      setMessage('Draft generated. It is not an accepted summary.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to generate draft'); }
    finally { setBusy(false); }
  };
  const decide = async (action: 'approve' | 'reject') => {
    if (!selected || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await request<History>(`/documents/${doc.id}/summaries/${selected.id}/decision`, { method: 'POST', body: JSON.stringify({ expectedRevision: data!.documentRevision, action, text, note, confirmed }) });
      setData(result); choose(result.items.find(item => item.id === selected.id));
      setMessage(action === 'approve' ? 'Administrative summary accepted with your named approval.' : 'Draft rejected. No accepted summary was created from it.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to record decision'); }
    finally { setBusy(false); }
  };
  return <details className="my-4 rounded-xl border border-slate-200 bg-white p-4" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold text-sm text-slate-900">Administrative summary</summary>
    {open && <div className="mt-4 space-y-4 text-sm text-slate-800">
      <p>Local extractive drafts preserve selected source wording. They are administrative overviews, not complete transcriptions or clinical assessments. A dentist or administrator must review before acceptance.</p>
      {error && <p role="alert" className="p-3 rounded-lg bg-rose-50 text-rose-900">{error}</p>}
      {message && <p role="status" className="p-3 rounded-lg bg-teal-50 text-teal-900">{message}</p>}
      {!data && !error && <p role="status">Loading summary history…</p>}
      {data && <>
        <section aria-label="Accepted administrative summary" className="space-y-2 border-b border-slate-200 pb-4">
          <h3 className="font-semibold">Accepted summary</h3>
          {data.accepted ? <>
            <p className="text-xs text-slate-600">Approved by {data.accepted.decision!.decidedBy} · {new Date(data.accepted.decision!.decidedAt).toLocaleString()} · source version {data.accepted.sourceVersion}, revision {data.accepted.sourceRevision}</p>
            <pre className="font-sans whitespace-pre-wrap break-words leading-relaxed">{data.accepted.decision!.text}</pre>
          </> : <p className="text-slate-600">No accepted summary for the current source.</p>}
        </section>
        <button type="button" disabled={busy || doc.archived} onClick={generate} className="rounded-lg bg-slate-800 text-white px-4 py-2 font-semibold disabled:opacity-50">Generate local draft</button>
        {data.items.length > 0 && <>
          <label className="block text-xs font-semibold">Summary draft/history
            <select aria-label="Summary draft/history" disabled={busy} value={selectedId} onChange={e => choose(data.items.find(item => item.id === e.target.value))} className="block mt-1 w-full rounded-lg border border-slate-300 p-2 bg-white">
              {data.items.map(item => <option key={item.id} value={item.id}>{item.status.replaceAll('_', ' ')} · v{item.sourceVersion}/r{item.sourceRevision} · {new Date(item.createdAt).toLocaleString()} · {item.createdBy}</option>)}
            </select>
          </label>
          {selected && <div className="space-y-3">
            <p className="text-xs text-slate-600">Method: local extractive draft · source version {selected.sourceVersion}, revision {selected.sourceRevision}. {selected.currentSource ? 'Source matches the current record.' : 'Outdated source: generate a fresh draft before accepting.'}</p>
            {data.sourceReviewPending && <p className="text-amber-950 bg-amber-50 rounded-lg p-3">Finish source extraction review before accepting a summary. {doc.review && <Link className="underline" to={`/review/${doc.review.id}`}>Open source review</Link>}</p>}
            <label htmlFor="summaryText" className="block text-xs font-semibold">Administrative summary text</label>
            <textarea id="summaryText" maxLength={6000} rows={12} value={text} readOnly={!canDecide || selected.status !== 'draft'} disabled={busy} onChange={e => setText(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 bg-slate-50 text-slate-900" />
            {selected.evidence.length > 0 && <details><summary className="cursor-pointer font-semibold text-xs">Source quotations ({selected.evidence.length})</summary>
              {selected.evidence.map(item => <blockquote key={`${item.start}-${item.end}`} className="mt-3 text-xs"><p className="whitespace-pre-wrap break-words">{item.quote}</p><p className="text-slate-600">Stored transcription · characters {item.start}–{item.end}</p></blockquote>)}
            </details>}
            {selected.fileId ? <a className="inline-block underline text-xs" href={`/api/documents/${doc.id}/file?version=${selected.sourceVersion}`}>Download source original · version {selected.sourceVersion}</a> : <p className="text-xs text-slate-600">This source record has no retained original file; compare its stored text and metadata.</p>}
            {selected.decision && <p className="text-xs text-slate-600">{selected.decision.action === 'approve' ? 'Approved' : 'Rejected'} by {selected.decision.decidedBy}: {selected.decision.note}</p>}
            {canDecide && selected.status === 'draft' && !doc.archived && <>
              <label className="block text-xs font-semibold" htmlFor="summaryNote">Summary review note</label>
              <textarea id="summaryNote" maxLength={1000} value={note} disabled={busy} onChange={e => setNote(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2" />
              <label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />I compared this summary with the source and confirm administrative use only.</label>
              <div className="flex flex-wrap gap-3">
                <button type="button" disabled={busy || !confirmed || !note.trim() || !text.trim() || data.sourceReviewPending} onClick={() => decide('approve')} className="rounded-lg px-4 py-2 bg-slate-800 text-white font-semibold disabled:opacity-50">Approve and save summary</button>
                <button type="button" disabled={busy || !note.trim()} onClick={() => decide('reject')} className="rounded-lg px-4 py-2 border border-slate-300 font-semibold disabled:opacity-50">Reject draft</button>
              </div>
            </>}
          </div>}
          {data.historyCount > data.items.length && <p className="text-xs text-slate-600">Showing the latest {data.items.length} of {data.historyCount} retained drafts.</p>}
        </>}
      </>}
      {busy && <p role="status">Saving summary workflow…</p>}
    </div>}
  </details>;
}
