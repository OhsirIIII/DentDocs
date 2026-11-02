import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DentalDocument } from '../types/dental';
import { request } from '../data/apiClient';
import { useClinic } from '../context/ClinicContext';
import {
  reviewStatuses,
  validityLabels,
  type ValidityRule,
  type ValidityState,
} from '../types/workflows';

export function ValidityBadge({ validity }: { validity?: ValidityState }) {
  const status = validity?.status || 'unknown';
  const tone =
    status === 'expired'
      ? 'text-rose-900 bg-rose-50'
      : status === 'expiring'
        ? 'text-amber-900 bg-amber-50'
        : status === 'valid'
          ? 'text-emerald-900 bg-emerald-50'
          : 'text-slate-700 bg-slate-100';
  return (
    <span
      className={'inline-block rounded px-2 py-1 text-xs font-semibold ' + tone}
    >
      {validityLabels[status]}
    </span>
  );
}

export function DocumentWorkflowPanel({
  document: doc,
}: {
  document: DentalDocument;
}) {
  const { currentUser, documents, reload } = useClinic();
  const [validity, setValidity] = useState<ValidityState | null>(
    doc.validity || null,
  );
  const [rules, setRules] = useState<ValidityRule[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [referral, setReferral] = useState('');
  const [basis, setBasis] = useState('explicit');
  const [category, setCategory] = useState('general');
  const [issuedOn, setIssuedOn] = useState(doc.date);
  const [expiresOn, setExpiresOn] = useState('');
  const [warningDays, setWarningDays] = useState('');
  const [ruleId, setRuleId] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const clinician = ['admin', 'dentist'].includes(currentUser.role);
  const load = useCallback(async () => {
    const result = await request<ValidityState>(
      `/documents/${doc.id}/validity`,
    );
    setValidity(result);
  }, [doc.id, doc.revision]);
  useEffect(() => {
    setLoading(true);
    setEditing(false);
    setConfirmed(false);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load]);
  async function run(operation: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await operation();
      await Promise.all([load(), reload()]);
      setMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }
  const applicableRules = rules.filter(
    (rule) =>
      rule.status === 'approved' &&
      rule.documentType === doc.type &&
      rule.category === category,
  );
  const appointments = documents.filter(
    (item) =>
      !item.archived &&
      item.patientId === doc.patientId &&
      item.type === 'Appointment Record',
  );
  const control =
    'mt-2 w-full border border-slate-300 rounded-lg bg-white px-3 py-2 text-sm';
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <summary className="cursor-pointer text-sm font-semibold text-brand-950">
        <span className="mr-3">Review and validity</span>
        <ValidityBadge validity={validity || undefined} />{' '}
        <span className="ml-3 text-xs font-normal text-slate-600">
          {doc.review
            ? reviewStatuses[doc.review.status]
            : 'No extraction review requested'}
        </span>
      </summary>
      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-900">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm text-emerald-900">
          {message}
        </p>
      )}
      <div className="mt-5 grid gap-7 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="text-base font-semibold text-brand-950">
            Extraction review
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            A review decision verifies extracted information. It does not
            automatically certify completeness or validity.
          </p>
          {doc.review && (
            <Link
              className="inline-block mt-3 text-sm underline font-semibold text-brand-800"
              to={`/review/${doc.review.id}`}
            >
              Open this review
            </Link>
          )}
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  request('/reviews/referrals', {
                    method: 'POST',
                    body: JSON.stringify({
                      documentId: doc.id,
                      expectedDocumentRevision: doc.revision,
                      note: referral,
                    }),
                  }),
                'Review requested. Open the review queue for assignment and follow-up.',
              );
            }}
          >
            <label className="block text-sm font-semibold">
              Reason for review
              <textarea
                className={control}
                value={referral}
                onChange={(e) => setReferral(e.target.value)}
                maxLength={2000}
                required
                rows={2}
              />
            </label>
            <button
              className="rounded-lg border border-brand-300 text-brand-900 hover:bg-brand-50 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={busy}
            >
              Request review
            </button>
          </form>
        </section>
        <section className="min-w-0">
          <h2 className="text-base font-semibold text-brand-950">
            Document validity
          </h2>
          {loading ? (
            <p role="status" className="mt-3 text-sm">
              Loading validity…
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-600 mt-2">
                {validity?.reason || 'No expiry period is assumed.'}
              </p>
              {validity?.expiresOn && (
                <p className="mt-2 text-sm text-slate-800">
                  {validity.status === 'unknown'
                    ? 'Previously recorded expiry'
                    : 'Expiry'}
                  : <strong>{validity.expiresOn}</strong>
                </p>
              )}
              {validity?.note && (
                <p className="mt-2 text-sm text-slate-700 break-words">
                  Source note: {validity.note}
                </p>
              )}
              {validity?.confirmedAt && (
                <p className="mt-2 text-xs text-slate-500">
                  Last confirmed: {validity.confirmedAt}
                  {validity.ruleVersion
                    ? ` · policy v${validity.ruleVersion}`
                    : ''}
                </p>
              )}
              {clinician && !editing && (
                <button
                  type="button"
                  className="mt-4 rounded-lg bg-brand-800 hover:bg-brand-900 px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => {
                    setEditing(true);
                    setConfirmed(false);
                    void request<ValidityRule[]>('/validity-rules')
                      .then(setRules)
                      .catch((err) => setError(err.message));
                  }}
                >
                  Record validity
                </button>
              )}
              {!clinician && (
                <p className="mt-4 text-sm text-slate-600">
                  A dentist or administrator must verify validity.
                </p>
              )}
            </>
          )}
          {editing && (
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await request(`/documents/${doc.id}/validity`, {
                    method: 'PUT',
                    body: JSON.stringify({
                      expectedRevision: validity?.revision || 0,
                      expectedDocumentRevision: doc.revision,
                      basis,
                      category,
                      issuedOn: basis !== 'not_applicable' ? issuedOn : null,
                      expiresOn: basis === 'explicit' ? expiresOn : null,
                      warningDays:
                        basis === 'explicit' ? Number(warningDays) : 0,
                      ruleId: basis === 'rule' ? ruleId : null,
                      appointmentId:
                        doc.type === 'Consent Form' &&
                        basis !== 'not_applicable'
                          ? appointmentId
                          : null,
                      staffConfirmed: confirmed,
                      note,
                    }),
                  });
                  setEditing(false);
                }, 'Validity confirmation saved. Expiry does not delete or archive this document.');
              }}
            >
              <label className="block text-sm font-semibold">
                Validity basis
                <select
                  aria-label="Validity basis"
                  className={control}
                  value={basis}
                  onChange={(e) => {
                    setBasis(e.target.value);
                    setConfirmed(false);
                  }}
                >
                  <option value="explicit">
                    Expiry stated on the original
                  </option>
                  <option value="rule">Approved clinic policy</option>
                  <option value="not_applicable">Expiry does not apply</option>
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Document category
                <select
                  aria-label="Document category"
                  className={control}
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setRuleId('');
                    setConfirmed(false);
                  }}
                >
                  <option value="general">General</option>
                  <option value="medical_clearance">Medical clearance</option>
                </select>
              </label>
              {basis !== 'not_applicable' && (
                <label className="block text-sm font-semibold">
                  Verified issue date
                  <input
                    className={control}
                    type="date"
                    value={issuedOn}
                    onChange={(e) => {
                      setIssuedOn(e.target.value);
                      setConfirmed(false);
                    }}
                    required
                  />
                </label>
              )}
              {basis === 'explicit' && (
                <>
                  <label className="block text-sm font-semibold">
                    Expiry date on original
                    <input
                      className={control}
                      type="date"
                      min={issuedOn}
                      value={expiresOn}
                      onChange={(e) => {
                        setExpiresOn(e.target.value);
                        setConfirmed(false);
                      }}
                      required
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    Reminder days before expiry
                    <input
                      className={control}
                      type="number"
                      min={0}
                      max={365}
                      value={warningDays}
                      onChange={(e) => setWarningDays(e.target.value)}
                      placeholder="0 means the expiry date only"
                      required
                    />
                  </label>
                </>
              )}
              {basis === 'rule' && (
                <>
                  <label className="block text-sm font-semibold">
                    Approved policy
                    <select
                      aria-label="Approved policy"
                      className={control}
                      value={ruleId}
                      onChange={(e) => {
                        setRuleId(e.target.value);
                        setConfirmed(false);
                      }}
                      required
                    >
                      <option value="">Choose an approved policy</option>
                      {applicableRules.map((rule) => (
                        <option key={rule.id} value={rule.id}>
                          v{rule.version} · {rule.validForDays} days ·{' '}
                          {rule.reference}
                        </option>
                      ))}
                    </select>
                  </label>
                  {applicableRules.length === 0 && (
                    <p className="text-sm text-amber-900">
                      No matching approved policy.{' '}
                      <Link className="underline" to="/validity-rules">
                        Review clinic policies
                      </Link>
                      . No expiry will be inferred.
                    </p>
                  )}
                </>
              )}
              {doc.type === 'Consent Form' && basis !== 'not_applicable' && (
                <label className="block text-sm font-semibold">
                  Appointment this consent covers
                  <select
                    aria-label="Appointment this consent covers"
                    className={control}
                    value={appointmentId}
                    onChange={(e) => {
                      setAppointmentId(e.target.value);
                      setConfirmed(false);
                    }}
                    required
                  >
                    <option value="">Choose the relevant appointment</option>
                    {appointments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} · {item.date}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-sm font-semibold">
                Source and verification note
                <textarea
                  className={control}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={2000}
                  required
                  rows={3}
                />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  required
                />
                I verified the dates, basis and scope against the original or
                approved policy.
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-lg bg-brand-800 hover:bg-brand-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={busy}
                >
                  {busy ? 'Saving…' : 'Save validity confirmation'}
                </button>
                <button
                  type="button"
                  className="text-sm underline text-brand-800"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {!!validity?.history?.length && (
            <details className="mt-5 text-sm">
              <summary className="cursor-pointer text-brand-800 font-semibold">
                Validity history
              </summary>
              <ol className="mt-3 space-y-3">
                {validity.history.map((entry, index) => (
                  <li key={index} className="text-slate-600">
                    v{entry.version} · {entry.confirmedAt} ·{' '}
                    {entry.expiresOn || 'No expiry'}
                    <p className="break-words">{entry.note}</p>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </section>
      </div>
    </details>
  );
}
