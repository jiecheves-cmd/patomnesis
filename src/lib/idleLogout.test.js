import test from "node:test";
import assert from "node:assert/strict";
import { createIdleTimer } from "./idleLogout.js";

function createFakeClock() {
  let currentTime = 0;
  let nextTimerId = 0;
  const timers = new Map();

  return {
    advance(ms) {
      currentTime += ms;
    },
    clearTimer(timerId) {
      timers.delete(timerId);
    },
    getDelay() {
      return Array.from(timers.values())[0]?.delay;
    },
    now() {
      return currentTime;
    },
    runTimer() {
      const [timerId, timer] = timers.entries().next().value || [];
      if (!timer) return;
      timers.delete(timerId);
      timer.callback();
    },
    setTimer(callback, delay) {
      nextTimerId += 1;
      timers.set(nextTimerId, { callback, delay });
      return nextTimerId;
    }
  };
}

test("cierra la sesión al alcanzar el tiempo de inactividad", () => {
  const clock = createFakeClock();
  let timeoutCount = 0;
  createIdleTimer({
    clearTimer: clock.clearTimer,
    now: clock.now,
    onTimeout: () => {
      timeoutCount += 1;
    },
    setTimer: clock.setTimer,
    timeoutMs: 1_000
  });

  clock.advance(1_000);
  clock.runTimer();

  assert.equal(timeoutCount, 1);
});

test("la actividad reinicia el periodo de inactividad", () => {
  const clock = createFakeClock();
  let timeoutCount = 0;
  const idleTimer = createIdleTimer({
    clearTimer: clock.clearTimer,
    now: clock.now,
    onTimeout: () => {
      timeoutCount += 1;
    },
    setTimer: clock.setTimer,
    timeoutMs: 1_000
  });

  clock.advance(700);
  idleTimer.recordActivity();
  clock.advance(300);
  clock.runTimer();

  assert.equal(timeoutCount, 0);
  assert.equal(clock.getDelay(), 700);
});

test("detecta el vencimiento al volver de una pestaña suspendida", () => {
  const clock = createFakeClock();
  let timeoutCount = 0;
  const idleTimer = createIdleTimer({
    clearTimer: clock.clearTimer,
    now: clock.now,
    onTimeout: () => {
      timeoutCount += 1;
    },
    setTimer: clock.setTimer,
    timeoutMs: 1_000
  });

  clock.advance(1_500);
  idleTimer.check();
  idleTimer.check();

  assert.equal(timeoutCount, 1);
});
