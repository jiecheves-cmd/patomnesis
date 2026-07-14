import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];
const LAST_ACTIVITY_KEY = "patomnesis_last_activity_at";

function markActivityNow() {
  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch (error) {
    // localStorage puede fallar en modo privado; el cierre por inactividad
    // simplemente no persistirá entre recargas en ese caso.
  }
}

function getMillisSinceLastActivity() {
  try {
    const stored = window.localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!stored) return null;
    const elapsed = Date.now() - Number(stored);
    return Number.isFinite(elapsed) ? elapsed : null;
  } catch (error) {
    return null;
  }
}

function clearStoredActivity() {
  try {
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch (error) {
    // Nada que limpiar si localStorage no está disponible.
  }
}

function useIdleLogout(enabled, onTimeout, timeoutMs) {
  const timerRef = useRef(null);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return undefined;

    function resetTimer() {
      markActivityNow();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        clearStoredActivity();
        onTimeoutRef.current();
      }, timeoutMs);
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, [enabled, timeoutMs]);
}

export { clearStoredActivity, getMillisSinceLastActivity, useIdleLogout };
