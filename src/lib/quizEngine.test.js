import test from "node:test";
import assert from "node:assert/strict";
import {
  getDifficultyPlan,
  getSmartSessionSummary,
  isAnswerFromToday,
  selectSmartQuestions
} from "./quizEngine.js";

function question(id, category, difficulty = "intermediate") {
  return {
    id,
    category,
    difficulty,
    stem: id,
    options: [
      { id: `${id}-a`, text: "Correcta", isCorrect: true },
      { id: `${id}-b`, text: "Incorrecta", isCorrect: false }
    ]
  };
}

function answer(questionId, category, isCorrect, answeredAt) {
  return { questionId, category, isCorrect, answeredAt };
}

test("identifica respuestas del día usando la fecha local", () => {
  const now = new Date(2026, 6, 10, 12, 0, 0);
  assert.equal(isAnswerFromToday({ answeredAt: new Date(2026, 6, 10, 8).toISOString() }, now), true);
  assert.equal(isAnswerFromToday({ answeredAt: new Date(2026, 6, 9, 23).toISOString() }, now), false);
});

test("el resumen muestra solo las debilidades de hoy", () => {
  const questions = [question("q1", "Hoy"), question("q2", "Ayer")];
  const history = [
    answer("q2", "Ayer", false, new Date(Date.now() - 86_400_000).toISOString()),
    answer("q1", "Hoy", false, new Date().toISOString())
  ];
  const summary = getSmartSessionSummary(questions, history);
  assert.deepEqual(summary.weakTopics, ["Hoy"]);
  assert.equal(summary.hasActivityToday, true);
  assert.equal(summary.criteria[0], "Fallos recientes");
});

test("sin actividad de hoy no presenta categorías iniciales como debilidades", () => {
  const questions = [question("q1", "Inicial")];
  const summary = getSmartSessionSummary(questions, []);
  assert.equal(summary.hasActivityToday, false);
  assert.equal(summary.criteria[0], "Diagnóstico inicial");
});

test("prioriza un fallo reciente frente a un fallo antiguo", () => {
  const questions = [question("recent", "A"), question("old", "B")];
  const history = [
    answer("old", "B", false, "2025-01-01T10:00:00Z"),
    ...Array.from({ length: 30 }, (_, index) =>
      answer(`filler-${index}`, "C", true, `2026-07-${String(index + 1).padStart(2, "0")}T10:00:00Z`)
    ),
    answer("recent", "A", false, "2026-08-01T10:00:00Z")
  ];
  assert.equal(selectSmartQuestions(questions, history, 1)[0].id, "recent");
});

test("la dificultad usa el rendimiento reciente y no toda la vida", () => {
  const history = [
    ...Array.from({ length: 20 }, (_, index) => answer(`old-${index}`, "A", false, `2025-01-${String(index + 1).padStart(2, "0")}T10:00:00Z`)),
    ...Array.from({ length: 20 }, (_, index) => answer(`new-${index}`, "A", true, `2026-01-${String(index + 1).padStart(2, "0")}T10:00:00Z`))
  ];
  assert.deepEqual(getDifficultyPlan(history), { basic: 1, intermediate: 3, advanced: 2 });
});
