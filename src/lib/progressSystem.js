const PATO_LEVELS = [
  { level: 1, name: "Larva de Laboratorio", minXp: 0, minAccuracy: 0 },
  { level: 2, name: "Aprendiz de Formol", minXp: 50, minAccuracy: 50 },
  { level: 3, name: "Cazador de Portaobjetos", minXp: 200, minAccuracy: 50 },
  { level: 4, name: "Sabueso de Biopsias", minXp: 400, minAccuracy: 55 },
  { level: 5, name: "Domador del Microscopio", minXp: 700, minAccuracy: 55 },
  { level: 6, name: "Detective de Tejidos", minXp: 1100, minAccuracy: 60 },
  { level: 7, name: "Oráculo del Diagnóstico", minXp: 1600, minAccuracy: 65 },
  { level: 8, name: "Maestro de la Patología", minXp: 2200, minAccuracy: 70 },
  { level: 9, name: "Leyenda de la Academia", minXp: 3000, minAccuracy: 75 },
  { level: 10, name: "Patólogo Supremo", minXp: 4000, minAccuracy: 80 }
];

const CORRECT_XP_BY_DIFFICULTY = {
  basic: 1,
  intermediate: 2,
  advanced: 3
};

const INCORRECT_XP = -0.33;

function roundXp(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getLocalDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return getLocalDateKey(date.toISOString());
}

function getAnswerXp(answer) {
  if (!answer?.isCorrect) return INCORRECT_XP;
  return CORRECT_XP_BY_DIFFICULTY[answer.difficulty] || CORRECT_XP_BY_DIFFICULTY.basic;
}

function calculatePatoXp(history) {
  const total = history.reduce((sum, answer) => sum + getAnswerXp(answer), 0);
  return roundXp(Math.max(0, total));
}

function calculateStreak(history, now = new Date()) {
  const activeDays = new Set(history.map((answer) => getLocalDateKey(answer.answeredAt)).filter(Boolean));
  if (!activeDays.size) return 0;

  const today = getLocalDateKey(now.toISOString());
  const yesterday = shiftDateKey(today, -1);
  let cursor = activeDays.has(today) ? today : activeDays.has(yesterday) ? yesterday : "";
  if (!cursor) return 0;

  let streak = 0;
  while (activeDays.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
}

function getLevelProgress(xp, accuracy) {
  const currentLevel =
    [...PATO_LEVELS].reverse().find((level) => xp >= level.minXp && accuracy >= level.minAccuracy) || PATO_LEVELS[0];
  const nextLevel = PATO_LEVELS.find((level) => level.level === currentLevel.level + 1) || null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progressToNext: 100,
      xpToNext: 0,
      accuracyToNext: 0
    };
  }

  const previousXp = currentLevel.minXp;
  const previousAccuracy = currentLevel.minAccuracy;
  const xpSpan = Math.max(1, nextLevel.minXp - previousXp);
  const accuracySpan = Math.max(1, nextLevel.minAccuracy - previousAccuracy);
  const xpProgress = Math.min(1, Math.max(0, (xp - previousXp) / xpSpan));
  const accuracyProgress = Math.min(1, Math.max(0, (accuracy - previousAccuracy) / accuracySpan));

  return {
    currentLevel,
    nextLevel,
    progressToNext: Math.round(Math.min(xpProgress, accuracyProgress) * 100),
    xpToNext: roundXp(Math.max(0, nextLevel.minXp - xp)),
    accuracyToNext: Math.max(0, Math.round((nextLevel.minAccuracy - accuracy) * 10) / 10)
  };
}

function buildLeaderboardFromHistory(history) {
  const users = new Map();

  history.forEach((answer) => {
    const userId = answer.userId || "local-user";
    const current = users.get(userId) || {
      userId,
      userName: answer.userName || "Usuario",
      answered: 0,
      correct: 0,
      patoXp: 0
    };

    current.answered += 1;
    if (answer.isCorrect) current.correct += 1;
    current.patoXp += getAnswerXp(answer);
    users.set(userId, current);
  });

  return Array.from(users.values())
    .map((user) => ({ ...user, patoXp: roundXp(Math.max(0, user.patoXp)) }))
    .sort(
    (a, b) => b.patoXp - a.patoXp || b.correct - a.correct || b.answered - a.answered
    );
}

function normalizeRemoteLeaderboard(rows) {
  return rows
    .map((row) => ({
      userId: row.profile_id || row.userId,
      userName: row.full_name || row.email || row.userName || "Usuario",
      answered: Number(row.total_answers || row.answered || 0),
      correct: Number(row.correct_answers || row.correct || 0),
      patoXp: Number(row.pato_xp || row.patoXp || 0)
    }))
    .sort((a, b) => b.patoXp - a.patoXp || b.correct - a.correct || b.answered - a.answered);
}

function buildProgressSummary({ allHistory, currentUser, ownHistory, questions, remoteLeaderboard = [] }) {
  const answered = ownHistory.length;
  const correct = ownHistory.filter((answer) => answer.isCorrect).length;
  const patoXp = calculatePatoXp(ownHistory);
  const streakDays = calculateStreak(ownHistory);
  const uniqueAnswered = new Set(ownHistory.map((answer) => answer.questionId)).size;
  const coverageTotal = questions.length;
  const accuracy = answered ? Math.round((correct / answered) * 1000) / 10 : 0;
  const levelProgress = getLevelProgress(patoXp, accuracy);
  const leaderboard = remoteLeaderboard.length
    ? normalizeRemoteLeaderboard(remoteLeaderboard)
    : buildLeaderboardFromHistory(allHistory.length ? allHistory : ownHistory);
  const positionIndex = leaderboard.findIndex((entry) => entry.userId === currentUser?.id);
  const rankingPosition = positionIndex >= 0 ? positionIndex + 1 : leaderboard.length ? null : 1;

  return {
    accuracy,
    answered,
    correct,
    coverageAnswered: uniqueAnswered,
    coverageTotal,
    leaderboardSize: Math.max(leaderboard.length, currentUser ? 1 : 0),
    level: levelProgress.currentLevel.level,
    levelName: levelProgress.currentLevel.name,
    nextLevel: levelProgress.nextLevel,
    patoXp,
    progressToNext: levelProgress.progressToNext,
    rankingPosition,
    streakDays,
    xpToNext: levelProgress.xpToNext,
    accuracyToNext: levelProgress.accuracyToNext
  };
}

export {
  PATO_LEVELS,
  buildProgressSummary,
  calculatePatoXp,
  calculateStreak,
  getAnswerXp,
  getLevelProgress
};
