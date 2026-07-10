const PATO_LEVELS = [
  { level: 1, name: "Aprendiz", minXp: 0, minAnswers: 0 },
  { level: 2, name: "Observador", minXp: 10, minAnswers: 15 },
  { level: 3, name: "Explorador", minXp: 30, minAnswers: 30 },
  { level: 4, name: "Analista", minXp: 70, minAnswers: 60 },
  { level: 5, name: "Clínico", minXp: 130, minAnswers: 100 },
  { level: 6, name: "Diagnóstico", minXp: 220, minAnswers: 160 },
  { level: 7, name: "Consultor", minXp: 350, minAnswers: 240 },
  { level: 8, name: "Experto", minXp: 520, minAnswers: 340 },
  { level: 9, name: "Maestro", minXp: 750, minAnswers: 480 },
  { level: 10, name: "Referente", minXp: 1050, minAnswers: 650 }
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

function getLevelProgress(xp, answered) {
  const currentLevel =
    [...PATO_LEVELS].reverse().find((level) => xp >= level.minXp && answered >= level.minAnswers) || PATO_LEVELS[0];
  const nextLevel = PATO_LEVELS.find((level) => level.level === currentLevel.level + 1) || null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progressToNext: 100,
      xpToNext: 0,
      answersToNext: 0
    };
  }

  const previousXp = currentLevel.minXp;
  const previousAnswers = currentLevel.minAnswers;
  const xpSpan = Math.max(1, nextLevel.minXp - previousXp);
  const answerSpan = Math.max(1, nextLevel.minAnswers - previousAnswers);
  const xpProgress = Math.min(1, Math.max(0, (xp - previousXp) / xpSpan));
  const answerProgress = Math.min(1, Math.max(0, (answered - previousAnswers) / answerSpan));

  return {
    currentLevel,
    nextLevel,
    progressToNext: Math.round(Math.min(xpProgress, answerProgress) * 100),
    xpToNext: roundXp(Math.max(0, nextLevel.minXp - xp)),
    answersToNext: Math.max(0, nextLevel.minAnswers - answered)
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
  const levelProgress = getLevelProgress(patoXp, answered);
  const leaderboard = remoteLeaderboard.length
    ? normalizeRemoteLeaderboard(remoteLeaderboard)
    : buildLeaderboardFromHistory(allHistory.length ? allHistory : ownHistory);
  const positionIndex = leaderboard.findIndex((entry) => entry.userId === currentUser?.id);
  const rankingPosition = positionIndex >= 0 ? positionIndex + 1 : leaderboard.length ? null : 1;

  return {
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
    answersToNext: levelProgress.answersToNext
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
