/**
 * InactivityWarningBanner
 *
 * Displayed as a fixed top-center toast when the inactivity warning fires.
 * Shows a countdown in seconds and a "Stay signed in" button.
 */

import React from 'react';
import { Clock, RefreshCw } from 'lucide-react';

interface InactivityWarningBannerProps {
  secondsRemaining: number;
  onStaySignedIn: () => void;
}

export const InactivityWarningBanner: React.FC<InactivityWarningBannerProps> = ({
  secondsRemaining,
  onStaySignedIn,
}) => {
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-4 px-5 py-3 bg-amber-900 text-white rounded-2xl shadow-2xl border border-amber-700 animate-in fade-in slide-in-from-top-2 duration-300"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-300 shrink-0" />
        <span className="text-sm font-semibold">
          Session expiring in{' '}
          <span className="font-mono tabular-nums text-amber-300">
            {secondsRemaining}s
          </span>
        </span>
        <span className="text-xs text-amber-300/80">— inactivity timeout</span>
      </div>
      <button
        type="button"
        onClick={onStaySignedIn}
        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-white text-amber-900 hover:bg-amber-50 rounded-xl transition-colors shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Stay signed in
      </button>
    </div>
  );
};
