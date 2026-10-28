import React, { useState, useEffect } from 'react';
import { useClinic } from '../context/ClinicContext';
import {
  DocumentType,
  ProcedureCategory,
  CompletenessStatus,
  DocumentVersion,
  DentalDocument,
} from '../types/dental';
import { DocumentVisualPreview } from '../components/DocumentVisualPreview';
import { AccessRestricted } from '../components/AccessRestricted';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DocumentViewerSkeleton } from '../components/Skeletons';
import { fetchDocumentById } from '../data/clinicApi';
import {
  evaluateDocumentChecklist,
  DOCUMENT_REQUIREMENTS,
} from '../data/completenessRequirements';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Save,
  Tag,
  User,
  History,
  FileText,
  Lock,
  UserCheck,
  X,
  ShieldAlert,
  GitBranch,
  RotateCcw,
  Upload,
  Plus,
  Split,
  Eye,
  Layers,
  FileUp,
} from 'lucide-react';

export const DocumentViewerView: React.FC = () => {
  const {
    documents,
    visibleDocuments,
    selectedDocumentId,
    setSelectedDocumentId,
    currentUser,
    canAccessClinicalDocs,
    canDeleteDocs,
    updateDocument,
    deleteDocument,
    resolveIncompleteDocument,
    uploadNewVersion,
    restoreVersion,
    navigateTo,
    auditLogs,
  } = useClinic();

  const [loadingDoc, setLoadingDoc] = useState(true);
  const [activeDoc, setActiveDoc] = useState<DentalDocument | null>(null);

  // Sync and route through async data layer
  useEffect(() => {
    let isCurrent = true;
    setLoadingDoc(true);
    const targetId = selectedDocumentId || visibleDocuments[0]?.id;
    if (!targetId) {
      setActiveDoc(null);
      setLoadingDoc(false);
      return;
    }

    fetchDocumentById(targetId, documents, 240).then((found) => {
      if (isCurrent) {
        setActiveDoc(found);
        if (found) {
          setEditedTitle(found.title);
          setEditedType(found.type);
          setEditedProcedure(found.procedureCategory);
          setEditedTeeth(found.toothNumbers.join(', '));
          setEditedTags(found.tags);
          setSaveSuccessMsg(false);

          setRevisedTitle(found.title);
          setRevisedFileType(found.fileType);
          setRevisedTeeth(found.toothNumbers.join(', '));
          setRevisedProcedure(found.procedureCategory);
          setRevisedTags(found.tags);
          setRevisedText(found.extractedText);
          setRevisedChangeSummary('');
          setRevisedSummaryError('');
        }
        setLoadingDoc(false);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [selectedDocumentId, documents, visibleDocuments]);

  // Fallback doc for reference before activeDoc resolves
  const doc = activeDoc;

  // Local state for editing fields
  const [editedTitle, setEditedTitle] = useState('');
  const [editedType, setEditedType] = useState<DocumentType>('Patient Record');
  const [editedProcedure, setEditedProcedure] = useState<ProcedureCategory>('Restorative');
  const [editedTeeth, setEditedTeeth] = useState<string>('');
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [activeTab, setActiveTab] = useState<'metadata' | 'text' | 'versions' | 'audit'>('metadata');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [resolveNoteError, setResolveNoteError] = useState('');

  // Confirmation dialogs
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);

  // Versioning state
  const [isUploadRevisionOpen, setIsUploadRevisionOpen] = useState(false);
  const [revisedTitle, setRevisedTitle] = useState('');
  const [revisedFileType, setRevisedFileType] = useState<'PDF' | 'JPG' | 'PNG'>('PDF');
  const [revisedChangeSummary, setRevisedChangeSummary] = useState('');
  const [revisedSummaryError, setRevisedSummaryError] = useState('');
  const [revisedTeeth, setRevisedTeeth] = useState('');
  const [revisedProcedure, setRevisedProcedure] = useState<ProcedureCategory>('Restorative');
  const [revisedTags, setRevisedTags] = useState<string[]>([]);
  const [revisedText, setRevisedText] = useState('');

  // Compare versions modal state
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareTargetVersion, setCompareTargetVersion] = useState<DocumentVersion | null>(null);

  // Restore version modal state
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreTargetVersion, setRestoreTargetVersion] = useState<DocumentVersion | null>(null);
  const [restoreNote, setRestoreNote] = useState('');
  const [restoreNoteError, setRestoreNoteError] = useState('');

  if (loadingDoc) {
    return <DocumentViewerSkeleton />;
  }

  // If Front Desk tries to view a clinical document
  if (doc && currentUser.role === 'front_desk' && doc.type !== 'Billing/Receipt' && doc.type !== 'Appointment Record') {
    return (
      <AccessRestricted
        requiredRole="Dentist or Admin"
        reason={`As Front Desk, you are not authorized to view clinical ${doc.type} files for ${doc.patientName}. You may only access Billing/Receipts and Appointment records.`}
      />
    );
  }

  if (!doc) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto">
        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">No Document Selected</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Please select a document from the Dashboard, Patient vault, or Search results.
        </p>
        <button
          onClick={() => navigateTo('dashboard')}
          className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Document navigation index
  const currentIndex = visibleDocuments.findIndex((d) => d.id === doc.id);
  const prevDoc = currentIndex > 0 ? visibleDocuments[currentIndex - 1] : null;
  const nextDoc = currentIndex < visibleDocuments.length - 1 ? visibleDocuments[currentIndex + 1] : null;

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    if (!editedTags.includes(newTagInput.trim())) {
      const updated = [...editedTags, newTagInput.trim()];
      setEditedTags(updated);
      updateDocument(doc.id, { tags: updated });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = editedTags.filter((t) => t !== tagToRemove);
    setEditedTags(updated);
    updateDocument(doc.id, { tags: updated });
  };

  const handleSaveAllChanges = () => {
    const parsedTeeth = editedTeeth
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));

    updateDocument(doc.id, {
      title: editedTitle,
      type: editedType,
      procedureCategory: editedProcedure,
      toothNumbers: parsedTeeth,
      tags: editedTags,
    });

    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const docAuditLogs = auditLogs.filter((a) => a.targetId === doc.id);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar: Back button, Title, Versioning info, Revision Upload & Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div>
          <button
            onClick={() => navigateTo('patients', { patientId: doc.patientId })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Patient Vault ({doc.patientName})</span>
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {doc.title}
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {doc.patientRecordNo}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>v{doc.version} Active</span>
            </span>
            {(doc.versionHistory?.length || 0) > 0 && (
              <button
                onClick={() => setActiveTab('versions')}
                className="text-xs font-mono text-slate-500 hover:text-teal-700 underline flex items-center gap-1"
                title="View superseded historical versions"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>{doc.versionHistory.length} superseded version{doc.versionHistory.length > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
          {/* Zero-Pill Unboxed Metadata */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
            <span className="font-semibold text-slate-700">{doc.patientName}</span>
            <span aria-hidden="true">·</span>
            <span>{doc.type}</span>
            <span aria-hidden="true">·</span>
            <span>{doc.procedureCategory}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{doc.displayDate}</span>
          </div>
        </div>

        {/* Action button & Previous / Next buttons */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => {
              setRevisedTitle(doc.title);
              setRevisedFileType(doc.fileType);
              setRevisedTeeth(doc.toothNumbers.join(', '));
              setRevisedProcedure(doc.procedureCategory);
              setRevisedTags(doc.tags);
              setRevisedText(doc.extractedText);
              setRevisedChangeSummary('');
              setRevisedSummaryError('');
              setIsUploadRevisionOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            title="Upload a new revised version (e.g. signed consent, clearer scan, updated prescription)"
          >
            <Upload className="w-3.5 h-3.5 text-teal-700" />
            <span>Upload Revision</span>
          </button>

          <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
            <button
              disabled={!prevDoc}
              onClick={() => prevDoc && setSelectedDocumentId(prevDoc.id)}
              className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1 ${
                prevDoc
                  ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
              }`}
              title="Previous document"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <span className="text-xs font-mono text-slate-500 px-1">
              {currentIndex + 1} of {visibleDocuments.length}
            </span>

            <button
              disabled={!nextDoc}
              onClick={() => nextDoc && setSelectedDocumentId(nextDoc.id)}
              className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1 ${
                nextDoc
                  ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  : 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
              }`}
              title="Next document"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Pane View: Document Preview on Left, Extracted Metadata on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Pane: Document Visual Preview (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <DocumentVisualPreview document={doc} heightClass="min-h-[640px]" />

          {/* Quick status pill under preview */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-2">
            <span>Uploaded: {doc.uploadedAt} by {doc.uploadedBy}</span>
            <span className="font-mono">OCR Score: {doc.confidenceScore}%</span>
          </div>
        </div>

        {/* Right Pane: Extracted Metadata & Role Controls (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
          {/* Tab selector: Metadata & Tags | Extracted Text | Version History | Audit Log */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setActiveTab('metadata')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'metadata'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Metadata & Tags
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'text'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Extracted Text
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-1 ${
                activeTab === 'versions'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Versions (v{doc.version})</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audit Trail ({docAuditLogs.length})
            </button>
          </div>

          {/* TAB 1: METADATA & TAGS */}
          {activeTab === 'metadata' && (
            <div className="space-y-5">
              {/* Enhanced Completeness Checker Card */}
              {(() => {
                const { requirement, checklist, foundCount, totalCount, completenessPercentage } =
                  evaluateDocumentChecklist(doc);

                return (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-3 ${
                      doc.completenessStatus === 'incomplete'
                        ? 'bg-rose-50/60 border-rose-300 text-rose-950'
                        : doc.completenessStatus === 'needs_review'
                        ? 'bg-amber-50/60 border-amber-300 text-amber-950'
                        : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    {/* Status Badge & Actions Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-bold">
                      <div className="flex items-center gap-2">
                        {/* Status Badge: Complete, Needs Review, or Incomplete */}
                        {doc.completenessStatus === 'complete' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold font-mono text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Complete</span>
                          </span>
                        ) : doc.completenessStatus === 'needs_review' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold font-mono text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Needs Review</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 font-bold font-mono text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                            <span>Incomplete</span>
                          </span>
                        )}

                        <span className="text-slate-800 font-semibold text-xs">
                          {doc.type} Compliance Checklist
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {doc.completenessStatus !== 'complete' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsResolveModalOpen(true);
                              setResolveNote('');
                              setResolveNoteError('');
                            }}
                            className="px-3 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-[11px] transition-colors shadow-xs flex items-center gap-1"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Mark as Resolved</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              updateDocument(doc.id, {
                                completenessStatus: 'incomplete',
                                missingFields: ['Staff manually re-opened for audit'],
                                resolutionNote: undefined,
                              });
                            }}
                            className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                          >
                            Re-flag as Incomplete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* AI Suggestion Disclaimer */}
                    <div className="text-[11px] text-slate-600 bg-white/70 p-2 rounded-lg border border-slate-200/60 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        <span>Flags are AI suggestions that staff must verify.</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {foundCount}/{totalCount} items verified
                      </span>
                    </div>

                    {/* Checklist of Required Fields */}
                    <div className="space-y-1 pt-1">
                      <p className="font-semibold text-slate-700 text-[11px]">
                        Required Fields for {doc.type}:
                      </p>
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {checklist.map((c, idx) => (
                          <div
                            key={idx}
                            className={`flex items-start justify-between p-1.5 rounded-lg text-[11px] ${
                              c.found
                                ? 'bg-white/80 text-slate-700'
                                : 'bg-rose-100/70 text-rose-950 font-medium border border-rose-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {c.found ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              )}
                              <span>{c.field.label}</span>
                            </div>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                c.found ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-white'
                              }`}
                            >
                              {c.found ? 'Found' : 'Missing'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resolution Note if resolved */}
                    {doc.resolutionNote && (
                      <div className="p-2.5 bg-emerald-100/50 border border-emerald-300 rounded-lg text-[11px] space-y-0.5 text-emerald-950">
                        <p className="font-semibold flex items-center justify-between">
                          <span>Staff Resolution Verified by {doc.resolvedBy}</span>
                          <span className="font-mono text-[10px] text-emerald-800">{doc.resolvedAt}</span>
                        </p>
                        <p className="italic text-emerald-900">"{doc.resolutionNote}"</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 1. Document Type Switcher (1-Click) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Document Type (1-Click Change):
                </label>
                <select
                  value={editedType}
                  onChange={(e) => {
                    const newType = e.target.value as DocumentType;
                    setEditedType(newType);
                    updateDocument(doc.id, { type: newType });
                  }}
                  className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
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

              {/* 2. Procedure Category */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Procedure Category:
                </label>
                <select
                  value={editedProcedure}
                  onChange={(e) => {
                    const newProc = e.target.value as ProcedureCategory;
                    setEditedProcedure(newProc);
                    updateDocument(doc.id, { procedureCategory: newProc });
                  }}
                  className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Restorative">Restorative</option>
                  <option value="Endodontics">Endodontics</option>
                  <option value="Oral Surgery">Oral Surgery</option>
                  <option value="Orthodontics">Orthodontics</option>
                  <option value="Prosthodontics">Prosthodontics</option>
                  <option value="Periodontics">Periodontics</option>
                  <option value="Preventive">Preventive</option>
                  <option value="Billing & Administrative">Billing & Administrative</option>
                </select>
              </div>

              {/* 3. FDI Tooth Numbers */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Involved FDI Teeth (Comma Separated):
                </label>
                <input
                  type="text"
                  value={editedTeeth}
                  onChange={(e) => setEditedTeeth(e.target.value)}
                  placeholder="e.g. 16, 26, 46"
                  className="w-full text-xs font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* 4. Tags Management */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tags & Clinical Annotations:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-700"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add new tag (e.g. HMO Approved, Maxicare)..."
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Save All Changes button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {saveSuccessMsg && (
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Changes saved!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {canDeleteDocs ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  ) : (
                    <span
                      title="Role Restriction: Dental Assistants and Front Desk cannot delete records."
                      className="text-[11px] text-slate-400 flex items-center gap-1 cursor-not-allowed px-2 py-1"
                    >
                      <Lock className="w-3 h-3" /> Delete locked
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveAllChanges}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXTRACTED TEXT */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>OCR Extracted Text Buffer</span>
                <span className="font-mono">Characters: {doc.extractedText.length}</span>
              </div>
              <textarea
                value={doc.extractedText}
                readOnly
                rows={14}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 italic">
                Extracted using simulated Philippine dental template heuristics
              </p>
            </div>
          )}

          {/* TAB 3: VERSION HISTORY */}
          {activeTab === 'versions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-teal-700" />
                    <span>Document Version History</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Chronological audit trail of revisions with rollback and diff capabilities
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadRevisionOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Revision</span>
                </button>
              </div>

              {/* Current Active Version Card */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                      v{doc.version}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span>Active Clinical Version</span>
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-800">{doc.uploadedAt}</span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900">{doc.title}</p>
                  <div className="flex items-center gap-2 text-slate-600 flex-wrap">
                    <span>Uploaded by: <strong className="text-slate-800">{doc.uploadedBy}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Format: <strong className="font-mono text-slate-800">{doc.fileType} ({doc.fileSize})</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>FDI Teeth: <strong className="font-mono text-slate-800">{doc.toothNumbers.join(', ') || 'General'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 text-xs">
                  <span className="text-[11px] text-emerald-800 font-medium">
                    This is the currently served document record.
                  </span>
                  {doc.versionHistory && doc.versionHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompareTargetVersion(doc.versionHistory[0]);
                        setIsCompareModalOpen(true);
                      }}
                      className="text-xs font-semibold text-teal-800 hover:text-teal-950 flex items-center gap-1 underline"
                    >
                      <Split className="w-3.5 h-3.5" />
                      <span>Compare with v{doc.versionHistory[0].versionNumber}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Superseded Versions Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-1">
                  <span>Superseded Revisions ({doc.versionHistory?.length || 0})</span>
                  <span>Archived for Legal Audit</span>
                </div>

                {doc.versionHistory && doc.versionHistory.length > 0 ? (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {doc.versionHistory.map((ver) => (
                      <div
                        key={ver.versionNumber}
                        className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                              v{ver.versionNumber}
                            </span>
                            <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              Superseded
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            Archived: {ver.supersededAt || ver.uploadedAt}
                          </span>
                        </div>

                        <div>
                          <p className="font-bold text-slate-800">{ver.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Uploaded: {ver.uploadedAt} by {ver.uploadedBy}
                          </p>
                          {ver.supersededBy && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5">
                              Superseded by: {ver.supersededBy}
                            </p>
                          )}
                        </div>

                        {/* Change summary quote */}
                        {ver.changeSummary && (
                          <div className="p-2 bg-white rounded-lg border border-slate-200/80 text-[11px] text-slate-700 italic">
                            <span className="font-semibold text-slate-800 not-italic">Change Reason: </span>
                            "{ver.changeSummary}"
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-mono">{ver.fileType}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{ver.fileSize}</span>
                            <span aria-hidden="true">·</span>
                            <span>Teeth: {ver.toothNumbers.join(', ') || 'None'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCompareTargetVersion(ver);
                                setIsCompareModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Compare this superseded version with active version"
                            >
                              <Split className="w-3 h-3 text-slate-500" />
                              <span>Compare</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRestoreTargetVersion(ver);
                                setRestoreNote(`Reverted to historical draft v${ver.versionNumber} following clinical review.`);
                                setRestoreNoteError('');
                                setIsRestoreModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Roll back and restore this version as new active draft"
                            >
                              <RotateCcw className="w-3 h-3 text-teal-700" />
                              <span>Restore</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                    <History className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700 text-xs">No superseded revisions yet</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                      This document is currently on its initial release (v1). Upload a revised draft (e.g. countersigned consent, clearer radiograph, or updated prescription) to maintain an audit trail.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsUploadRevisionOpen(true)}
                      className="mt-2 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload Revision v2</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Full chronological history of actions on this document
              </p>
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {docAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-800">{log.userName}</span>
                      <span className="font-mono">{log.timestamp}</span>
                    </div>
                    <p className="text-slate-700">{log.details}</p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                      {log.action}
                    </span>
                  </div>
                ))}

                {docAuditLogs.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No specific audit entries recorded for this document yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resolution Modal */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl relative">
            <button
              onClick={() => setIsResolveModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
                <span>Staff Sign-Off</span>
                <span aria-hidden="true">·</span>
                <span>Verification Override</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Resolve Completeness Flag
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                You are marking "{doc.title}" as complete. A staff resolution note is mandatory.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!resolveNote.trim()) {
                  setResolveNoteError('A staff verification note is mandatory before marking a document complete.');
                  return;
                }
                resolveIncompleteDocument(doc.id, resolveNote.trim());
                setIsResolveModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1.5 flex items-center justify-between">
                  <span>Mandatory Staff Resolution Note:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Logged to Audit Trail</span>
                </label>
                <textarea
                  value={resolveNote}
                  onChange={(e) => {
                    setResolveNote(e.target.value);
                    if (resolveNoteError) setResolveNoteError('');
                  }}
                  rows={3}
                  placeholder="e.g. 'Physically verified signed consent form on file in paper chart', 'PRC license validated with Board registry'..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                />
                {resolveNoteError && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{resolveNoteError}</p>
                )}
              </div>

              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 text-xs text-teal-950 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-teal-800 block uppercase font-semibold">Signatory Staff</span>
                  <span className="font-bold">{currentUser.name}</span>
                  <span className="text-[11px] text-teal-800 block">{currentUser.title}</span>
                </div>
                <span className="text-[10px] font-mono text-teal-700">Timestamp: Now</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Resolution & Mark Complete</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: Upload New Revision (New Version) */}
      {isUploadRevisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl relative my-8">
            <button
              onClick={() => setIsUploadRevisionOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
                <GitBranch className="w-3.5 h-3.5" />
                <span>Document Revisions</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">Publishing v{doc.version + 1}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Upload New Document Revision
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload or record an updated file. Active version <span className="font-semibold text-slate-700 font-mono">v{doc.version}</span> will be marked as <span className="font-semibold text-amber-800 font-mono">Superseded</span> and preserved for legal auditing.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!revisedChangeSummary.trim()) {
                  setRevisedSummaryError('A change summary or reason for revision is required.');
                  return;
                }

                const parsedTeeth = revisedTeeth
                  .split(',')
                  .map((s) => parseInt(s.trim()))
                  .filter((n) => !isNaN(n));

                uploadNewVersion(doc.id, {
                  title: revisedTitle.trim() || doc.title,
                  fileType: revisedFileType,
                  fileSize: '1.9 MB (Revised)',
                  extractedText: revisedText,
                  toothNumbers: parsedTeeth,
                  procedureCategory: revisedProcedure,
                  tags: revisedTags,
                  changeSummary: revisedChangeSummary.trim(),
                  completenessStatus: 'complete',
                });

                setIsUploadRevisionOpen(false);
                setActiveTab('versions');
              }}
              className="space-y-4"
            >
              {/* Mandatory Change Reason */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5">
                <label className="text-xs font-bold text-amber-950 flex items-center justify-between">
                  <span>Mandatory Revision Summary / Reason for Change:</span>
                  <span className="text-[10px] text-amber-800 font-normal">Logged to Audit Trail</span>
                </label>
                <textarea
                  value={revisedChangeSummary}
                  onChange={(e) => {
                    setRevisedChangeSummary(e.target.value);
                    if (revisedSummaryError) setRevisedSummaryError('');
                  }}
                  rows={2}
                  placeholder="e.g. 'Obtained signed guardian consent from Mrs. Lim', 'Re-scanned periapical radiograph with corrected angulation', 'Updated prescription dosage'..."
                  className="w-full text-xs bg-white border border-amber-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                />
                {revisedSummaryError && (
                  <p className="text-[11px] text-rose-600 font-medium">{revisedSummaryError}</p>
                )}
              </div>

              {/* Revision Title */}
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Document Title:
                </label>
                <input
                  type="text"
                  value={revisedTitle}
                  onChange={(e) => setRevisedTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                />
              </div>

              {/* File Type & Simulated Drop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-800 block mb-1">
                    File Format:
                  </label>
                  <select
                    value={revisedFileType}
                    onChange={(e) => setRevisedFileType(e.target.value as 'PDF' | 'JPG' | 'PNG')}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                  >
                    <option value="PDF">PDF (Clinical Document)</option>
                    <option value="JPG">JPG (Radiograph / Photo)</option>
                    <option value="PNG">PNG (High-Res Scan)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-800 block mb-1">
                    Procedure Category:
                  </label>
                  <select
                    value={revisedProcedure}
                    onChange={(e) => setRevisedProcedure(e.target.value as ProcedureCategory)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                  >
                    <option value="Restorative">Restorative</option>
                    <option value="Endodontics">Endodontics</option>
                    <option value="Oral Surgery">Oral Surgery</option>
                    <option value="Orthodontics">Orthodontics</option>
                    <option value="Prosthodontics">Prosthodontics</option>
                    <option value="Periodontics">Periodontics</option>
                    <option value="Preventive">Preventive</option>
                    <option value="Billing & Administrative">Billing & Administrative</option>
                  </select>
                </div>
              </div>

              {/* FDI Teeth */}
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Involved FDI Teeth (Comma Separated):
                </label>
                <input
                  type="text"
                  value={revisedTeeth}
                  onChange={(e) => setRevisedTeeth(e.target.value)}
                  placeholder="e.g. 16, 26, 46"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                />
              </div>

              {/* Extracted Text Buffer */}
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1 flex items-center justify-between">
                  <span>Revised Extracted Text (OCR Buffer):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Editable for transcription adjustments</span>
                </label>
                <textarea
                  value={revisedText}
                  onChange={(e) => setRevisedText(e.target.value)}
                  rows={4}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                />
              </div>

              {/* Signatory Staff Banner */}
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 text-xs text-teal-950 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-teal-800 block uppercase font-semibold">Signatory Staff</span>
                  <span className="font-bold">{currentUser.name}</span>
                  <span className="text-[11px] text-teal-800 block">{currentUser.title}</span>
                </div>
                <span className="text-[10px] font-mono text-teal-700">Audit Status: Ready to Publish</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadRevisionOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Publish Revision v{doc.version + 1}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Compare Versions (Side-by-Side Diff) */}
      {isCompareModalOpen && compareTargetVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-5xl w-full p-6 shadow-xl relative my-6">
            <button
              onClick={() => {
                setIsCompareModalOpen(false);
                setCompareTargetVersion(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
                <Split className="w-4 h-4" />
                <span>Version Comparison & Diff</span>
                <span aria-hidden="true">·</span>
                <span>{doc.patientName}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Comparing v{compareTargetVersion.versionNumber} (Superseded) vs v{doc.version} (Active)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect field-by-field differences between historical draft and currently active record.
              </p>
            </div>

            {/* Comparison Side-by-Side Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Side: Historical Version (Superseded) */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      v{compareTargetVersion.versionNumber}
                    </span>
                    <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      Superseded
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Archived: {compareTargetVersion.supersededAt || compareTargetVersion.uploadedAt}
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Title</span>
                    <p className="font-semibold text-slate-800">{compareTargetVersion.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Procedure</span>
                      <p className="text-slate-700">{compareTargetVersion.procedureCategory}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Format / Size</span>
                      <p className="font-mono text-slate-700">{compareTargetVersion.fileType} ({compareTargetVersion.fileSize})</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">FDI Teeth</span>
                    <p className="font-mono text-slate-700">{compareTargetVersion.toothNumbers.join(', ') || 'None'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tags</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {compareTargetVersion.tags.map((t, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-mono">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {compareTargetVersion.changeSummary && (
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-700">
                      <span className="font-semibold text-slate-900 block mb-0.5">Change Note:</span>
                      <p className="italic">"{compareTargetVersion.changeSummary}"</p>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">OCR Buffer Text</span>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {compareTargetVersion.extractedText}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Active Version (Current) */}
              <div className="border border-emerald-300 rounded-xl p-4 bg-emerald-50/30 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                      v{doc.version}
                    </span>
                    <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Active Current
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-800">
                    Active: {doc.uploadedAt}
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Title</span>
                    <p className={`font-semibold ${doc.title !== compareTargetVersion.title ? 'text-teal-900 font-bold bg-teal-50 px-1 rounded' : 'text-slate-800'}`}>
                      {doc.title}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Procedure</span>
                      <p className={doc.procedureCategory !== compareTargetVersion.procedureCategory ? 'text-teal-900 font-bold bg-teal-50 px-1 rounded' : 'text-slate-700'}>
                        {doc.procedureCategory}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Format / Size</span>
                      <p className="font-mono text-slate-700">{doc.fileType} ({doc.fileSize})</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">FDI Teeth</span>
                    <p className={`font-mono ${doc.toothNumbers.join(',') !== compareTargetVersion.toothNumbers.join(',') ? 'text-teal-900 font-bold bg-teal-50 px-1 rounded' : 'text-slate-700'}`}>
                      {doc.toothNumbers.join(', ') || 'None'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tags</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {doc.tags.map((t, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-teal-100/70 text-teal-800 font-mono font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-2 bg-emerald-100/40 rounded-lg border border-emerald-200 text-[11px] text-emerald-950">
                    <span className="font-semibold block mb-0.5">Author / Signatory:</span>
                    <p>{doc.uploadedBy}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">OCR Buffer Text</span>
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200 font-mono text-[11px] text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {doc.extractedText}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Footer Actions */}
            <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsCompareModalOpen(false);
                  setRestoreTargetVersion(compareTargetVersion);
                  setRestoreNote(`Reverted to historical draft v${compareTargetVersion.versionNumber} following visual comparison with v${doc.version}.`);
                  setRestoreNoteError('');
                  setIsRestoreModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-teal-700" />
                <span>Roll Back & Restore v{compareTargetVersion.versionNumber}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCompareModalOpen(false);
                  setCompareTargetVersion(null);
                }}
                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Restore Historical Version */}
      {isRestoreModalOpen && restoreTargetVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl relative">
            <button
              onClick={() => {
                setIsRestoreModalOpen(false);
                setRestoreTargetVersion(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Version Rollback</span>
                <span aria-hidden="true">·</span>
                <span>Audit Enforced</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Restore Historical Draft v{restoreTargetVersion.versionNumber}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Restoring will publish a new active version <span className="font-semibold text-slate-800 font-mono">v{doc.version + 1}</span> using the data from <span className="font-semibold text-slate-800 font-mono">v{restoreTargetVersion.versionNumber}</span>. Current active version <span className="font-semibold text-slate-800 font-mono">v{doc.version}</span> will be marked as Superseded.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!restoreNote.trim()) {
                  setRestoreNoteError('A mandatory clinical or administrative reason is required to roll back a record.');
                  return;
                }
                setIsRestoreConfirmOpen(true);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1.5 flex items-center justify-between">
                  <span>Mandatory Staff Restoration Reason:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Logged to Audit Trail</span>
                </label>
                <textarea
                  value={restoreNote}
                  onChange={(e) => {
                    setRestoreNote(e.target.value);
                    if (restoreNoteError) setRestoreNoteError('');
                  }}
                  rows={3}
                  placeholder="e.g. 'Patient revoked amended consent form; reverting to original signed agreement', 'Rollback to prior radiograph due to artifact on newer scan'..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                />
                {restoreNoteError && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{restoreNoteError}</p>
                )}
              </div>

              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 text-xs text-teal-950 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-teal-800 block uppercase font-semibold">Authorizing Staff</span>
                  <span className="font-bold">{currentUser.name}</span>
                  <span className="text-[11px] text-teal-800 block">{currentUser.title}</span>
                </div>
                <span className="text-[10px] font-mono text-teal-700">Timestamp: Now</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsRestoreModalOpen(false);
                    setRestoreTargetVersion(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Review & Confirm Rollback</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION DIALOG: Admin-Only Soft Delete (Archive) */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title={`Archive Document "${doc.title}"?`}
        description="This document will be archived and hidden from active patient vault records, searches, and completion queues."
        consequenceNote="Admin-Only Soft Delete: The document is retained in the clinic's permanent database and audit history. An Administrator can restore it at any time from the Compliance & Audit Console."
        confirmLabel="Archive Document"
        cancelLabel="Keep Document"
        variant="danger"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          const result = deleteDocument(doc.id);
          if (result.success) {
            navigateTo('dashboard');
          } else {
            alert(result.reason || 'Failed to archive document');
          }
        }}
      />

      {/* IN-APP CONFIRMATION DIALOG: Version Restore / Rollback */}
      {restoreTargetVersion && (
        <ConfirmDialog
          isOpen={isRestoreConfirmOpen}
          title={`Confirm Version Rollback to v${restoreTargetVersion.versionNumber}?`}
          description={`This action will roll back the document content to historical draft v${restoreTargetVersion.versionNumber} and publish it as active version v${doc.version + 1}. The current version v${doc.version} will be marked as Superseded.`}
          consequenceNote={`Audit Enforced: The change and your clinical reason ("${restoreNote.trim()}") will be permanently recorded in the clinic audit log. This action can be undone by restoring another version later.`}
          confirmLabel={`Restore & Publish v${doc.version + 1}`}
          cancelLabel="Back to Review"
          variant="warning"
          onCancel={() => setIsRestoreConfirmOpen(false)}
          onConfirm={() => {
            restoreVersion(doc.id, restoreTargetVersion.versionNumber, restoreNote.trim());
            setIsRestoreConfirmOpen(false);
            setIsRestoreModalOpen(false);
            setRestoreTargetVersion(null);
            setActiveTab('versions');
          }}
        />
      )}
    </div>
  );
};
