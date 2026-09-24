import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, AlertTriangle, ShieldCheck, LogOut } from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { Button } from '../ui/Button';

export function SessionTimeoutManager() {
  const {
    isAuthenticated,
    sessionTimeoutMinutes,
    logoutUser,
  } = useERPStore();

  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const lastActivityRef = useRef<number>(Date.now());
  const lastEventThrottleRef = useRef<number>(0);

  // Reset user inactivity timer
  const recordActivity = useCallback(() => {
    const now = Date.now();
    // Throttle to at most once per second
    if (now - lastEventThrottleRef.current > 1000) {
      lastEventThrottleRef.current = now;
      lastActivityRef.current = now;
      try {
        localStorage.setItem('h2o_last_activity_timestamp', String(now));
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  const handleContinueSession = () => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastEventThrottleRef.current = now;
    try {
      localStorage.setItem('h2o_last_activity_timestamp', String(now));
    } catch {
      // Ignore storage errors
    }
    setIsWarningOpen(false);
  };

  const handleManualLogout = () => {
    setIsWarningOpen(false);
    logoutUser();
  };

  // Activity listeners across window
  useEffect(() => {
    if (!isAuthenticated || !sessionTimeoutMinutes || sessionTimeoutMinutes <= 0) {
      setIsWarningOpen(false);
      return;
    }

    // Set initial activity
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem('h2o_last_activity_timestamp', String(now));
    } catch {}

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      // If warning modal is open, require explicit interaction button to continue,
      // but if user is typing or clicking, record activity
      recordActivity();
    };

    events.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
    };
  }, [isAuthenticated, sessionTimeoutMinutes, recordActivity]);

  // Periodic inactivity check
  useEffect(() => {
    if (!isAuthenticated || !sessionTimeoutMinutes || sessionTimeoutMinutes <= 0) {
      setIsWarningOpen(false);
      return;
    }

    const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
    // For 5 minute timeout, warn 45s before; for longer, warn 60s before
    const warningLeadMs = timeoutMs <= 5 * 60 * 1000 ? 45 * 1000 : 60 * 1000;

    const interval = setInterval(() => {
      // Check cross-tab activity from localStorage
      let latestActivity = lastActivityRef.current;
      try {
        const stored = localStorage.getItem('h2o_last_activity_timestamp');
        if (stored) {
          const storedTime = Number(stored);
          if (!isNaN(storedTime) && storedTime > latestActivity) {
            latestActivity = storedTime;
            lastActivityRef.current = storedTime;
          }
        }
      } catch {}

      const now = Date.now();
      const elapsed = now - latestActivity;
      const remainingMs = timeoutMs - elapsed;

      if (remainingMs <= 0) {
        // Inactivity threshold reached -> sign out immediately
        setIsWarningOpen(false);
        logoutUser();
      } else if (remainingMs <= warningLeadMs) {
        // Inside warning window -> show prompt
        setIsWarningOpen(true);
        setSecondsLeft(Math.max(1, Math.ceil(remainingMs / 1000)));
      } else {
        // Active session within limits
        setIsWarningOpen(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, sessionTimeoutMinutes, logoutUser]);

  if (!isAuthenticated || !isWarningOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-2xl p-6 overflow-hidden">
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <h3
              id="session-warning-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              Session Inactivity Warning
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              Your session is about to expire due to inactivity. Would you like to continue?
            </p>
          </div>
        </div>

        {/* Countdown Badge */}
        <div className="mt-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs">
          <span className="text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            Automatic logout in:
          </span>
          <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-sm px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 shadow-xs">
            {secondsLeft}s
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleManualLogout}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out Now
          </button>
          <Button
            variant="primary"
            onClick={handleContinueSession}
            className="w-full sm:w-auto text-xs py-2 px-5 flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <ShieldCheck className="w-4 h-4" />
            Continue Session
          </Button>
        </div>
      </div>
    </div>
  );
}
