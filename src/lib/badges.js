import { getLocalDateKey, getWeekStartKey } from "./progressSystem.js";

const CATEGORY_MASTERY_MIN_ATTEMPTS = 10;
const CATEGORY_MASTERY_MIN_PRECISION = 80;

function getMaxConsecutiveCorrect(history) {
  const sorted = [...history].sort((a, b) => Date.parse(a.answeredAt || 0) - Date.parse(b.answeredAt || 0));
  let max = 0;
  let current = 0;

  sorted.forEach((answer) => {
    if (answer.isCorrect) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  });

  return max;
}

function countMasteredCategories(categoryMastery) {
  return categoryMastery.filter(
    (item) => item.attempts >= CATEGORY_MASTERY_MIN_ATTEMPTS && item.precision >= CATEGORY_MASTERY_MIN_PRECISION
  ).length;
}

function countWeeksWithDailyGoal(history, { minPerDay, minDaysPerWeek }) {
  const perWeekPerDay = new Map();

  history.forEach((answer) => {
    const dayKey = getLocalDateKey(answer.answeredAt);
    if (!dayKey) return;
    const weekStart = getWeekStartKey(dayKey);
    if (!weekStart) return;

    if (!perWeekPerDay.has(weekStart)) perWeekPerDay.set(weekStart, new Map());
    const dayMap = perWeekPerDay.get(weekStart);
    dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
  });

  const currentWeekStart = getWeekStartKey(getLocalDateKey(new Date().toISOString()));
  let timesEarned = 0;
  let currentWeekQualifyingDays = 0;

  perWeekPerDay.forEach((dayMap, weekStart) => {
    const qualifyingDays = Array.from(dayMap.values()).filter((count) => count >= minPerDay).length;
    if (qualifyingDays >= minDaysPerWeek) timesEarned += 1;
    if (weekStart === currentWeekStart) currentWeekQualifyingDays = qualifyingDays;
  });

  return { currentWeekQualifyingDays, timesEarned };
}

function clampProgress(current, target) {
  return Math.min(1, target > 0 ? current / target : 0);
}

const BADGES = [
  {
    id: "constancia-3-de-7",
    group: "Constancia",
    image: "/badges/3-dias-semana.png",
    name: "3 días/7",
    description: "Responde al menos 20 preguntas en 3 días distintos de la misma semana.",
    repeatable: true,
    evaluate: ({ history }) => {
      const { currentWeekQualifyingDays, timesEarned } = countWeeksWithDailyGoal(history, {
        minPerDay: 20,
        minDaysPerWeek: 3
      });

      return {
        timesEarned,
        progress: Math.min(1, currentWeekQualifyingDays / 3),
        progressLabel: `${Math.min(currentWeekQualifyingDays, 3)}/3 días esta semana`
      };
    }
  },
  {
    id: "precision-60",
    group: "Precisión",
    image: "/badges/aprobado-raspado.png",
    name: "Aprobado Raspado",
    description: "Mantén una precisión global del 60% o más (con al menos 20 preguntas respondidas).",
    repeatable: false,
    evaluate: ({ summary }) => ({
      current: summary.answered >= 20 ? summary.accuracy : 0,
      target: 60,
      secondary: { current: summary.answered, target: 20 }
    })
  },
  {
    id: "precision-70",
    group: "Precisión",
    image: "/badges/nivel-residente-espabilado.png",
    name: "Nivel Residente Espabilado",
    description: "Mantén una precisión global del 70% o más (con al menos 20 preguntas respondidas).",
    repeatable: false,
    evaluate: ({ summary }) => ({
      current: summary.answered >= 20 ? summary.accuracy : 0,
      target: 70,
      secondary: { current: summary.answered, target: 20 }
    })
  }
];

function evaluateBadges({ categoryMastery, history, summary, weeklyWins }) {
  return BADGES.map((badge) => {
    const result = badge.evaluate({ categoryMastery, history, summary, weeklyWins });

    if (result.timesEarned !== undefined) {
      return {
        description: badge.description,
        earned: result.timesEarned > 0,
        group: badge.group,
        icon: badge.icon,
        id: badge.id,
        image: badge.image,
        name: badge.name,
        progress: result.progress ?? (result.timesEarned > 0 ? 1 : 0),
        progressLabel: result.progressLabel ?? "",
        repeatable: true,
        timesEarned: result.timesEarned
      };
    }

    const { current, target, secondary } = result;
    const safeTarget = target > 0 ? target : 1;
    const secondaryMet = !secondary || secondary.current >= secondary.target;

    if (badge.repeatable) {
      const timesEarned = secondaryMet ? Math.floor(current / safeTarget) : 0;
      const remainder = current - timesEarned * safeTarget;

      return {
        description: badge.description,
        earned: timesEarned > 0,
        group: badge.group,
        icon: badge.icon,
        id: badge.id,
        image: badge.image,
        name: badge.name,
        progress: clampProgress(remainder, safeTarget),
        progressLabel: `${remainder}/${safeTarget}`,
        repeatable: true,
        timesEarned
      };
    }

    const earned = current >= safeTarget && secondaryMet;

    return {
      description: badge.description,
      earned,
      group: badge.group,
      icon: badge.icon,
      id: badge.id,
      image: badge.image,
      name: badge.name,
      progress: clampProgress(current, safeTarget),
      progressLabel: `${Math.min(current, safeTarget)}/${safeTarget}`,
      repeatable: false,
      timesEarned: earned ? 1 : 0
    };
  });
}

export { BADGES, evaluateBadges };
