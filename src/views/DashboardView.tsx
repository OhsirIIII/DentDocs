import React from 'react';
import { useClinic } from '../context/ClinicContext';
import {
  FileText,
  AlertTriangle,
  Clock,
  Upload,
  Search,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    visibleDocuments,
    patients,
    alerts,
    navigateTo,
    setSelectedDocumentId,
    setSelectedPatientId,
  } = useClinic();

  // Metrics
  const incompleteDocs = visibleDocuments.filter((d) => d.completenessStatus === 'incomplete');
  const reviewNeededDocs = visibleDocuments.filter(
    (d) => d.completenessStatus === 'needs_review' || d.confidenceScore < 85
  );
  const recentDocs = [...visibleDocuments].slice(0, 7);

  const handleOpenDoc = (docId: string, patientId: string) => {
    setSelectedDocumentId(docId);
    setSelectedPatientId(patientId);
    navigateTo('viewer', { documentId: docId, patientId });
  };

  const stats: {
    label: string;
    value: number;
    hint: string;
    tone: 'warn' | 'default';
    onClick: () => void;
  }[] = [
    {
      label: 'Flagged incomplete',
      value: incompleteDocs.length,
      hint: 'Missing signatures or data',
      tone: incompleteDocs.length > 0 ? 'warn' : 'default',
      onClick: () => navigateTo('incomplete'),
    },
    {
      label: 'Needs review',
      value: reviewNeededDocs.length,
      hint: 'Low OCR confidence',
      tone: 'default',
      onClick: () => navigateTo('search', { filterStatus: 'needs_review' }),
    },
    {
      label: 'Accessible documents',
      value: visibleDocuments.length,
      hint: 'Total in vault',
      tone: 'default',
      onClick: () => navigateTo('search'),
    },
    {
      label: 'Active patients',
      value: patients.length,
      hint: 'Registered records',
      tone: 'default',
      onClick: () => navigateTo('patients'),
    },
  ];

  const docTypeTone = (type: string) =>
    type === 'X-ray'
      ? 'bg-brand-950 text-brand-200'
      : type === 'Billing/Receipt'
      ? 'bg-emerald-50 text-emerald-700'
      : type === 'Prescription'
      ? 'bg-indigo-50 text-indigo-700'
      : type === 'Consent Form'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-brand-50 text-brand-700';

  return (
    <div className="space-y-10 pb-16">
      {/* Page header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-brand-950 text-balance">
            Welcome, {currentUser.name}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Signed in as <span className="font-medium text-slate-800">{currentUser.title}</span>.{' '}
            {currentUser.role === 'front_desk'
              ? 'Showing billing and appointment records.'
              : 'Managing clinical documents, radiographs, and patient charts.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigateTo('search')}
            className="inline-flex items-center gap-2 h-10 px-3.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span>Search records</span>
          </button>
          <button
            onClick={() => navigateTo('upload')}
            className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-white bg-brand-800 hover:bg-brand-900 active:bg-brand-950 rounded-lg transition-colors shadow-[0_1px_2px_rgb(15_23_42/0.12)]"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>Upload document</span>
          </button>
        </div>
      </header>

      {/* Clinical & missing document alerts */}
      {alerts.length > 0 ? (
        <section aria-labelledby="alerts-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div className="flex items-center gap-2.5">
              <h2 id="alerts-heading" className="text-base font-semibold text-slate-900">
                Clinical &amp; missing document alerts
              </h2>
              <span className="tabular-nums text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 whitespace-nowrap shrink-0">
                {alerts.length} need action
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Unsigned consents, expiring clearances, and missing licences for scheduled procedures
            </p>
          </div>

          <ul className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {alerts.map((alert) => {
              const critical = alert.severity === 'critical';
              return (
                <li
                  key={alert.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-x-6 gap-y-3 px-4 sm:px-5 py-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        critical ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                      }`}
                      aria-hidden="true"
                    >
                      {critical ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span
                          className={`text-[11px] font-semibold ${
                            critical ? 'text-rose-700' : 'text-amber-700'
                          }`}
                        >
                          {critical ? 'Urgent: missing document' : 'Expiring soon'}
                        </span>
                        {alert.scheduledDate && (
                          <>
                            <span className="text-slate-300" aria-hidden="true">·</span>
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              Scheduled {alert.scheduledDate}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{alert.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-[75ch]">
                        <span className="font-medium text-slate-800">{alert.patientName}</span>
                        <span className="text-slate-400"> · </span>
                        <span className="font-mono text-[11px]">{alert.patientRecordNo}</span>
                        <span className="text-slate-400"> · </span>
                        {alert.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end pl-10 md:pl-0">
                    <button
                      onClick={() => {
                        setSelectedPatientId(alert.patientId);
                        navigateTo('patients', { patientId: alert.patientId });
                      }}
                      className="h-8 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      View chart
                    </button>
                    {alert.linkedDocId ? (
                      <button
                        onClick={() => handleOpenDoc(alert.linkedDocId!, alert.patientId)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-md transition-colors whitespace-nowrap"
                      >
                        <span>{alert.actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPatientId(alert.patientId);
                          navigateTo('upload', { patientId: alert.patientId });
                        }}
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-md transition-colors whitespace-nowrap"
                      >
                        <span>Upload missing form</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="bg-white border border-emerald-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">No active clinical or compliance alerts</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                All scheduled procedures have signed consent forms, valid medical clearances, and recent radiographs.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigateTo('patients')}
            className="h-9 px-3.5 text-xs font-semibold text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors shrink-0"
          >
            Review patient vault
          </button>
        </section>
      )}

      {/* Key figures */}
      <section aria-label="Key figures">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
          {stats.map((s) => (
            <button
              key={s.label}
              onClick={s.onClick}
              className="group text-left bg-white px-5 py-4 hover:bg-slate-50 transition-colors focus-visible:outline-offset-[-2px]"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">{s.label}</span>
                <ChevronRight
                  className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </span>
              <span
                className={`block mt-1.5 text-[28px] leading-none font-bold tabular-nums tracking-tight ${
                  s.tone === 'warn' ? 'text-amber-700' : 'text-brand-950'
                }`}
              >
                {s.value}
              </span>
              <span className="block mt-1.5 text-xs text-slate-500">{s.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Work queues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* Flagged incomplete */}
        <section aria-labelledby="incomplete-heading" className="lg:col-span-5 space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 id="incomplete-heading" className="text-base font-semibold text-slate-900">
                Flagged incomplete
                <span className="ml-1.5 tabular-nums text-slate-400 font-medium">{incompleteDocs.length}</span>
              </h2>
              <p className="text-xs text-slate-500">Action required before clinical or insurance sign-off</p>
            </div>
            {incompleteDocs.length > 0 && (
              <button
                onClick={() => navigateTo('incomplete')}
                className="text-xs font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1 shrink-0 rounded"
              >
                <span>Open queue</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {incompleteDocs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl px-6 py-8 text-center">
              <CheckCircle className="w-7 h-7 text-emerald-500 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-800">All documents complete</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">No missing signatures or fields detected.</p>
              <button
                type="button"
                onClick={() => navigateTo('search', { filterStatus: 'complete' })}
                className="h-8 px-3.5 text-xs font-semibold text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-md transition-colors"
              >
                Browse completed records
              </button>
            </div>
          ) : (
            <ul className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {incompleteDocs.map((doc) => (
                <li key={doc.id}>
                  <button
                    onClick={() => handleOpenDoc(doc.id, doc.patientId)}
                    className="group w-full text-left px-4 py-3.5 hover:bg-amber-50/40 transition-colors focus-visible:outline-offset-[-2px]"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 group-hover:text-brand-800 truncate">
                          {doc.title}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 min-w-0">
                          <span className="truncate text-slate-700">{doc.patientName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="shrink-0">{doc.type}</span>
                          <span aria-hidden="true">·</span>
                          <span className="shrink-0 tabular-nums">{doc.displayDate}</span>
                        </span>
                      </span>
                      <ChevronRight
                        className="w-4 h-4 text-slate-300 group-hover:text-slate-500 mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                    </span>
                    {doc.missingFields.length > 0 && (
                      <span className="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-px shrink-0" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="line-clamp-1">{doc.missingFields[0]}</span>
                          {doc.missingFields.length > 1 && (
                            <span className="text-amber-700/80">
                              +{doc.missingFields.length - 1} more missing item
                              {doc.missingFields.length - 1 === 1 ? '' : 's'}
                            </span>
                          )}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recently uploaded */}
        <section aria-labelledby="recent-heading" className="lg:col-span-7 space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 id="recent-heading" className="text-base font-semibold text-slate-900">
                Recently uploaded
              </h2>
              <p className="text-xs text-slate-500">Latest processed dental scans, receipts, and clinical notes</p>
            </div>
            <button
              onClick={() => navigateTo('search')}
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1 shrink-0 rounded"
            >
              <span>
                View all <span className="tabular-nums">({visibleDocuments.length})</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {recentDocs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl px-6 py-10 text-center">
              <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-800">No documents in the vault yet</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Upload a dental record or receipt to begin building your clinical archive.
              </p>
              <button
                type="button"
                onClick={() => navigateTo('upload')}
                className="h-9 px-4 text-xs font-semibold text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors"
              >
                Upload first document
              </button>
            </div>
          ) : (
            <ul className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {recentDocs.map((doc) => (
                <li key={doc.id}>
                  <button
                    onClick={() => handleOpenDoc(doc.id, doc.patientId)}
                    className="group w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 focus-visible:outline-offset-[-2px]"
                  >
                    <span className="flex items-center gap-3.5 min-w-0">
                      <span
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${docTypeTone(doc.type)}`}
                        aria-hidden="true"
                      >
                        <FileText className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 group-hover:text-brand-800 truncate">
                          {doc.title}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 min-w-0">
                          <span className="font-medium text-slate-700 truncate">{doc.patientName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="shrink-0 hidden sm:inline">{doc.type}</span>
                          <span aria-hidden="true" className="hidden sm:inline">·</span>
                          <span className="shrink-0 tabular-nums">{doc.displayDate}</span>
                        </span>
                      </span>
                    </span>

                    <span className="text-right shrink-0">
                      {doc.completenessStatus === 'complete' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Incomplete
                        </span>
                      )}
                      <span className="block text-[11px] text-slate-400 mt-0.5 tabular-nums">
                        OCR {doc.confidenceScore}%
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
