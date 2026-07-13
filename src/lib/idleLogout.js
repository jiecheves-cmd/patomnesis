import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];

function createIdleTimer({
  clearTimer = clearTimeout,
  now = Date.now,
  onTimeout,
  setTimer = setTimeout,
  timeoutMs
}) {
  let lastActivityAt = now();
  let timer = null;
  let timedOut = false;

  function clearScheduledTimer() {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function check() {
    clearScheduledTimer();
    if (timedOut) return;

    const remainingMs = timeoutMs - (now() - lastActivityAt);
    if (remainingMs <= 0) {
      timedOut = true;
      onTimeout();
      return;
    }

    timer = setTimer(check, remainingMs);
  }

  function recordActivity() {
    lastActivityAt = now();
    timedOut = false;
    check();
  }

  check();

  return {
    check,
    destroy: clearScheduledTimer,
    recordActivity
  };
}

function useIdleLogout(enabled, onTimeout, timeoutMs) {
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return undefined;

    const idleTimer = createIdleTimer({
      onTimeout: () => onTimeoutRef.current(),
      timeoutMs
    });

    function checkWhenVisible() {
      if (document.visibilityState === "visible") idleTimer.check();
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, idleTimer.recordActivity, { passive: true });
    });
    window.addEventListener("focus", idleTimer.check);
    document.addEventListener("visibilitychange", checkWhenVisible);

    return () => {
      idleTimer.destroy();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, idleTimer.recordActivity);
      });
      window.removeEventListener("focus", idleTimer.check);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [enabled, timeoutMs]);
}

export { createIdleTimer, useIdleLogout };
