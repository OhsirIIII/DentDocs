import React, { useState, useEffect } from 'react';
import { useClinic } from '../context/ClinicContext';
import {
  DocumentType,
  ProcedureCategory,
  DentalDocument,
  CompletenessStatus,
} from '../types/dental';
import { DocumentVisualPreview } from '../components/DocumentVisualPreview';
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

interface ExtractedFormData {
  title: string;
  type: DocumentType;
  patientId: string;
  patientRecordNo: string;
  patientName: string;
  date: string;
  displayDate: string;
  toothNumbers: number[];
  procedureCategory: ProcedureCategory;
  tags: string[];
  confidenceScore: number;
  fieldConfidence: {
    documentType: number;
    recordNo: number;
    date: number;
    toothNumbers: number;
    procedureCategory: number;
    tags: number;
  };
  completenessStatus: CompletenessStatus;
  missingFields: string[];
  extractedText: string;
  fileType: 'PDF' | 'JPG' | 'PNG';
  fileSize: string;
  isBlurryWarning?: boolean;
  isNameMismatch?: boolean;
  mismatchedDetectedName?: string;
}

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

  // Step state: 1. choose patient & drop file | 2. processing (3-4s) | 3. review & confirm
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
    { title: 'Scanning text & layout artifacts...', percent: 25 },
    { title: 'Detecting Philippine dental document type & clinic headers...', percent: 50 },
    { title: 'Extracting FDI tooth numbers, dates, and doctor credentials...', percent: 75 },
    { title: 'Checking completeness & Philippine compliance checklists...', percent: 100 },
  ];

  // Editable extracted data in review step
  const [extractedData, setExtractedData] = useState<ExtractedFormData | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Handle file drop / selection
  const handleFileChosen = (
    fileName: string,
    fileType: 'PDF' | 'JPG' | 'PNG' = 'PDF',
    fileSize = '1.8 MB'
  ) => {
    setUploadedFile({ name: fileName, type: fileType, size: fileSize });
  };

  // Run the 3-4 second processing animation
  const startProcessing = () => {
    if (!uploadedFile) return;

    setCurrentStep('processing');
    setProcessingStage(0);

    // Stage 1 -> Stage 2 -> Stage 3 -> Stage 4 -> Review
    const timer1 = setTimeout(() => setProcessingStage(1), 900);
    const timer2 = setTimeout(() => setProcessingStage(2), 1900);
    const timer3 = setTimeout(() => setProcessingStage(3), 2900);
    const timer4 = setTimeout(() => {
      generateExtractedResult();
      setCurrentStep('review');
    }, 3800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  };

  // Generate plausible mock OCR extraction based on filename and chosen patient
  const generateExtractedResult = () => {
    const patient = patients.find((p) => p.id === chosenPatientId) || patients[0];
    const nameLower = uploadedFile?.name.toLowerCase() || '';

    let type: DocumentType = 'Patient Record';
    let procedureCategory: ProcedureCategory = 'Restorative';
    let toothNumbers: number[] = [16, 26];
    let tags = ['Clinical Chart', 'Exam Record'];
    let completenessStatus: CompletenessStatus = 'complete';
    let missingFields: string[] = [];
    let isBlurry = false;
    let isMismatch = false;
    let mismatchedDetectedName = '';
    let extractedText = '';

    // Field-specific confidence default scores
    let fieldConfidence = {
      documentType: 96,
      recordNo: 98,
      date: 94,
      toothNumbers: 92,
      procedureCategory: 95,
      tags: 90,
    };

    if (nameLower.includes('xray') || nameLower.includes('opg') || nameLower.includes('radiograph') || uploadedFile?.type === 'JPG') {
      type = 'X-ray';
      procedureCategory = 'Oral Surgery';
      toothNumbers = [18, 28, 38, 48];
      tags = ['Digital Radiograph', 'Panoramic OPG', 'Bone Assessment'];
      extractedText = `DIGITAL PANORAMIC SYSTEM - DALISAY DENTAL STUDIO\nPatient: ${patient.fullName} [${patient.recordNo}]\nkVp: 68 | mA: 8 | Exposure Time: 14.2s\nReport: Alveolar bone crest levels within normal limits. Impacted third molars present.\nRadiologist: Dr. Maria Elena Santos (PRC 0074512)`;
    } else if (nameLower.includes('consent')) {
      type = 'Consent Form';
      procedureCategory = patient.isMinor ? 'Orthodontics' : 'Oral Surgery';
      toothNumbers = patient.isMinor ? [14, 24] : [38, 48];
      tags = ['Informed Consent', 'Bilingual English-Tagalog'];
      if (patient.isMinor) {
        completenessStatus = 'incomplete';
        missingFields = ['Legal Guardian Signature', 'Guardian Government ID Number'];
        fieldConfidence.toothNumbers = 72; // low confidence highlight
        extractedText = `INFORMED CONSENT FOR PEDIATRIC ORTHODONTIC APPLIANCE\nPatient: ${patient.fullName} (Age: ${patient.age}) | Record: ${patient.recordNo}\nParent/Guardian declared: ${patient.guardianName || 'Guardian'}\n[ALERT: Guardian signature space empty - requires physical or digital signing]`;
      } else {
        tags.push('Signed & Verified');
        extractedText = `INFORMED CONSENT FOR DENTAL SURGERY\nPatient: ${patient.fullName} | Record: ${patient.recordNo}\nStipulations explained and accepted.\nSigned: ${patient.fullName}\nWitness: Carla Mendoza, RDA`;
      }
    } else if (nameLower.includes('prescription') || nameLower.includes('reseta') || nameLower.includes('rx')) {
      type = 'Prescription';
      procedureCategory = 'Restorative';
      toothNumbers = [47];
      tags = ['Prescription Rx', 'Analgesic', 'Antibiotic'];
      extractedText = `DALISAY DENTAL STUDIO - PRESCRIPTION Rx\nDoctor: Dr. Jose Paolo Reyes, DDM | PRC: 0089123 | PTR: 2026-904123\nPatient: ${patient.fullName} | Date: ${new Date().toISOString().split('T')[0]}\n\nRx: Amoxicillin 500mg capsules #21\nSig: 1 capsule every 8 hours for 7 days.`;
    } else if (nameLower.includes('bill') || nameLower.includes('receipt') || nameLower.includes('or_')) {
      type = 'Billing/Receipt';
      procedureCategory = 'Billing & Administrative';
      toothNumbers = [];
      tags = ['Official Receipt', 'BIR Registered', 'Cash Settlement'];
      extractedText = `DALISAY DENTAL STUDIO - OFFICIAL RECEIPT\nOR No: 2026-${Math.floor(8000 + Math.random() * 900)}\nReceived from: ${patient.fullName} [${patient.recordNo}]\nAmount: ₱3,500.00 (VAT Inclusive)\nCashier: Mark Vincent Bautista`;
    } else if (nameLower.includes('lab') || nameLower.includes('zirconia')) {
      type = 'Laboratory Report';
      procedureCategory = 'Prosthodontics';
      toothNumbers = [11, 21];
      tags = ['Dental Laboratory', 'Zirconia Monolithic', 'Shade A2'];
      extractedText = `CERAMIC MASTERS LAB PHILIPPINES\nCase: Full Contour Zirconia Crown\nPatient: ${patient.fullName} [${patient.recordNo}]\nShade: A2 | Margin check: 100% PASS`;
    } else if (nameLower.includes('plan')) {
      type = 'Treatment Plan';
      procedureCategory = 'Restorative';
      toothNumbers = [36, 46];
      tags = ['Treatment Roadmap', 'Phased Plan'];
      extractedText = `TREATMENT ESTIMATE & PROPOSAL\nPatient: ${patient.fullName} [${patient.recordNo}]\nPhase 1: Prophylaxis & Caries Excavation\nPhase 2: Composite Resin Bonding\nEstimated: ₱5,500.00`;
    }

    // Check edge case triggers
    if (nameLower.includes('blurry')) {
      isBlurry = true;
      fieldConfidence.date = 64; // amber highlight
      fieldConfidence.toothNumbers = 58; // amber highlight
    }

    if (nameLower.includes('mismatch')) {
      isMismatch = true;
      mismatchedDetectedName = 'Juan Miguel Dela Cruz';
      fieldConfidence.recordNo = 62; // amber highlight
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const initialTitle = `${patient.fullName} - ${type} (${uploadedFile?.name || 'Scanned Document'})`;

    setExtractedData({
      title: initialTitle,
      type,
      patientId: patient.id,
      patientRecordNo: patient.recordNo,
      patientName: patient.fullName,
      date: todayStr,
      displayDate: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      toothNumbers,
      procedureCategory,
      tags,
      confidenceScore: Math.round(
        (fieldConfidence.documentType +
          fieldConfidence.recordNo +
          fieldConfidence.date +
          fieldConfidence.toothNumbers +
          fieldConfidence.procedureCategory +
          fieldConfidence.tags) /
          6
      ),
      fieldConfidence,
      completenessStatus,
      missingFields,
      extractedText,
      fileType: uploadedFile?.type || 'PDF',
      fileSize: uploadedFile?.size || '1.8 MB',
      isBlurryWarning: isBlurry,
      isNameMismatch: isMismatch,
      mismatchedDetectedName,
    });
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

  const handleSaveToPatientRecord = (sendToReview = false) => {
    if (!extractedData) return;

    const newDocId = `doc-${Date.now().toString().slice(-4)}`;
    const finalDoc: DentalDocument = {
      id: newDocId,
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
      reviewNotes: sendToReview
        ? 'Sent to review queue by staff for further doctor validation.'
        : undefined,
      version: 1,
      versionStatus: 'active',
      versionHistory: [],
    };

    addDocument(finalDoc);
    setSelectedDocumentId(newDocId);
    setSelectedPatientId(extractedData.patientId);
    navigateTo('viewer', { documentId: newDocId });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
          <span>Guided Ingestion</span>
          <span aria-hidden="true">·</span>
          <span>OCR Document Pipeline</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Upload & Inspect Clinical Document
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Drop any scan or radiograph. DentDocs extracts text, auto-classifies the document, checks
          completeness, and requires staff confirmation before saving.
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
                value={chosenPatientId}
                onChange={(e) => setChosenPatientId(e.target.value)}
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
                  onClick={() => setChosenPatientId('pat-006')}
                  className="w-full text-left text-xs p-1.5 rounded hover:bg-slate-100 text-slate-700 flex justify-between"
                >
                  <span>Chloe Danielle Lim</span>
                  <span className="text-[10px] text-amber-700 font-medium">Minor / Consent</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChosenPatientId('pat-001')}
                  className="w-full text-left text-xs p-1.5 rounded hover:bg-slate-100 text-slate-700 flex justify-between"
                >
                  <span>Juan Miguel Dela Cruz</span>
                  <span className="text-[10px] text-teal-700 font-medium">Adult / Routine</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChosenPatientId('pat-005')}
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

            {/* Interactive Drag & Drop Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  const ext = file.name.split('.').pop()?.toUpperCase() as any;
                  handleFileChosen(file.name, ['PDF', 'JPG', 'PNG'].includes(ext) ? ext : 'PDF');
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
                  <p className="text-sm font-bold text-slate-900">{uploadedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    Format: {uploadedFile.type} · Size: {uploadedFile.size} · Ready for OCR
                  </p>
                  <button
                    type="button"
                    onClick={() => setUploadedFile(null)}
                    className="text-xs text-rose-600 hover:underline mt-2 inline-block"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800">
                    Drag and drop file here, or click to choose
                  </p>
                  <p className="text-xs text-slate-500">
                    Supported: Scanned Dental PDFs, Panoramic JPGs, Bitewing PNGs
                  </p>
                  <input
                    type="file"
                    id="fileUploadInput"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const ext = f.name.split('.').pop()?.toUpperCase() as any;
                        handleFileChosen(f.name, ['PDF', 'JPG', 'PNG'].includes(ext) ? ext : 'PDF');
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="fileUploadInput"
                    className="mt-3 inline-block px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-100 hover:bg-teal-200 rounded-lg cursor-pointer transition-colors"
                  >
                    Browse Local Files
                  </label>
                </div>
              )}
            </div>

            {/* Quick Philippine Sample Files (One-Click Selection) */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Or select a realistic Philippine clinic test scan:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleFileChosen('panoramic_opg_fullmouth_xray.jpg', 'JPG', '3.8 MB')}
                  className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-teal-400 bg-slate-50 hover:bg-white transition-all"
                >
                  <p className="font-semibold text-slate-900 truncate">panoramic_opg.jpg</p>
                  <p className="text-[11px] text-slate-500">X-ray Radiograph</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleFileChosen('orthodontic_consent_minor_patient.pdf', 'PDF', '1.2 MB')}
                  className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-teal-400 bg-slate-50 hover:bg-white transition-all"
                >
                  <p className="font-semibold text-slate-900 truncate">ortho_consent.pdf</p>
                  <p className="text-[11px] text-amber-700 font-medium">Minor Consent Alert</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleFileChosen('reseta_mefenamic_amoxicillin.pdf', 'PDF', '820 KB')}
                  className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-teal-400 bg-slate-50 hover:bg-white transition-all"
                >
                  <p className="font-semibold text-slate-900 truncate">reseta_amox.pdf</p>
                  <p className="text-[11px] text-slate-500">Prescription Slip</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleFileChosen('official_receipt_prophylaxis_bir.pdf', 'PDF', '640 KB')}
                  className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-teal-400 bg-slate-50 hover:bg-white transition-all"
                >
                  <p className="font-semibold text-slate-900 truncate">official_receipt.pdf</p>
                  <p className="text-[11px] text-slate-500">Billing / BIR VAT</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleFileChosen('blurry_emergency_scan_tooth47.jpg', 'JPG', '2.1 MB')}
                  className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-white transition-all"
                >
                  <p className="font-semibold text-slate-900 truncate">blurry_emergency.jpg</p>
                  <p className="text-[11px] text-amber-700 font-medium">Blur Warning Test</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleFileChosen('mismatched_patient_name_doc.pdf', 'PDF', '950 KB')}
                  className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-white transition-all"
                >
                  <p className="font-semibold text-slate-900 truncate">mismatch_test.pdf</p>
                  <p className="text-[11px] text-amber-700 font-medium">Name Mismatch Test</p>
                </button>
              </div>
            </div>

            {/* Launch OCR Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={!uploadedFile}
                onClick={startProcessing}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all shadow-xs ${
                  uploadedFile
                    ? 'text-white bg-teal-700 hover:bg-teal-800 cursor-pointer'
                    : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                }`}
              >
                <span>Process Document (Simulated OCR)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PROCESSING STAGE ANIMATION (3-4s with named stages) */}
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

          {/* Progress bar */}
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
            Simulating clinic-grade optical character recognition & dental entity extraction
          </p>
        </div>
      )}

      {/* STEP 4: STAFF REVIEW & VERIFICATION SCREEN */}
      {currentStep === 'review' && extractedData && (
        <div className="space-y-6">
          {/* Top Banner: AI suggestion, staff must verify */}
          <div className="bg-teal-50 border border-teal-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-teal-950">
              <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
              <div>
                <p className="font-bold">
                  AI Extraction Complete · Staff Verification Required
                </p>
                <p className="text-[11px] text-teal-800">
                  Nothing has been saved yet. Review the extracted fields, verify the completeness
                  checklist, and edit any values before confirming.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-teal-900 font-bold">
                Overall Confidence: {extractedData.confidenceScore}%
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
              <DocumentVisualPreview
                heightClass="min-h-[580px]"
                document={{
                  id: 'temp-preview',
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
                  completenessStatus: extractedData.completenessStatus,
                  missingFields: extractedData.missingFields,
                  extractedText: extractedData.extractedText,
                  fileType: extractedData.fileType,
                  fileSize: extractedData.fileSize,
                  uploadedBy: currentUser.name,
                  uploadedAt: 'Just now',
                  isBlurryWarning: extractedData.isBlurryWarning,
                  version: 1,
                  versionStatus: 'active',
                  versionHistory: [],
                }}
              />
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
                    {extractedData.fieldConfidence.documentType}% conf
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
                      {extractedData.fieldConfidence.date}% conf
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
                      {extractedData.fieldConfidence.procedureCategory}% conf
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
                    {extractedData.fieldConfidence.toothNumbers}% conf
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

              {/* 5. Completeness Checklist: Found vs Missing (AI suggestion, staff must verify) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Completeness Checklist (Staff Verified)
                  </span>
                  <span className="text-[10px] text-slate-500 italic">
                    AI suggestion, staff must verify
                  </span>
                </div>

                <div className="space-y-1.5 text-xs pt-1">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Patient Record No. ({extractedData.patientRecordNo}) identified</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Clinic Facility & Accreditation header verified</span>
                  </div>

                  {extractedData.missingFields.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-800 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>All required clinical signatures & license stamps present</span>
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
                          Mark Found
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
                  onClick={() => setCurrentStep('input')}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Discard & Re-upload
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleSaveToPatientRecord(true)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors"
                  >
                    Send to Review Queue
                  </button>

                  <button
                    type="button"
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
