import React, { useEffect, useState } from 'react';
import { request } from '../data/apiClient';
import { useClinic } from '../context/ClinicContext';
import { documentTypes, type ValidityRule } from '../types/workflows';
import type { DocumentType } from '../types/dental';

export function ValidityRulesView() {
  const { currentUser, reload } = useClinic();
  const [rules, setRules] = useState<ValidityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [documentType, setDocumentType] =
    useState<DocumentType>('Patient Record');
  const [category, setCategory] = useState('general');
  const [days, setDays] = useState('');
  const [warning, setWarning] = useState('');
  const [reference, setReference] = useState('');
  const [selected, setSelected] = useState<{
    rule: ValidityRule;
    action: 'approve' | 'retire';
  } | null>(null);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const load = () => request<ValidityRule[]>('/validity-rules').then(setRules);
  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  async function run(operation: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await operation();
      await Promise.all([load(), reload()]);
      setSelected(null);
      setMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save policy');
    } finally {
      setBusy(false);
    }
  }
  const control =
    'mt-2 w-full border border-slate-300 rounded-lg bg-white px-3 py-2 text-sm';
  return (
    <div className="space-y-7 pb-12">
      <header>
        <h1 className="text-2xl font-bold text-brand-950">
          Document validity policies
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-3xl">
          No document lifetime is supplied by the system. Create drafts from
          clinic policy references, then obtain explicit approval. Clinical
          policies require a dentist; administrative policies require an
          administrator.
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="bg-rose-50 text-rose-900 p-4 rounded-lg text-sm"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="bg-emerald-50 text-emerald-900 p-4 rounded-lg text-sm"
        >
          {message}
        </p>
      )}
      {currentUser.role === 'admin' && (
        <section className="border border-slate-200 rounded-xl bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-brand-950">
            Create policy draft
          </h2>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  request('/validity-rules', {
                    method: 'POST',
                    body: JSON.stringify({
                      documentType,
                      category,
                      validForDays: Number(days),
                      warningDays: Number(warning),
                      reference,
                    }),
                  }),
                'Draft created. It cannot determine document validity until approved.',
              );
            }}
          >
            <label className="text-sm font-semibold">
              Document type
              <select
                aria-label="Document type"
                className={control}
                value={documentType}
                onChange={(e) =>
                  setDocumentType(e.target.value as DocumentType)
                }
              >
                {documentTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Category
              <select
                aria-label="Category"
                className={control}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="general">General</option>
                <option value="medical_clearance">Medical clearance</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Validity in calendar days
              <input
                className={control}
                type="number"
                min={1}
                max={36500}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                required
              />
              <span className="mt-1 block text-xs font-normal text-slate-600">
                Includes the issue date; 1 day expires on that date.
              </span>
            </label>
            <label className="text-sm font-semibold">
              Reminder days before expiry
              <input
                className={control}
                type="number"
                min={0}
                max={365}
                value={warning}
                onChange={(e) => setWarning(e.target.value)}
                required
              />
              <span className="mt-1 block text-xs font-normal text-slate-600">
                0 means a reminder on the expiry date only.
              </span>
            </label>
            <label className="sm:col-span-2 text-sm font-semibold">
              Clinic policy reference
              <input
                className={control}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={500}
                required
              />
            </label>
            <div className="sm:col-span-2">
              <button
                disabled={busy}
                className="bg-brand-800 hover:bg-brand-900 disabled:opacity-50 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
              >
                Create draft
              </button>
            </div>
          </form>
        </section>
      )}
      {selected && (
        <section
          aria-label="Policy decision"
          className="border border-amber-300 rounded-xl bg-amber-50 p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold text-amber-950">
            {selected.action === 'approve' ? 'Approve' : 'Retire'}{' '}
            {selected.rule.documentType} policy v{selected.rule.version}
          </h2>
          <p className="mt-2 text-sm text-amber-950">
            {selected.rule.reference} · {selected.rule.validForDays} calendar
            days · {selected.rule.warningDays}-day reminder
          </p>
          <p className="mt-2 text-sm text-amber-950">
            {selected.action === 'approve'
              ? 'Approved policy values cannot be edited; create a new version for amendments.'
              : 'Documents using this policy will need fresh validity verification. Existing records and dates remain retained.'}
          </p>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  request(
                    `/validity-rules/${selected.rule.id}/${selected.action}`,
                    {
                      method: 'POST',
                      body: JSON.stringify({
                        expectedRevision: selected.rule.revision,
                        note,
                      }),
                    },
                  ),
                selected.action === 'approve'
                  ? 'Policy version approved.'
                  : 'Policy retired; affected documents require fresh verification.',
              );
            }}
          >
            <label className="block text-sm font-semibold text-amber-950">
              Approval or retirement note
              <textarea
                className={control}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                required
                rows={3}
              />
            </label>
            <label className="flex gap-2 text-sm text-amber-950">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                required
              />
              I reviewed the clinic reference and confirm this decision.
            </label>
            <div className="flex flex-wrap gap-4">
              <button
                disabled={busy}
                className="bg-brand-800 hover:bg-brand-900 disabled:opacity-50 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
              >
                {selected.action === 'approve'
                  ? 'Approve policy version'
                  : 'Retire policy version'}
              </button>
              <button
                type="button"
                className="text-sm underline text-brand-800"
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      <section>
        <h2 className="text-lg font-semibold text-brand-950 mb-4">
          Policy versions
        </h2>
        {loading ? (
          <p role="status">Loading policies…</p>
        ) : !rules.length ? (
          <p className="text-sm text-slate-600 py-5 border-y border-slate-200">
            No policies have been defined. Document validity stays unknown until
            dates are verified or an approved policy is applied.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 border-y border-slate-200">
            {rules.map((rule) => {
              const administrative = [
                'Billing/Receipt',
                'Appointment Record',
              ].includes(rule.documentType);
              const canApprove = administrative
                ? currentUser.role === 'admin'
                : currentUser.role === 'dentist';
              return (
                <li
                  key={rule.id}
                  className="py-5 flex flex-col sm:flex-row sm:justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">
                      {rule.documentType} · {rule.category.replace('_', ' ')} ·
                      v{rule.version}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1 break-words">
                      {rule.reference}
                    </p>
                    <p className="text-sm text-slate-600 mt-2">
                      {rule.validForDays} calendar days · {rule.warningDays}-day
                      reminder · <strong>{rule.status}</strong>
                    </p>
                    {rule.approvedAt && (
                      <p className="text-xs text-slate-500 mt-2">
                        Approved {rule.approvedAt}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {rule.status === 'draft' &&
                      (canApprove ? (
                        <button
                          className="text-sm underline font-semibold text-brand-800"
                          onClick={() => {
                            setSelected({ rule, action: 'approve' });
                            setNote('');
                            setConfirmed(false);
                          }}
                        >
                          Review for approval
                        </button>
                      ) : (
                        <p className="text-sm text-slate-600">
                          {administrative ? 'Administrator' : 'Dentist'}{' '}
                          approval required
                        </p>
                      ))}
                    {rule.status === 'approved' &&
                      currentUser.role === 'admin' && (
                        <button
                          className="text-sm underline font-semibold text-rose-800"
                          onClick={() => {
                            setSelected({ rule, action: 'retire' });
                            setNote('');
                            setConfirmed(false);
                          }}
                        >
                          Review retirement
                        </button>
                      )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
