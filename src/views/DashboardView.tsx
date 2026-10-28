import React from 'react';
import { useClinic } from '../context/ClinicContext';
import {
  FileText,
  AlertTriangle,
  Clock,
  Users,
  Upload,
  Search,
  ArrowRight,
  CheckCircle,
  FileSearch,
  ShieldCheck,
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

  return (
    <div className="space-y-8 pb-12">
      {/* Clinic Welcome & Role Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
            <span>Dalisay Dental Studio · Manila</span>
            <span aria-hidden="true">·</span>
            <span>Document Hub</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome, {currentUser.name}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Signed in as <span className="font-medium text-slate-700">{currentUser.title}</span>.{' '}
            {currentUser.role === 'front_desk'
              ? 'Showing Billing & Appointment records.'
              : 'Managing clinical documents, radiographs, and patient charts.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigateTo('upload')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
          <button
            onClick={() => navigateTo('search')}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search Records</span>
          </button>
        </div>
      </div>

      {/* Clinical & Missing Document Alerts Section */}
      {alerts.length > 0 ? (
        <div className="bg-white border border-rose-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    Clinical & Missing Document Alerts
                  </h2>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-200">
                    {alerts.length} Action{alerts.length > 1 ? 's' : ''} Needed
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Scheduled procedures lacking signed consents, expiring medical clearances, or missing regulatory licenses
                </p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">
              Staff safety & legal compliance monitor
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  alert.severity === 'critical'
                    ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                    : 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                        alert.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {alert.severity === 'critical' ? 'Urgent Missing Doc' : 'Expiring Soon'}
                    </span>
                    {alert.scheduledDate && (
                      <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{alert.scheduledDate}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                    {alert.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-2">
                    <span className="font-semibold text-slate-800">{alert.patientName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{alert.patientRecordNo}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                    {alert.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  {alert.linkedDocId ? (
                    <button
                      onClick={() => handleOpenDoc(alert.linkedDocId!, alert.patientId)}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 transition-colors flex items-center gap-1"
                    >
                      <span>{alert.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedPatientId(alert.patientId);
                        navigateTo('upload', { patientId: alert.patientId });
                      }}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 transition-colors flex items-center gap-1"
                    >
                      <span>Upload Missing Form</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedPatientId(alert.patientId);
                      navigateTo('patients', { patientId: alert.patientId });
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-800 underline"
                  >
                    View Chart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  No Active Clinical or Compliance Alerts
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  All Clear
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                All scheduled procedures have signed consent forms, valid medical clearances, and recent radiographs.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigateTo('patients')}
            className="px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            Review Patient Vault
          </button>
        </div>
      )}

      {/* KPI Metric Highlights Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Incomplete Documents */}
        <div
          onClick={() => navigateTo('incomplete')}
          className="bg-white border border-amber-200/80 rounded-xl p-5 hover:border-amber-300 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-900">Flagged Incomplete</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 group-hover:text-amber-700 transition-colors">
              {incompleteDocs.length}
            </span>
            <span className="text-xs text-amber-700 font-medium">Missing signatures/data</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1 group-hover:text-slate-700">
            <span>Triage queue</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Metric 2: Needs Staff Review */}
        <div
          onClick={() => navigateTo('search', { filterStatus: 'needs_review' })}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-300 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-700">Needs Review / Low Conf</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 group-hover:text-teal-700 transition-colors">
              {reviewNeededDocs.length}
            </span>
            <span className="text-xs text-slate-500">Requires verification</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1 group-hover:text-slate-700">
            <span>Inspect candidates</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Metric 3: Total Accessible Documents */}
        <div
          onClick={() => navigateTo('search')}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-700">Accessible Documents</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {visibleDocuments.length}
            </span>
            <span className="text-xs text-slate-500">Total in vault</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <span>Browse index</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Metric 4: Active Clinic Patients */}
        <div
          onClick={() => navigateTo('patients')}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-700">Active Patients</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {patients.length}
            </span>
            <span className="text-xs text-slate-500">Registered records</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <span>View directory</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>
      </div>

      {/* Two Column Layout: Urgent Incomplete Queue & Recently Uploaded Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Urgent Incomplete Triage Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Documents Flagged Incomplete ({incompleteDocs.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Action required before clinical or insurance sign-off
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {incompleteDocs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">All documents complete!</p>
                <p className="text-xs text-slate-500 mt-1 mb-3">No missing signatures or fields detected.</p>
                <button
                  type="button"
                  onClick={() => navigateTo('search', { filterStatus: 'complete' })}
                  className="px-3.5 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer"
                >
                  Browse Completed Records
                </button>
              </div>
            ) : (
              incompleteDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleOpenDoc(doc.id, doc.patientId)}
                  className="bg-white border border-amber-200/90 hover:border-amber-400 rounded-xl p-4 transition-all cursor-pointer group shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-mono font-medium text-slate-700">
                          {doc.patientRecordNo}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{doc.patientName}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-1">
                        {doc.title}
                      </h3>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span>{doc.type}</span>
                        <span aria-hidden="true">·</span>
                        <span>{doc.displayDate}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200 shrink-0">
                      Incomplete
                    </span>
                  </div>

                  {/* Missing items checklist snippet */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-amber-900 space-y-1 bg-amber-50/50 p-2 rounded-lg">
                    <p className="font-medium text-amber-800">Missing Items:</p>
                    {doc.missingFields.slice(0, 2).map((field, idx) => (
                      <p key={idx} className="flex items-start gap-1 text-[11px] text-amber-700">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{field}</span>
                      </p>
                    ))}
                    {doc.missingFields.length > 2 && (
                      <p className="text-[10px] text-amber-600 italic">
                        +{doc.missingFields.length - 2} more missing item(s)
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recently Uploaded Documents (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recently Uploaded Documents</h2>
              <p className="text-xs text-slate-500">
                Latest processed dental scans, receipts, and clinical notes
              </p>
            </div>
            <button
              onClick={() => navigateTo('search')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              <span>View all ({visibleDocuments.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
            {recentDocs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">No documents found in vault</p>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Upload a dental record or receipt to begin building your clinical archive.
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo('upload')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
                >
                  Upload First Document
                </button>
              </div>
            ) : (
              recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleOpenDoc(doc.id, doc.patientId)}
                  className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer group flex items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        doc.type === 'X-ray'
                          ? 'bg-neutral-900 text-teal-400'
                          : doc.type === 'Billing/Receipt'
                          ? 'bg-emerald-50 text-emerald-700'
                          : doc.type === 'Prescription'
                          ? 'bg-indigo-50 text-indigo-700'
                          : doc.type === 'Consent Form'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-teal-50 text-teal-700'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-teal-800 transition-colors truncate">
                        {doc.title}
                      </h3>
                      {/* Zero-Pill Unboxed Metadata with · separator */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span className="font-medium text-slate-700">{doc.patientName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-600">{doc.patientRecordNo}</span>
                        <span aria-hidden="true">·</span>
                        <span>{doc.type}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{doc.displayDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      {doc.completenessStatus === 'complete' ? (
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Complete
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Incomplete
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                      OCR: {doc.confidenceScore}% conf
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick upload trigger card */}
          <div className="bg-teal-50/60 border border-teal-200/80 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
                <FileSearch className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-teal-950">Have a new paper record or radiograph?</p>
                <p className="text-[11px] text-teal-800">
                  Drop it into the guided OCR ingestion pipeline for instant tooth & procedure extraction.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigateTo('upload')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shrink-0 transition-colors shadow-xs"
            >
              Start Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
