import { HandwritingInput } from '../components/HandwritingInput';
import { uploadOriginal, request } from '../data/apiClient';
import React, { useState, useEffect } from 'react';
import { useClinic } from '../context/ClinicContext';
import {
  DocumentType,
  ProcedureCategory,
  DentalDocument,
  CompletenessStatus,
} from '../types/dental';
import {
  UploadCloud,
  FileCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Save,
  ArrowRight,
  ShieldCheck,
  Tag,
  Calendar,
  Layers,
} from 'lucide-react';

type ExtractedFormData = import('../data/clinicApi').LocalOcrResult;

export const UploadView: React.FC = () => {
  const {
    patients,
    currentUser,
    addDocument,
    navigateTo,
    selectedPatientId,
    setSelectedPatientId,
    setSelectedDocumentId,
  } = useClinic();

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [stagedFileId, setStagedFileId] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  useEffect(() => {
    if (!originalFile) { setOriginalUrl(''); return; }
    const url = URL.createObjectURL(originalFile); setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [originalFile]);
  const [handwritingBusy, setHandwritingBusy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Step state: 1. choose patient & drop file | 2. local processing | 3. review & confirm
  const [currentStep, setCurrentStep] = useState<'input' | 'processing' | 'review'>('input');
  const [chosenPatientId, setChosenPatientId] = useState<string>(
    selectedPatientId || patients[0]?.id || 'pat-001'
  );
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    type: 'PDF' | 'JPG' | 'PNG';
  } | null>(null);

  // Processing stage animation
  const [processingStage, setProcessingStage] = useState<number>(0);
  const processingStages = [
    { title: 'Retaining encrypted original…', percent: 25 },
    { title: 'Reading printed text locally; this may take up to 90 seconds…', percent: 60 },
  ];

  // Editable extracted data in review step
  const [extractedData, setExtractedData] = useState<ExtractedFormData | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Handle file drop / selection
  const handleFileChosen = (
    fileName: string,
    fileType: 'PDF' | 'JPG' | 'PNG' = 'PDF',
    fileSize = '1.8 MB',
    original?: File
  ) => {
    setUploadedFile({ name: fileName, type: fileType, size: fileSize });
    setOriginalFile(original || null);
    setStagedFileId(''); setExtractedData(null); setSaveError('');
  };

  const startProcessing = async (manual = false, handwritingText?: string) => {
    const patient = patients.find(p => p.id === chosenPatientId);
    if (!originalFile || !patient) return;
    setSaveError(''); setCurrentStep('processing'); setProcessingStage(0);
    try {
      const fileId = stagedFileId || await uploadOriginal(originalFile);
      setStagedFileId(fileId); setProcessingStage(1);
      const result = manual || currentUser.role === 'front_desk'
        ? {
            title: `${patient.fullName} - Uploaded document`, type: currentUser.role === 'front_desk' ? 'Billing/Receipt' : 'Patient Record',
            patientId: patient.id, patientName: patient.fullName, patientRecordNo: patient.recordNo,
            date: '', displayDate: '', toothNumbers: [], procedureCategory: currentUser.role === 'front_desk' ? 'Billing & Administrative' : 'Restorative',
            tags: [], confidenceScore: 0,
            fieldConfidence: { documentType: 0, recordNo: 0, date: 0, toothNumbers: 0, procedureCategory: 0, tags: 0 },
            completenessStatus: 'needs_review', missingFields: ['Staff completeness verification'], extractedText: handwritingText || '', handwritingDraft: handwritingText !== undefined,
            fileType: uploadedFile!.type, fileSize: uploadedFile!.size,
          } as ExtractedFormData
        : await request<ExtractedFormData>(`/files/${encodeURIComponent(fileId)}/extract`, {
            method: 'POST', body: JSON.stringify({ patientId: patient.id }),
          });
      setExtractedData(result); setCurrentStep('review');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Local OCR failed. Retry or enter metadata manually.');
      setCurrentStep('input');
    }
  };

  const handleAddTag = () => {
    if (!newTagInput.trim() || !extractedData) return;
    if (!extractedData.tags.includes(newTagInput.trim())) {
      setExtractedData({
        ...extractedData,
        tags: [...extractedData.tags, newTagInput.trim()],
      });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      tags: extractedData.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleSaveToPatientRecord = async (sendToReview = false) => {
    if (!extractedData || isSaving) return;
    if (!originalFile) { setSaveError('Choose an original PDF, JPG, or PNG file before saving.'); return; }
    if (!extractedData.date) { setSaveError('Enter the document date from the original before saving.'); return; }
    setIsSaving(true); setSaveError('');
    try {
    const fileId = stagedFileId || await uploadOriginal(originalFile);
    const newDocId = `doc-${Date.now().toString().slice(-4)}`;
    const finalDoc: DentalDocument = {
      id: newDocId,
      fileId,
      patientId: extractedData.patientId,
      patientRecordNo: extractedData.patientRecordNo,
      patientName: extractedData.patientName,
      title: extractedData.title,
      type: extractedData.type,
      date: extractedData.date,
      displayDate: extractedData.displayDate,
      toothNumbers: extractedData.toothNumbers,
      procedureCategory: extractedData.procedureCategory,
      tags: extractedData.tags,
      confidenceScore: extractedData.confidenceScore,
      fieldConfidence: extractedData.fieldConfidence,
      completenessStatus: sendToReview ? 'needs_review' : extractedData.completenessStatus,
      missingFields: extractedData.missingFields,
      extractedText: extractedData.extractedText,
      fileType: extractedData.fileType,
      fileSize: extractedData.fileSize,
      uploadedBy: `${currentUser.name} (${currentUser.title})`,
      uploadedAt: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      isBlurryWarning: extractedData.isBlurryWarning,
      isNameMismatch: extractedData.isNameMismatch,
      reviewNotes: extractedData.handwritingDraft ? 'Selected handwriting regions only; verify the full original and patient linkage.' : sendToReview
        ? 'Sent to review queue by staff for further doctor validation.'
        : undefined,
      version: 1,
      versionStatus: 'active',
      versionHistory: [],
    };

    const saved = await addDocument(finalDoc);
    setSelectedDocumentId(saved.id);
    setSelectedPatientId(extractedData.patientId);
    if (sendToReview) {
      navigateTo('review');
    } else {
      navigateTo('viewer', { documentId: saved.id });
    }
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Unable to save'); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 pb-12">
      {saveError && <p role="alert" className="bg-rose-50 p-3 text-rose-900">{saveError}</p>}
      {isSaving && <p role="status">Saving original file and reviewed record…</p>}
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Upload & Inspect Clinical Document
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload a PDF or image. Local OCR suggests printed text and document fields for staff review. Staff check
          completeness before saving. For handwriting in JPG/PNG images, use the experimental region selector below. Radiograph interpretation is unsupported.
        </p>

        {/* 5-step visual roadmap indicator */}
        <div className="mt-6 grid grid-cols-5 gap-2 border-t border-slate-100 pt-4 text-xs">
          <div
            className={`flex items-center gap-2 ${
              currentStep === 'input'
                ? 'text-teal-700 font-bold'
                : 'text-slate-400 font-medium'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-[10px]">
              1
            </span>
            <span className="truncate">Choose Patient</span>
          </div>

          <div
            className={`flex items-center gap-2 ${
              currentStep === 'input' && uploadedFile
                ? 'text-teal-700 font-bold'
                : 'text-slate-400 font-medium'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-[10px]">
              2
            </span>
            <span className="truncate">Drop File</span>
          </div>

          <div
            className={`flex items-center gap-2 ${
              currentStep === 'processing'
                ? 'text-teal-700 font-bold'
                : 'text-slate-400 font-medium'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-[10px]">
              3
            </span>
            <span className="truncate">Processing</span>
          </div>

          <div
            className={`flex items-center gap-2 ${
              currentStep === 'review'
                ? 'text-teal-700 font-bold'
                : 'text-slate-400 font-medium'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-[10px]">
              4
            </span>
            <span className="truncate">Staff Review</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-[10px]">
              5
            </span>
            <span className="truncate">Confirm & Save</span>
          </div>
        </div>
      </div>

      {/* STEP 1 & 2: INPUT VIEW (Choose Patient + Drop File) */}
      {currentStep === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Patient Selector (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs">
                1
              </span>
              <span>Assign To Patient</span>
            </h2>
            <p className="text-xs text-slate-500">
              Select which clinical record this incoming document belongs to.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Select Patient Record:
              </label>
              <select
                disabled={handwritingBusy}
                value={chosenPatientId}
                onChange={(e) => { setChosenPatientId(e.target.value); setStagedFileId(''); }}
                className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.recordNo} · {p.fullName} {p.isMinor ? '(Minor - 14yo)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected patient preview box */}
            {(() => {
              const p = patients.find((pat) => pat.id === chosenPatientId);
              if (!p) return null;
              return (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>{p.fullName}</span>
                    <span className="font-mono text-teal-800">{p.recordNo}</span>
                  </div>
                  <p className="text-slate-500">{p.gender} · {p.age} years old</p>
                  {p.isMinor && (
                    <p className="text-[11px] text-amber-700 font-medium">
                      Requires Guardian ({p.guardianName}) consent
                    </p>
                  )}
                  {p.medicalAlerts.length > 0 && (
                    <p className="text-[11px] text-rose-700 font-medium">
                      Alert: {p.medicalAlerts.join(', ')}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Quick Demo Pre-sets */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 uppercase">
                Quick Select Demo Patients:
              </span>
              <div className="space-y-1">
                <button
                  type="button"
                  disabled={handwritingBusy} onClick={() => { setChosenPatientId('pat-006'); setStagedFileId(''); } }
                  className="w-full text-left text-xs p-1.5 rounded hover:bg-slate-100 text-slate-700 flex justify-between"
                >
                  <span>Chloe Danielle Lim</span>
                  <span className="text-[10px] text-amber-700 font-medium">Minor / Consent</span>
                </button>
                <button
                  type="button"
                  disabled={handwritingBusy} onClick={() => { setChosenPatientId('pat-001'); setStagedFileId(''); } }
                  className="w-full text-left text-xs p-1.5 rounded hover:bg-slate-100 text-slate-700 flex justify-between"
                >
                  <span>Juan Miguel Dela Cruz</span>
                  <span className="text-[10px] text-teal-700 font-medium">Adult / Routine</span>
                </button>
                <button
                  type="button"
                  disabled={handwritingBusy} onClick={() => { setChosenPatientId('pat-005'); setStagedFileId(''); } }
                  className="w-full text-left text-xs p-1.5 rounded hover:bg-slate-100 text-slate-700 flex justify-between"
                >
                  <span>Gabriel Dizon</span>
                  <span className="text-[10px] text-indigo-700 font-medium">Implant Case</span>
                </button>
              </div>
            </div>
          </div>

          {/* Drag & Drop Zone + Quick Samples (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs">
                  2
                </span>
                <span>Drop Scanned Document (PDF, JPG, PNG)</span>
              </h2>
            </div>

            <label className="block text-sm font-semibold mb-3">
              Choose original file (required to save)
              <input disabled={handwritingBusy} className="block mt-2" type="file" accept="application/pdf,image/jpeg,image/png" onChange={e => {
                const file = e.target.files?.[0];
                setOriginalFile(file || null);
                if (file) handleFileChosen(file.name, file.type === 'image/png' ? 'PNG' : file.type === 'image/jpeg' ? 'JPG' : 'PDF', `${file.size.toLocaleString()} bytes`, file);
              }} />
            </label>
            {/* Interactive Drag & Drop Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file && !handwritingBusy) {
                  setOriginalFile(file);
                  const ext = file.name.split('.').pop()?.toUpperCase() as any;
                  handleFileChosen(file.name, ['PDF', 'JPG', 'PNG'].includes(ext) ? ext : 'PDF', `${file.size.toLocaleString()} bytes`, file);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                uploadedFile
                  ? 'border-teal-500 bg-teal-50/40'
                  : 'border-slate-300 hover:border-teal-400 bg-slate-50/50'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>

              {uploadedFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900 break-all">{uploadedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    Format: {uploadedFile.type} · Size: {uploadedFile.size} · Ready for OCR
                  </p>
                  <button
                    type="button"
                    disabled={handwritingBusy}
                    onClick={() => { setUploadedFile(null); setOriginalFile(null); setStagedFileId(''); }}
                    className="text-xs text-rose-600 hover:underline mt-2 inline-block"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800">
                    Drag and drop a file here, or choose the original above
                  </p>
                  <p className="text-xs text-slate-500">
                    Supported: Scanned Dental PDFs, Panoramic JPGs, Bitewing PNGs
                  </p>

                </div>
              )}
            </div>

            {originalFile && uploadedFile?.type !== 'PDF' && currentUser.role !== 'front_desk' && <HandwritingInput
              key={`${originalFile.name}-${chosenPatientId}`} file={originalFile} patientId={chosenPatientId} onBusy={setHandwritingBusy}
              ensureUpload={async () => { const id = stagedFileId || await uploadOriginal(originalFile); setStagedFileId(id); return id; }}
              onUse={text => startProcessing(true, text)} />}
            <button type="button" disabled={!originalFile || handwritingBusy} onClick={() => startProcessing(true)}
              className="text-xs underline text-slate-700 disabled:opacity-50">Enter metadata manually and send for review</button>
            {/* Launch OCR Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={!originalFile || handwritingBusy}
                onClick={() => startProcessing()}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all shadow-xs ${
                  uploadedFile
                    ? 'text-white bg-teal-700 hover:bg-teal-800 cursor-pointer'
                    : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                }`}
              >
                <span>{currentUser.role === 'front_desk' ? 'Enter Administrative Metadata' : 'Read Document Locally'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: LOCAL PROCESSING STATUS */}
      {currentStep === 'processing' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 mx-auto flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Processing Document...
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              File: <span className="font-medium text-slate-800">{uploadedFile?.name}</span>
            </p>
          </div>

          {/* Request-stage indicator; not an OCR percentage */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-teal-700 h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${processingStages[processingStage].percent}%` }}
            ></div>
          </div>

          {/* Named stages checklist */}
          <div className="space-y-2.5 text-left text-xs max-w-md mx-auto pt-2">
            {processingStages.map((stage, idx) => {
              const isPast = processingStage > idx;
              const isCurrent = processingStage === idx;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-teal-50 text-teal-900 font-semibold'
                      : isPast
                      ? 'text-slate-700'
                      : 'text-slate-400 opacity-60'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span>{stage.title}</span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Printed-text OCR only. Staff verify classification, patient linkage and completeness.
          </p>
        </div>
      )}

      {/* STEP 4: STAFF REVIEW & VERIFICATION SCREEN */}
      {currentStep === 'review' && extractedData && (
        <div className="space-y-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs space-y-2">
            <p className="font-semibold">Staff verification required · OCR scores are estimates, not guarantees</p>
            {(extractedData.extraction?.warnings || [extractedData.handwritingDraft ? 'Experimental handwriting suggestion: verify every word and all metadata against the original. Signatures and completeness were not assessed.' : 'Manual entry: verify all metadata and completeness against the original.']).map(warning => <p key={warning}>{warning}</p>)}
            <label className="block font-semibold" htmlFor="ocrText">Transcription text (editable)</label>
            <textarea id="ocrText" value={extractedData.extractedText} onChange={e => setExtractedData({ ...extractedData, extractedText: e.target.value })}
              className="w-full min-h-36 border border-slate-300 rounded-lg p-3 bg-white text-slate-900" />
          </div>
          {/* Top Banner: Check the retained original */}
          <div className="bg-teal-50 border border-teal-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-teal-950">
              <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
              <div>
                <p className="font-bold">
                  Document Ready for Staff Verification
                </p>
                <p className="text-[11px] text-teal-800">
                  The encrypted original is staged. The patient record has not been saved yet. Review the extracted fields, verify the completeness
                  checklist, and edit any values before confirming.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-teal-900 font-bold">
                {extractedData.handwritingDraft ? 'Handwriting draft · unscored' : `Overall Confidence: ${extractedData.confidenceScore}%`}
              </span>
            </div>
          </div>

          {/* Edge case warnings */}
          {extractedData.isBlurryWarning && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Blurry Scan Warning:</strong> Motion or sensor
                blur detected in the radiograph. Tooth numbers and dates had lower extraction
                confidence. Please double check the fields highlighted in amber below.
              </div>
            </div>
          )}

          {extractedData.isNameMismatch && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Patient Name Mismatch Detected:</strong> Scanned
                document text appears to mention "{extractedData.mismatchedDetectedName}", which
                differs from the selected patient "{extractedData.patientName}". Please verify you
                selected the correct patient folder.
              </div>
            </div>
          )}

          {/* Dual-Pane Review: Document Preview on Left, Extracted Fields on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Pane: Visual Document Preview (6 cols) */}
            <div className="lg:col-span-6">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-semibold text-slate-800">Document Scan Preview</span>
                <span>Type: {extractedData.type}</span>
              </div>
              {originalUrl && (uploadedFile?.type === 'PDF'
                  ? <iframe title="Uploaded original" src={`${originalUrl}#zoom=page-width`} className="w-full h-[480px] border-0" />
                  : <img alt="Uploaded original" src={originalUrl} className="w-full max-h-[480px] object-contain" />)}
              {originalUrl && <a href={originalUrl} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs underline text-slate-700">Open original separately to inspect every page</a>}

            </div>

            {/* Right Pane: Editable Fields & Confidence Indicators (6 cols) */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  Extracted Metadata (Editable)
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  {extractedData.patientRecordNo}
                </span>
              </div>

              {/* 1. Document Type (One-click changer) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Document Type:
                  </label>
                  <span
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                      extractedData.fieldConfidence.documentType >= 85
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {extractedData.handwritingDraft ? "Staff check" : `${extractedData.fieldConfidence.documentType}% conf`}
                  </span>
                </div>
                <select
                  value={extractedData.type}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      type: e.target.value as DocumentType,
                    })
                  }
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

              {/* 2. Document Title */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Document Title:
                </label>
                <input
                  type="text"
                  value={extractedData.title}
                  onChange={(e) =>
                    setExtractedData({ ...extractedData, title: e.target.value })
                  }
                  className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* 3. Date & Procedure Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Date:</label>
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                        extractedData.fieldConfidence.date >= 85
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {extractedData.handwritingDraft ? "Staff check" : `${extractedData.fieldConfidence.date}% conf`}
                    </span>
                  </div>
                  <input
                    type="date"
                    value={extractedData.date}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        date: e.target.value,
                        displayDate: e.target.value,
                      })
                    }
                    className={`w-full text-xs text-slate-900 rounded-xl p-2.5 border focus:outline-none focus:ring-2 ${
                      extractedData.fieldConfidence.date < 85
                        ? 'bg-amber-50/50 border-amber-300 focus:ring-amber-500'
                        : 'bg-slate-50 border-slate-200 focus:ring-teal-500'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Procedure Category:</label>
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                        extractedData.fieldConfidence.procedureCategory >= 85
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {extractedData.handwritingDraft ? "Staff check" : `${extractedData.fieldConfidence.procedureCategory}% conf`}
                    </span>
                  </div>
                  <select
                    value={extractedData.procedureCategory}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        procedureCategory: e.target.value as ProcedureCategory,
                      })
                    }
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
              </div>

              {/* 4. FDI Tooth Numbers */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    FDI Tooth Numbers (e.g. 11, 21, 36, 46):
                  </label>
                  <span
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                      extractedData.fieldConfidence.toothNumbers >= 85
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {extractedData.handwritingDraft ? "Staff check" : `${extractedData.fieldConfidence.toothNumbers}% conf`}
                  </span>
                </div>
                <input
                  type="text"
                  value={extractedData.toothNumbers.join(', ')}
                  onChange={(e) => {
                    const parsed = e.target.value
                      .split(',')
                      .map((s) => parseInt(s.trim()))
                      .filter((n) => !isNaN(n));
                    setExtractedData({
                      ...extractedData,
                      toothNumbers: parsed,
                    });
                  }}
                  placeholder="e.g. 18, 48"
                  className={`w-full text-xs font-mono rounded-xl p-2.5 border focus:outline-none focus:ring-2 ${
                    extractedData.fieldConfidence.toothNumbers < 85
                      ? 'bg-amber-50/50 border-amber-300 focus:ring-amber-500'
                      : 'bg-slate-50 border-slate-200 focus:ring-teal-500'
                  }`}
                />
              </div>

              {/* 5. Completeness Checklist: Found vs Missing (Check the retained original) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Completeness Requires Staff Review
                  </span>
                  <span className="text-[10px] text-slate-500 italic">
                    Check the retained original
                  </span>
                </div>

                <div className="space-y-1.5 text-xs pt-1">
                  <div className="flex items-center gap-2 text-slate-700">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Selected patient record: {extractedData.patientRecordNo} — verify against original</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Clinic headers and credentials have not been verified automatically</span>
                  </div>

                  {extractedData.missingFields.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-800 font-medium">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>Staff marked checklist items found; completeness still requires review</span>
                    </div>
                  ) : (
                    extractedData.missingFields.map((missing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-amber-100/60 p-1.5 rounded text-amber-900"
                      >
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Missing: {missing}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newMissing = extractedData.missingFields.filter((_, i) => i !== idx);
                            setExtractedData({
                              ...extractedData,
                              missingFields: newMissing,
                              completenessStatus: newMissing.length === 0 ? 'complete' : 'incomplete',
                            });
                          }}
                          className="text-[10px] text-teal-800 font-semibold hover:underline"
                        >
                          Staff checked
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 6. Tags Management */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Document Tags:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {extractedData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-700"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-rose-600 ml-1"
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
                    placeholder="Add clinical or billing tag..."
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Add Tag
                  </button>
                </div>
              </div>

              {/* Action Buttons: Confirm & Save vs Send to Review Queue */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { setCurrentStep('input'); setStagedFileId(''); setExtractedData(null); }}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Discard & Re-upload
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveToPatientRecord(true)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors"
                  >
                    Send to Review Queue
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveToPatientRecord(false)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>Confirm & Save to Record</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
