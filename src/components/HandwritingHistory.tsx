import type { HandwritingSource } from '../types/dental';

export function HandwritingHistory({ sources }: { sources?: HandwritingSource[] }) {
  if (!sources?.length) return null;
  return <details className="mt-4 text-sm border-t border-slate-200 pt-3">
    <summary className="font-semibold cursor-pointer text-slate-900">Handwriting source history ({sources.length} suggestions)</summary>
    <p className="mt-2 text-xs text-slate-600">These are the model's original drafts, not approved text. Compare the saved transcription and original file. Review approval is recorded separately.</p>
    {sources.map(source => <div key={source.id} className="mt-3 text-xs space-y-1 break-words">
      <p>{source.suggestedBy} · {new Date(source.createdAt).toLocaleString()} · rotation {source.rotation}° counterclockwise</p>
      <p>Region: {source.box.map(v => Math.round(v * 1000) / 10).join(', ')}% (left, top, right, bottom)</p>
      <pre className="whitespace-pre-wrap font-sans">{source.text || '(No text returned)'}</pre>
      <p>Model: {source.engine} · <span className="break-all">{source.modelSha256}</span></p>
    </div>)}
  </details>;
}
