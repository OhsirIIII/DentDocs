/**
 * ConfirmDialog — styled in-app confirmation modal.
 *
 * Replaces window.confirm() for destructive actions.
 * Clearly states what will happen and whether it is reversible.
 */

import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  /** One or two sentences: what exactly will happen. */
  description: string;
  /** Extra context displayed in a callout (use for "this cannot be undone" warnings). */
  consequenceNote?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' renders red confirm button; 'warning' renders amber; default teal */
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
  /** Extra content (e.g. a required text field) rendered between description and buttons */
  children?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  consequenceNote,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  children,
}) => {
  if (!isOpen) return null;

  const confirmCls =
    variant === 'danger'
      ? 'bg-rose-700 hover:bg-rose-800 text-white'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white'
      : 'bg-teal-700 hover:bg-teal-800 text-white';

  const iconCls =
    variant === 'danger'
      ? 'bg-rose-100 text-rose-700'
      : variant === 'warning'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-teal-100 text-teal-700';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl relative animate-in fade-in duration-150">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
            {variant === 'warning' ? (
              <RotateCcw className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2
              id="confirm-dialog-title"
              className="text-base font-bold text-slate-900 leading-tight"
            >
              {title}
            </h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{description}</p>
          </div>
        </div>

        {consequenceNote && (
          <div
            className={`mb-4 p-3 rounded-xl border text-xs font-medium leading-relaxed ${
              variant === 'danger'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : variant === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            {consequenceNote}
          </div>
        )}

        {children && <div className="mb-5">{children}</div>}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 text-xs font-semibold rounded-xl transition-colors shadow-xs ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
