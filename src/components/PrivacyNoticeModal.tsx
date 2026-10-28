/**
 * PrivacyNoticeModal
 *
 * Shown once per browser session when the user first activates a role.
 * Requires explicit checkbox acknowledgement before dismissal.
 * On accept, fires onAccept() so the caller can write an audit log entry.
 *
 * Per-session persistence is handled by the caller (sessionStorage key).
 * This component is stateless — it only renders and fires callbacks.
 */

import React, { useState } from 'react';
import { Shield, Lock, FileText, CheckCircle2 } from 'lucide-react';

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  staffName: string;
  staffTitle: string;
  onAccept: () => void;
}

export const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({
  isOpen,
  staffName,
  staffTitle,
  onAccept,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (!acknowledged) return;
    onAccept();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-notice-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-7 shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <span>San Nicolas Dental Clinic</span>
              <span aria-hidden="true">·</span>
              <span>Data Privacy Notice</span>
            </div>
            <h1 id="privacy-notice-title" className="text-xl font-bold text-slate-900">
              Patient Record Confidentiality Notice
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Required before accessing San Nicolas Dental Clinic — Republic Act 10173 (Data Privacy Act of 2012)
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 mb-6">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-3">
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-900">Records are strictly confidential.</strong>{' '}
                All patient data accessed through this system is protected under RA 10173. Unauthorized
                disclosure, copying, or sharing of patient information is a criminal offence.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-900">Every action is logged.</strong>{' '}
                Your access to documents, uploads, edits, and downloads is recorded in an append-only
                audit trail that cannot be altered. Logs may be submitted to the National Privacy
                Commission upon lawful request.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-900">Access is role-limited.</strong>{' '}
                You may only view, edit, and download records within the scope of your assigned role
                ({staffTitle}). Accessing records outside your role is prohibited.
              </p>
            </div>
          </div>

          {/* Signatory context */}
          <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-950">
            <div>
              <span className="block text-[10px] uppercase font-semibold text-teal-700">
                Acknowledging Staff
              </span>
              <span className="font-bold">{staffName}</span>
              <span className="block text-[11px] text-teal-800">{staffTitle}</span>
            </div>
            <span className="text-[10px] font-mono text-teal-700">
              Timestamp: {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>

          {/* Acknowledgement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5 shrink-0">
              <input
                type="checkbox"
                id="privacy-ack-checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500 cursor-pointer"
              />
            </div>
            <span className="text-xs text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">
              I have read and understood the above. I acknowledge that my access to patient records
              is governed by RA 10173, is strictly role-limited, and is permanently logged. I will
              not disclose confidential information to unauthorized persons.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
            Your acknowledgement is recorded in the clinic's tamper-evident audit log.
          </p>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!acknowledged}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl transition-all shadow-xs ${
              acknowledged
                ? 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>I Acknowledge & Enter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
