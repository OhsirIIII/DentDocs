import { HandwritingHistory } from '../components/HandwritingHistory';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useClinic } from '../context/ClinicContext';
import { request } from '../data/apiClient';
import {
  reviewReasons,
  reviewStatuses,
  type ReviewQueue,
  type ReviewDetail,
} from '../types/workflows';

const control =
  'w-full mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const active = ['pending', 'in_review', 'changes_requested'];

export function ReviewQueueView() {
  const { currentUser, patients, reload } = useClinic();
  const { reviewId } = useParams();
  const currentReview = useRef(reviewId);
  const loadSequence = useRef(0);
  currentReview.current = reviewId;
  const [queue, setQueue] = useState<ReviewQueue>({ items: [], reviewers: [] });
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [status, setStatus] = useState('active');
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState('approve');
  const [patientId, setPatientId] = useState('');
  const [patientVerified, setPatientVerified] = useState(false);
  const [readable, setReadable] = useState(false);
  const clinician = ['admin', 'dentist'].includes(currentUser.role);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    const [list, selected] = await Promise.all([
      request<ReviewQueue>('/reviews'),
      reviewId
        ? request<ReviewDetail>(`/reviews/${encodeURIComponent(reviewId)}`)
        : Promise.resolve(null),
    ]);
    if (currentReview.current !== reviewId || sequence !== loadSequence.current)
      return;
    setQueue(list);
    setDetail(selected);
    setPatientId(selected?.source.patientId || '');
    setPatientVerified(false);
    setReadable(false);
    setNote('');
  }, [reviewId]);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    load()
      .catch((err) => {
        if (current) setError(err.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [load]);
  async function act(operation: () => Promise<unknown>, result: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await operation();
      await Promise.all([load(), reload()]);
      setMessage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save review');
    } finally {
      setBusy(false);
    }
  }
  const rows = queue.items.filter(
    (item) =>
      (status === 'all' || status === 'active'
        ? status === 'all' || active.includes(item.status)
        : item.status === status) &&
      (!mine || item.assigneeId === currentUser.id),
  );
  const canDecide =
    clinician &&
    detail &&
    active.includes(detail.status) &&
    detail.version === detail.source.version &&
    (currentUser.role === 'admin' ||
      !detail.assigneeId ||
      detail.assigneeId === currentUser.id);
  return (
    <div className="space-y-7 pb-12">
      <header>
        <h1 className="text-2xl font-bold text-brand-950">
          Document review queue
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-3xl">
          Verify uncertain extraction, patient mismatches and flagged originals.
          Approval records your extraction review; completeness and document
          validity are verified separately.
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="bg-rose-50 text-rose-900 rounded-lg p-4 text-sm"
        >
          {error}{' '}
          <button
            className="underline ml-3"
            onClick={() => void load().catch((err) => setError(err.message))}
          >
            Reload review
          </button>
        </p>
      )}
      {message && (
        <p
          role="status"
          className="bg-emerald-50 text-emerald-900 rounded-lg p-4 text-sm"
        >
          {message}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-5">
        <label className="text-sm font-semibold">
          Review status
          <select
            className={control + ' sm:w-60'}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Action needed</option>
            <option value="pending">Awaiting review</option>
            <option value="in_review">In review</option>
            <option value="changes_requested">Corrections requested</option>
            <option value="approved">Extraction approved</option>
            <option value="superseded">Superseded</option>
            <option value="all">All review history</option>
          </select>
        </label>
        {clinician && (
          <label className="flex items-center gap-2 text-sm py-2">
            <input
              type="checkbox"
              checked={mine}
              onChange={(e) => setMine(e.target.checked)}
            />
            Assigned to me
          </label>
        )}
        <span className="text-sm text-slate-600 pb-2">
          {rows.length} matching {rows.length === 1 ? 'record' : 'records'}
        </span>
      </div>
      {loading ? (
        <p role="status">Loading review records…</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-start">
          <section aria-label="Review records" className="min-w-0">
            <ul className="divide-y divide-slate-200 border-y border-slate-200">
              {rows.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/review/${item.id}`}
                    className={
                      'block py-5 px-3 rounded-lg hover:bg-brand-50 ' +
                      (reviewId === item.id
                        ? 'bg-brand-50 ring-1 ring-brand-200'
                        : '')
                    }
                    aria-current={reviewId === item.id ? 'page' : undefined}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-xs font-semibold text-brand-800">
                        {reviewStatuses[item.status]} · v{item.version}
                      </span>
                      <span className="text-xs text-slate-600">
                        {item.document.confidenceScore}% confidence
                      </span>
                    </div>
                    <h2 className="mt-2 text-sm font-semibold text-slate-900 break-words">
                      {item.document.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.document.patientName} ·{' '}
                      {item.document.patientRecordNo}
                    </p>
                    <p className="mt-2 text-xs text-amber-900">
                      {item.reasons
                        .map((reason) => reviewReasons[reason] || reason)
                        .join(' · ')}
                    </p>
                    <p className="mt-2 text-xs text-slate-600">
                      {item.assigneeName
                        ? `Assigned to ${item.assigneeName}`
                        : 'Unassigned'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            {rows.length === 0 && (
              <div className="py-8">
                <h2 className="font-semibold text-brand-950">
                  No matching reviews
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Try another status or open a document to request a review.
                </p>
              </div>
            )}
          </section>
          <section
            aria-label="Selected review"
            className="min-w-0 border border-slate-200 rounded-xl bg-white p-5 sm:p-6"
          >
            {!detail ? (
              <p className="text-sm text-slate-600">
                Select a record to inspect its source and review history.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-brand-950">
                      {detail.source.title}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {detail.source.patientName} ·{' '}
                      {detail.source.patientRecordNo}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-brand-800">
                      {reviewStatuses[detail.status]} · review of v
                      {detail.version}
                    </p>
                  </div>
                  <Link
                    className="text-sm font-semibold underline text-brand-800"
                    to={`/documents/${detail.documentId}`}
                  >
                    Open document
                  </Link>
                </div>
                {detail.version !== detail.source.version && (
                  <p className="mt-4 text-sm text-amber-900">
                    This historical review refers to v{detail.version}. The
                    current source is v{detail.source.version}; use its current
                    review for new decisions.
                  </p>
                )}
                <dl className="grid sm:grid-cols-2 gap-3 mt-5 text-sm">
                  <div>
                    <dt className="text-slate-600">Document type</dt>
                    <dd>{detail.source.type}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">Completeness</dt>
                    <dd>
                      {detail.source.completenessStatus.replace('_', ' ')}
                    </dd>
                  </div>
                </dl>
                <ul className="mt-4 space-y-1 text-sm text-amber-900">
                  {detail.reasons.map((reason) => (
                    <li key={reason}>{reviewReasons[reason] || reason}</li>
                  ))}
                </ul>
                <details className="mt-5 text-sm">
                  <summary className="font-semibold cursor-pointer text-brand-800">
                    Extracted text and field confidence
                  </summary>
                  <ul className="mt-3 space-y-1 text-xs text-slate-600">
                    {Object.entries(detail.source.fieldConfidence).map(
                      ([field, score]) => (
                        <li key={field}>
                          {field}: {detail.source.handwritingSources?.length ? "Not scored; staff check" : `${score}%`}
                        </li>
                      ),
                    )}
                  </ul>
                  <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap break-words font-sans text-sm text-slate-700">
                    {detail.source.extractedText}
                  </pre>
                </details>
                <HandwritingHistory sources={detail.source.handwritingSources} />
                {detail.source.fileId ? (
                  <a
                    className="inline-block mt-4 text-sm underline text-brand-800"
                    href={`/api/documents/${detail.documentId}/file`}
                  >
                    Download original for review
                  </a>
                ) : (
                  <p className="mt-4 text-xs text-slate-600">
                    Fictional fixture: an original file was not supplied.
                  </p>
                )}
                {clinician &&
                  active.includes(detail.status) &&
                  detail.version === detail.source.version && (
                    <label className="block mt-6 text-sm font-semibold">
                      Assigned reviewer
                      <select
                        aria-label="Assigned reviewer"
                        className={control}
                        disabled={busy}
                        value={detail.assigneeId || ''}
                        onChange={(e) =>
                          void act(
                            () =>
                              request(`/reviews/${detail.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({
                                  expectedRevision: detail.revision,
                                  assigneeId: e.target.value || null,
                                }),
                              }),
                            'Reviewer assignment saved.',
                          )
                        }
                      >
                        <option value="">Unassigned</option>
                        {queue.reviewers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                {canDecide ? (
                  <form
                    className="mt-6 pt-5 border-t border-slate-200 space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act(
                        () =>
                          request(`/reviews/${detail.id}/decision`, {
                            method: 'POST',
                            body: JSON.stringify({
                              expectedRevision: detail.revision,
                              expectedDocumentRevision: detail.source.revision,
                              decision,
                              note,
                              patientVerified,
                              readableConfirmed: readable,
                              ...(patientVerified ? { patientId } : {}),
                            }),
                          }),
                        decision === 'approve'
                          ? 'Extraction review approved. Completeness and validity remain separate.'
                          : 'Corrections requested. The record remains in the action queue.',
                      );
                    }}
                  >
                    <label className="block text-sm font-semibold">
                      Review decision
                      <select
                        aria-label="Review decision"
                        className={control}
                        value={decision}
                        onChange={(e) => setDecision(e.target.value)}
                      >
                        <option value="approve">Approve extraction</option>
                        <option value="request_changes">
                          Request corrections or replacement
                        </option>
                      </select>
                    </label>
                    {detail.reasons.includes('name_mismatch') && (
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold">
                          Verified patient record
                          <select
                            aria-label="Verified patient record"
                            className={control}
                            value={patientId}
                            onChange={(e) => {
                              setPatientId(e.target.value);
                              setPatientVerified(false);
                            }}
                          >
                            {patients.map((patient) => (
                              <option key={patient.id} value={patient.id}>
                                {patient.recordNo} — {patient.fullName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={patientVerified}
                            onChange={(e) =>
                              setPatientVerified(e.target.checked)
                            }
                            required={decision === 'approve'}
                          />
                          I verified this patient link against the original.
                        </label>
                      </div>
                    )}
                    {detail.reasons.includes('blur') && (
                      <label className="flex gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={readable}
                          onChange={(e) => setReadable(e.target.checked)}
                          required={decision === 'approve'}
                        />
                        I can read the original well enough to verify the
                        extraction.
                      </label>
                    )}
                    <label className="block text-sm font-semibold">
                      Staff review note
                      <textarea
                        className={control}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        required
                        maxLength={2000}
                        rows={3}
                      />
                    </label>
                    <button
                      className="bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-semibold"
                      disabled={busy}
                    >
                      {busy ? 'Saving…' : 'Save review decision'}
                    </button>
                  </form>
                ) : (
                  <p className="mt-5 text-sm text-slate-600">
                    {!clinician
                      ? 'A dentist or administrator records review decisions.'
                      : detail.status === 'approved'
                        ? 'Approved extraction. Completeness and validity are verified separately.'
                        : 'This item is decided, superseded or assigned to another reviewer.'}
                  </p>
                )}
                {detail.decisionNote && (
                  <p className="mt-5 text-sm text-slate-700">
                    <strong>Latest decision:</strong> {detail.decisionNote}
                  </p>
                )}
                <details className="mt-6 border-t border-slate-200 pt-4">
                  <summary className="text-sm font-semibold text-brand-800 cursor-pointer">
                    Review history
                  </summary>
                  <ol className="mt-3 space-y-4 text-sm">
                    {detail.events.map((event, index) => (
                      <li key={index}>
                        <p className="font-semibold text-slate-800">
                          {event.userName} ·{' '}
                          {reviewStatuses[event.status] || event.status}
                        </p>
                        <p className="mt-1 break-words text-slate-600">
                          {event.note}
                        </p>
                        <time className="text-xs text-slate-500">
                          {event.timestamp}
                        </time>
                      </li>
                    ))}
                  </ol>
                </details>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

