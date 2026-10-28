import React, { useState, useEffect } from 'react';
import { useClinic } from '../context/ClinicContext';
import { DocumentType, CompletenessStatus, DentalDocument } from '../types/dental';
import { searchDocumentsAsync } from '../data/clinicApi';
import { DocumentListSkeleton } from '../components/Skeletons';
import {
  Search,
  Filter,
  FileText,
  Calendar,
  User,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export const SearchView: React.FC = () => {
  const {
    visibleDocuments,
    patients,
    navigateTo,
    setSelectedDocumentId,
    searchFilterInitial,
  } = useClinic();

  const [query, setQuery] = useState(searchFilterInitial.query || '');
  const [selectedType, setSelectedType] = useState<DocumentType | 'ALL'>(
    searchFilterInitial.type || 'ALL'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(
    searchFilterInitial.status || 'ALL'
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [selectedTooth, setSelectedTooth] = useState<string>('ALL');

  const [results, setResults] = useState<DentalDocument[]>(visibleDocuments);
  const [isSearching, setIsSearching] = useState(false);

  // Sync if context passes initial filters
  useEffect(() => {
    if (searchFilterInitial.query) setQuery(searchFilterInitial.query);
    if (searchFilterInitial.type) setSelectedType(searchFilterInitial.type);
    if (searchFilterInitial.status) setSelectedStatus(searchFilterInitial.status);
  }, [searchFilterInitial]);

  // Route search through async data layer
  useEffect(() => {
    let active = true;
    setIsSearching(true);
    searchDocumentsAsync(
      visibleDocuments,
      query,
      {
        type: selectedType,
        status: selectedStatus,
        patientId: selectedPatientId,
        tooth: selectedTooth,
        date: selectedDateFilter,
      },
      200
    ).then((res) => {
      if (active) {
        setResults(res);
        setIsSearching(false);
      }
    });

    return () => {
      active = false;
    };
  }, [
    visibleDocuments,
    query,
    selectedType,
    selectedStatus,
    selectedPatientId,
    selectedTooth,
    selectedDateFilter,
  ]);

  const handleOpenDoc = (docId: string, patientId: string) => {
    setSelectedDocumentId(docId);
    navigateTo('viewer', { documentId: docId, patientId });
  };

  const resetFilters = () => {
    setQuery('');
    setSelectedType('ALL');
    setSelectedStatus('ALL');
    setSelectedPatientId('ALL');
    setSelectedDateFilter('ALL');
    setSelectedTooth('ALL');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
          <span>Search & Discovery</span>
          <span aria-hidden="true">·</span>
          <span>Philippine Dental Archive</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Intelligent Dental Search
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Search across 30 documents using natural language, Philippine clinical terms, patient names,
          or FDI tooth numbers.
        </p>

        {/* Natural Language Search Input Bar */}
        <div className="mt-5 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: 'incomplete consent', 'tooth 46 x-ray', 'Dela Cruz', 'amoxicillin reseta'..."
            className="w-full pl-12 pr-28 py-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick prompt suggestions */}
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1 font-medium text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Suggestions:
          </span>
          <button
            onClick={() => setQuery('incomplete')}
            className="hover:text-teal-800 hover:underline"
          >
            "incomplete"
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => setQuery('tooth 46')}
            className="hover:text-teal-800 hover:underline"
          >
            "tooth 46"
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => setQuery('minor consent')}
            className="hover:text-teal-800 hover:underline"
          >
            "minor consent"
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => setQuery('reseta')}
            className="hover:text-teal-800 hover:underline"
          >
            "reseta"
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => setQuery('HealthShield')}
            className="hover:text-teal-800 hover:underline"
          >
            "HealthShield"
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>Faceted Filters</span>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-teal-700 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Filter 1: Document Type */}
          <div>
            <label className="text-slate-500 block mb-1">Document Type:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Types</option>
              <option value="Patient Record">Patient Record</option>
              <option value="X-ray">X-ray</option>
              <option value="Treatment Plan">Treatment Plan</option>
              <option value="Prescription">Prescription</option>
              <option value="Consent Form">Consent Form</option>
              <option value="Laboratory Report">Laboratory Report</option>
              <option value="Billing/Receipt">Billing/Receipt</option>
              <option value="Appointment Record">Appointment Record</option>
            </select>
          </div>

          {/* Filter 2: Completeness Status */}
          <div>
            <label className="text-slate-500 block mb-1">Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="complete">Complete</option>
              <option value="incomplete">Incomplete Only</option>
              <option value="needs_review">Needs Staff Review</option>
            </select>
          </div>

          {/* Filter 3: Patient */}
          <div>
            <label className="text-slate-500 block mb-1">Patient:</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Patients (12)</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.recordNo} · {p.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 4: Date Range */}
          <div>
            <label className="text-slate-500 block mb-1">Date Range:</label>
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Recorded Dates</option>
              <option value="OCT_2026">October 2026 (Current Month)</option>
            </select>
          </div>

          {/* Filter 5: FDI Tooth */}
          <div>
            <label className="text-slate-500 block mb-1">FDI Tooth Number:</label>
            <select
              value={selectedTooth}
              onChange={(e) => setSelectedTooth(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
            >
              <option value="ALL">Any Tooth</option>
              <option value="11">Tooth 11 (Maxillary Central)</option>
              <option value="21">Tooth 21 (Maxillary Central)</option>
              <option value="16">Tooth 16 (Maxillary 1st Molar)</option>
              <option value="36">Tooth 36 (Mandibular 1st Molar)</option>
              <option value="46">Tooth 46 (Mandibular 1st Molar)</option>
              <option value="47">Tooth 47 (Mandibular 2nd Molar)</option>
              <option value="48">Tooth 48 (Mandibular 3rd Molar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search Results Summary & Listing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <p>
            {isSearching ? (
              <span className="flex items-center gap-2 text-teal-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping" />
                Querying clinic vault...
              </span>
            ) : (
              <>
                Found <strong className="text-slate-900 font-bold font-mono">{results.length}</strong>{' '}
                matching document{results.length === 1 ? '' : 's'}
              </>
            )}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
          {isSearching ? (
            <DocumentListSkeleton count={4} />
          ) : results.length > 0 ? (
            results.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleOpenDoc(doc.id, doc.patientId)}
                className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      doc.type === 'X-ray'
                        ? 'bg-neutral-900 text-teal-400'
                        : doc.type === 'Billing/Receipt'
                        ? 'bg-emerald-50 text-emerald-700'
                        : doc.type === 'Consent Form'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-teal-50 text-teal-700'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="font-mono font-medium text-slate-700">
                        {doc.patientRecordNo}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-slate-800">{doc.patientName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{doc.type}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{doc.displayDate}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                      {doc.title}
                    </h3>

                    {/* Snippet preview */}
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {doc.extractedText.slice(0, 160)}...
                    </p>

                    {/* Unboxed tags */}
                    {doc.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5 flex-wrap">
                        {doc.tags.slice(0, 4).map((t, idx) => (
                          <span key={idx} className="after:content-['·'] after:ml-1.5 last:after:content-none">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <div className="text-right">
                    {doc.completenessStatus === 'incomplete' ? (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                        Incomplete ({doc.missingFields.length})
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Complete
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400 block mt-1">
                      OCR: {doc.confidenceScore}% conf
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-sm text-slate-500">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">No matching records found</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {query
                  ? `No documents matched "${query}". Try searching for general terms like "xray", "consent", "reseta", or clearing active filters.`
                  : 'No documents match the active filter criteria.'}
              </p>
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
