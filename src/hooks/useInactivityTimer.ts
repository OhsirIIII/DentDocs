/**
 * useInactivityTimer
 *
 * Reusable hook for detecting user inactivity.
 * - Fires onWarn() at `warnAfterMs` (default 9 minutes) with a countdown.
 * - Fires onLogout() at `logoutAfterMs` (default 10 minutes).
 * - Resets on any mouse move, keydown, click, touchstart, or scroll event.
 * - Exposes `resetTimer()` so "Stay signed in" button can cancel the warning.
 *
 * Designed so the logout action can later be replaced with a real server-side
 * token expiry call without changing callers.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface InactivityTimerOptions {
  warnAfterMs?: number;   // default 9 * 60 * 1000
  logoutAfterMs?: number; // default 10 * 60 * 1000
  onLogout: () => void;
  enabled?: boolean;      // set false to disable (e.g. privacy notice not yet shown)
}

export interface InactivityTimerState {
  isWarning: boolean;
  secondsRemaining: number;
  resetTimer: () => void;
}

const WARN_DEFAULT = 9 * 60 * 1000;
const LOGOUT_DEFAULT = 10 * 60 * 1000;
const COUNTDOWN_INTERVAL = 1000;

export function useInactivityTimer({
  warnAfterMs = WARN_DEFAULT,
  logoutAfterMs = LOGOUT_DEFAULT,
  onLogout,
  enabled = true,
}: InactivityTimerOptions): InactivityTimerState {
  const [isWarning, setIsWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    warnTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const startTimers = useCallback(() => {
    clearAllTimers();
    setIsWarning(false);

    if (!enabled) return;

    warnTimerRef.current = setTimeout(() => {
      const gapMs = logoutAfterMs - warnAfterMs;
      const gapSecs = Math.round(gapMs / 1000);
      setSecondsRemaining(gapSecs);
      setIsWarning(true);

      // Countdown tick
      countdownRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, COUNTDOWN_INTERVAL);

      // Hard logout timer
      logoutTimerRef.current = setTimeout(() => {
        setIsWarning(false);
        onLogout();
      }, gapMs);
    }, warnAfterMs);
  }, [clearAllTimers, enabled, warnAfterMs, logoutAfterMs, onLogout]);

  const resetTimer = useCallback(() => {
    startTimers();
  }, [startTimers]);

  // Attach activity listeners
  useEffect(() => {
    if (!enabled) return;

    const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];

    const handleActivity = () => {
      if (!isWarning) startTimers(); // only auto-reset when warning is NOT showing
    };

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
    startTimers();

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { isWarning, secondsRemaining, resetTimer };
}
