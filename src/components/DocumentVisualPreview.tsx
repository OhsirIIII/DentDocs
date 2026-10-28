import React, { useState } from 'react';
import { DentalDocument } from '../types/dental';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Sparkles,
} from 'lucide-react';

interface DocumentVisualPreviewProps {
  document: DentalDocument;
  heightClass?: string;
}

export const DocumentVisualPreview: React.FC<DocumentVisualPreviewProps> = ({
  document,
  heightClass = 'min-h-[520px]',
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [invertRadiograph, setInvertRadiograph] = useState(false);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 20, 160));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 20, 80));

  const renderContent = () => {
    switch (document.type) {
      case 'X-ray':
        return (
          <div
            className={`w-full h-full rounded-xl p-6 transition-all duration-200 select-none ${
              invertRadiograph
                ? 'bg-slate-100 text-slate-900'
                : 'bg-neutral-950 text-neutral-100'
            }`}
          >
            {/* HUD Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4 text-xs font-mono">
              <div>
                <span className="text-teal-400 font-bold block">
                  {document.radiographDetails?.modality || 'DIGITAL RADIOGRAPH'}
                </span>
                <span className="opacity-60 text-[10px]">
                  {document.patientRecordNo} · {document.patientName}
                </span>
              </div>
              <div className="text-right text-[10px] opacity-70">
                <div>kVp: {document.radiographDetails?.kvp || '68 kV'}</div>
                <div>Exp: {document.radiographDetails?.exposureTime || '14.2s'}</div>
                <div>Date: {document.displayDate}</div>
              </div>
            </div>

            {/* Simulated Radiograph Canvas */}
            <div className="relative rounded-lg overflow-hidden border border-neutral-800 bg-black min-h-[300px] flex flex-col items-center justify-center p-6 text-center">
              {/* Radiograph dental background pattern */}
              <div
                className={`w-full max-w-sm p-6 rounded-lg ${
                  invertRadiograph ? 'bg-slate-200' : 'bg-neutral-900/90'
                }`}
              >
                <div className="flex justify-center mb-4">
                  <svg
                    className={`w-40 h-28 ${
                      invertRadiograph ? 'text-slate-800' : 'text-neutral-400'
                    } opacity-80`}
                    viewBox="0 0 200 120"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    {/* Simplified dental arch radiograph silhouette */}
                    <path
                      d="M20 70 C 40 20, 160 20, 180 70"
                      strokeDasharray="4 2"
                      opacity="0.4"
                    />
                    {/* Upper teeth outlines */}
                    <rect x="85" y="30" width="12" height="24" rx="2" fill="currentColor" fillOpacity="0.25" />
                    <rect x="103" y="30" width="12" height="24" rx="2" fill="currentColor" fillOpacity="0.25" />
                    <rect x="68" y="32" width="12" height="22" rx="2" fill="currentColor" fillOpacity="0.3" />
                    <rect x="120" y="32" width="12" height="22" rx="2" fill="currentColor" fillOpacity="0.3" />
                    <rect x="48" y="36" width="15" height="20" rx="3" fill="currentColor" fillOpacity="0.4" />
                    <rect x="137" y="36" width="15" height="20" rx="3" fill="currentColor" fillOpacity="0.4" />
                    {/* Lower teeth outlines */}
                    <rect x="86" y="60" width="11" height="22" rx="2" fill="currentColor" fillOpacity="0.25" />
                    <rect x="103" y="60" width="11" height="22" rx="2" fill="currentColor" fillOpacity="0.25" />
                    <rect x="70" y="62" width="12" height="20" rx="2" fill="currentColor" fillOpacity="0.3" />
                    <rect x="118" y="62" width="12" height="20" rx="2" fill="currentColor" fillOpacity="0.3" />
                    <rect x="50" y="64" width="15" height="22" rx="3" fill="currentColor" fillOpacity="0.5" />
                    <rect x="135" y="64" width="15" height="22" rx="3" fill="currentColor" fillOpacity="0.5" />
                  </svg>
                </div>

                <div className="text-[11px] font-mono text-center space-y-1">
                  <div className="text-teal-400 font-semibold">
                    Target Teeth: {document.toothNumbers.length ? document.toothNumbers.join(', ') : 'Unspecified'}
                  </div>
                  <div className="text-neutral-400 text-[10px]">
                    {document.radiographDetails?.findings || 'High-resolution digital sensor capture'}
                  </div>
                </div>
              </div>

              {/* R / L orientation markers */}
              <div className="absolute top-3 left-4 text-xs font-bold font-mono opacity-60">R</div>
              <div className="absolute top-3 right-4 text-xs font-bold font-mono opacity-60">L</div>
              <div className="absolute bottom-2 right-4 text-[9px] font-mono opacity-50">
                DICOM 3.0 · San Nicolas Imaging
              </div>
            </div>

            {/* Invert toggle */}
            <div className="flex items-center justify-between mt-3 text-[11px]">
              <span className="opacity-70">
                {document.isBlurryWarning ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Motion blur detected during capture
                  </span>
                ) : (
                  'Diagnostic quality: Sharp contrast'
                )}
              </span>
              <button
                type="button"
                onClick={() => setInvertRadiograph(!invertRadiograph)}
                className="px-2.5 py-1 text-[10px] font-mono rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
              >
                {invertRadiograph ? 'Standard Invert' : 'Bone Contrast Mode'}
              </button>
            </div>
          </div>
        );

      case 'Prescription':
        return (
          <div className="w-full bg-white text-slate-800 p-8 rounded-xl border border-slate-200 shadow-sm relative font-serif">
            {/* Rx Clinic Header */}
            <div className="text-center border-b-2 border-slate-800 pb-4 mb-5">
              <h2 className="text-lg font-bold tracking-wide uppercase font-sans text-teal-900">
                San Nicolas Dental Clinic
              </h2>
              <p className="text-[11px] font-sans text-slate-600">
                Comprehensive Oral Surgery & Esthetic Dentistry · Metro Manila
              </p>
              <div className="flex justify-center gap-4 text-[10px] font-mono text-slate-500 mt-1">
                <span>PRC: {document.prescriptionDetails?.prcNo || '0089123'}</span>
                <span>PTR: {document.prescriptionDetails?.ptrNo || '2026-904123'}</span>
                <span>TIN: 000-000-000-000</span>
              </div>
            </div>

            {/* Patient Meta Box */}
            <div className="grid grid-cols-2 text-xs font-sans border-b border-slate-200 pb-3 mb-5">
              <div>
                <span className="text-slate-500">Patient: </span>
                <span className="font-bold text-slate-900">{document.patientName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Date: </span>
                <span className="font-medium text-slate-900">{document.displayDate}</span>
              </div>
              <div>
                <span className="text-slate-500">Record: </span>
                <span className="font-mono text-slate-800">{document.patientRecordNo}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">FDI Teeth: </span>
                <span className="font-mono font-medium">
                  {document.toothNumbers.length ? document.toothNumbers.join(', ') : 'N/A'}
                </span>
              </div>
            </div>

            {/* Large Rx Symbol */}
            <div className="flex items-start gap-4 mb-6">
              <span className="text-4xl font-bold font-serif text-teal-800 select-none">Rx</span>
              <div className="space-y-4 text-sm font-sans flex-1">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="font-bold text-slate-900 text-base">
                    {document.prescriptionDetails?.genericName || 'Amoxicillin + Mefenamic Acid'}
                  </p>
                  <p className="text-xs text-slate-700 mt-1">
                    <strong>Sig:</strong> {document.prescriptionDetails?.frequency || 'Take 1 capsule every 8 hours after meals'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Duration: {document.prescriptionDetails?.duration || '5-7 days'}
                  </p>
                </div>
              </div>
            </div>

            {/* Incomplete alert if PRC missing */}
            {document.missingFields.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-sans mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Missing Required Prescription Elements:</p>
                  <ul className="list-disc pl-4 mt-0.5 text-[11px] space-y-0.5">
                    {document.missingFields.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Signature Block */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end font-sans">
              <div className="text-center w-52">
                <div className="h-10 flex items-center justify-center italic text-sm text-teal-900 font-serif border-b border-slate-400">
                  Dr. Jose Paolo Reyes, DDM
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Attending Dental Surgeon</p>
                <p className="text-[9px] font-mono text-slate-400">
                  License: {document.prescriptionDetails?.prcNo || 'PRC 0089123'}
                </p>
              </div>
            </div>
          </div>
        );

      case 'Consent Form':
        return (
          <div className="w-full bg-white text-slate-800 p-8 rounded-xl border border-slate-200 shadow-sm text-xs font-sans leading-relaxed">
            <div className="text-center border-b border-slate-200 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900 uppercase">
                Informed Consent for Dental Treatment
              </h2>
              <p className="text-[11px] text-slate-500">
                Pahintulot para sa Pagsasagawa ng Pamamaraang Dental
              </p>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                Record No: {document.patientRecordNo} · {document.displayDate}
              </div>
            </div>

            <div className="space-y-3 mb-6 text-slate-700">
              <p>
                Ako si <strong className="text-slate-900">{document.patientName}</strong>, ay
                kusang-loob na nagbibigay ng pahintulot sa San Nicolas Dental Clinic para sa pamamaraang:{' '}
                <strong className="text-teal-800">{document.title}</strong>{' '}
                {document.toothNumbers.length > 0 && (
                  <span>(Teeth: {document.toothNumbers.join(', ')})</span>
                )}.
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 text-[11px]">
                <li>Naipaliwanag nang maayos ang layunin, benepisyo, at posibleng komplikasyon ng gamutan.</li>
                <li>Nauunawaan ko na may alternatibong paraan ng paggamot na inilahad sa akin.</li>
                <li>Ipinahayag ko ang lahat ng aking kasaysayang medikal at mga gamot na iniinom.</li>
              </ol>
            </div>

            {/* Signature Verification Section */}
            <div className="border-t border-slate-200 pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">
                    Patient Signature / Lagda ng Pasyente
                  </p>
                  <div className="h-8 flex items-center font-serif italic text-teal-800 font-bold">
                    {document.patientName}
                  </div>
                  <p className="text-[10px] text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Signed on {document.displayDate}
                  </p>
                </div>

                <div
                  className={`p-3 rounded-lg border ${
                    document.completenessStatus === 'incomplete'
                      ? 'bg-rose-50 border-rose-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">
                    Parent / Guardian Signature (For Minors)
                  </p>
                  {document.completenessStatus === 'incomplete' ? (
                    <div className="mt-1">
                      <div className="h-8 border-b border-dashed border-rose-400 flex items-center justify-center text-rose-600 font-bold text-xs">
                        [MISSING GUARDIAN SIGNATURE]
                      </div>
                      <p className="text-[10px] text-rose-700 mt-1 font-medium">
                        Patient is 14 y/o. Legal guardian signature required.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <div className="h-8 flex items-center font-serif italic text-slate-700">
                        Mrs. Teresa Lim (Guardian)
                      </div>
                      <p className="text-[10px] text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified Guardian ID
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'Billing/Receipt':
        return (
          <div className="w-full bg-white text-slate-800 p-8 rounded-xl border border-slate-200 shadow-sm text-xs font-mono">
            {/* BIR Official Receipt Style */}
            <div className="text-center border-b border-dashed border-slate-400 pb-4 mb-4">
              <h2 className="text-base font-bold text-slate-900 tracking-wider">
                SAN NICOLAS DENTAL CLINIC
              </h2>
              <p className="text-[10px] text-slate-600">
                TAX IDENTIFICATION NO: 000-000-000-000 VAT REGISTERED
              </p>
              <p className="text-[10px] text-slate-500">
                BIR Authority to Print: ATP-2024-00129-PH
              </p>
              <div className="mt-2 inline-block px-3 py-0.5 bg-slate-100 rounded text-[11px] font-bold text-slate-800">
                OFFICIAL RECEIPT: {document.receiptNo || '[PENDING OR NUMBER]'}
              </div>
            </div>

            <div className="space-y-1 mb-4 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Date Issued:</span>
                <span>{document.displayDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Name:</span>
                <span className="font-bold">{document.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient Record No:</span>
                <span>{document.patientRecordNo}</span>
              </div>
              {document.hmoProvider && (
                <div className="flex justify-between text-teal-800">
                  <span>HMO Provider:</span>
                  <span className="font-semibold">{document.hmoProvider}</span>
                </div>
              )}
            </div>

            {/* Line items */}
            <div className="border-t border-b border-dashed border-slate-300 py-3 mb-4 space-y-1.5">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Description</span>
                <span>Amount (PHP)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{document.title}</span>
                <span>₱{document.amount ? document.amount.toLocaleString() : '2,500.00'}</span>
              </div>
            </div>

            {/* Total */}
            <div className="space-y-1 text-right mb-6 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">VATable Sales (12%):</span>
                <span>
                  ₱{document.amount ? (document.amount * 0.12).toFixed(2) : '300.00'}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-1">
                <span>TOTAL AMOUNT PAID:</span>
                <span className="text-teal-800">
                  ₱{document.amount ? document.amount.toLocaleString() : '2,500.00'}
                </span>
              </div>
            </div>

            {/* Cashier stamp */}
            <div className="flex items-center justify-between border-t border-dashed border-slate-300 pt-3 text-[10px] text-slate-500">
              <span>Cashier: {document.uploadedBy}</span>
              <span className="px-2 py-0.5 border border-slate-400 rounded uppercase">
                {document.completenessStatus === 'incomplete' ? 'PROVISIONAL' : 'PAID IN FULL'}
              </span>
            </div>
          </div>
        );

      default:
        // Generic Clean Clinical Document View
        return (
          <div className="w-full bg-white text-slate-800 p-8 rounded-xl border border-slate-200 shadow-sm text-xs font-sans">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-mono text-teal-700 uppercase font-semibold block">
                  {document.type} · {document.procedureCategory}
                </span>
                <h2 className="text-base font-bold text-slate-900">{document.title}</h2>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <div>{document.displayDate}</div>
                <div className="font-mono text-slate-700 font-semibold">{document.patientRecordNo}</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-[11px] whitespace-pre-wrap text-slate-800 leading-relaxed max-h-[380px] overflow-y-auto">
              {document.extractedText}
            </div>

            {document.toothNumbers.length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Involved FDI Teeth:</span>
                <div className="flex gap-1">
                  {document.toothNumbers.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 font-mono text-teal-900 font-bold text-[11px]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className={`flex flex-col bg-slate-100 rounded-2xl border border-slate-200 p-4 ${heightClass}`}>
      {/* Top Action Toolbar */}
      <div className="flex items-center justify-between mb-3 text-xs text-slate-600 px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">{document.title}</span>
          <span className="text-[11px] text-slate-500 font-mono">
            ({document.fileType} · {document.fileSize})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom out"
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono px-1.5 text-slate-600">{zoomLevel}%</span>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom in"
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            title="Print document"
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors ml-1"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scaled Preview Frame */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-2 rounded-xl bg-slate-200/50 border border-slate-200/80">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="w-full max-w-2xl transition-transform duration-150"
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
