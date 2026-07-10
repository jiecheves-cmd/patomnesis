import { roleLabels } from "../data/questions.js";

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function cloneQuestion(question) {
  return {
    ...question,
    options: question.options.map((option) => ({ ...option }))
  };
}

function shuffleQuestionOptions(question) {
  return {
    ...question,
    options: shuffle(question.options).map((option) => ({ ...option }))
  };
}

function prepareDeck(source, count) {
  return shuffle(source)
    .slice(0, Math.min(count, source.length))
    .map((question) => shuffleQuestionOptions(question));
}

function timestampOf(answer) {
  const timestamp = Date.parse(answer?.answeredAt || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortHistory(history) {
  return history
    .map((answer, index) => ({ answer, index, timestamp: timestampOf(answer) }))
    .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)
    .map(({ answer }) => answer);
}

function isAnswerFromToday(answer, now = new Date()) {
  const timestamp = timestampOf(answer);
  if (!timestamp) return false;
  const date = new Date(timestamp);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

const roleAliases = {
  alumno: "student",
  profesor: "teacher",
  supervisor: "supervisor",
  student: "student",
  teacher: "teacher",
  admin: "admin"
};

const roleAccess = {
  student: ["student"],
  teacher: ["student", "teacher"],
  supervisor: ["student", "teacher", "supervisor"],
  admin: ["student", "teacher", "supervisor"]
};

const managedRoleOptions = ["student", "teacher", "supervisor"];

function getInitialSession() {
  const params = new URLSearchParams(window.location.search);
  const requestedUserRole = params.get("user") || params.get("usuario") || params.get("perfil");
  const requestedViewRole = params.get("role") || params.get("modo");
  const userRole = roleAliases[requestedUserRole] || roleAliases[requestedViewRole] || "supervisor";
  const allowedRoles = roleAccess[userRole];
  const viewRole = roleAliases[requestedViewRole] || userRole;

  return {
    userRole,
    viewRole: allowedRoles.includes(viewRole) ? viewRole : userRole
  };
}

function buildLearningProfile(history, questions) {
  const orderedHistory = sortHistory(history);
  const recentHistory = orderedHistory.slice(-30);
  const categoryStats = new Map();
  const questionStats = new Map();

  questions.forEach((question) => {
    categoryStats.set(question.category, { attempts: 0, correct: 0, wrong: 0, precision: 100 });
    questionStats.set(question.id, {
      attempts: 0,
      correct: 0,
      wrong: 0,
      lastSeen: 0,
      latestCorrect: null,
      recentWrongWeight: 0
    });
  });

  orderedHistory.forEach((answer, index) => {
    const category = categoryStats.get(answer.category) || { attempts: 0, correct: 0, wrong: 0, precision: 100 };
    const question = questionStats.get(answer.questionId) || {
      attempts: 0,
      correct: 0,
      wrong: 0,
      lastSeen: 0,
      latestCorrect: null,
      recentWrongWeight: 0
    };

    category.attempts += 1;
    question.attempts += 1;
    question.lastSeen = index + 1;
    question.latestCorrect = answer.isCorrect;

    if (answer.isCorrect) {
      category.correct += 1;
      question.correct += 1;
    } else {
      category.wrong += 1;
      question.wrong += 1;
    }

    category.precision = Math.round((category.correct / category.attempts) * 100);
    categoryStats.set(answer.category, category);
    questionStats.set(answer.questionId, question);
  });

  recentHistory.forEach((answer, index) => {
    if (answer.isCorrect) return;
    const question = questionStats.get(answer.questionId);
    if (!question) return;
    // Un fallo de la última respuesta pesa 1; el más antiguo de la ventana, 1/30.
    question.recentWrongWeight += (index + 1) / recentHistory.length;
  });

  const recentCategoryStats = new Map();
  recentHistory.forEach((answer) => {
    const current = recentCategoryStats.get(answer.category) || { attempts: 0, correct: 0, wrong: 0, precision: 100 };
    current.attempts += 1;
    if (answer.isCorrect) current.correct += 1;
    else current.wrong += 1;
    current.precision = Math.round((current.correct / current.attempts) * 100);
    recentCategoryStats.set(answer.category, current);
  });

  const weakCategories = Array.from(recentCategoryStats.entries())
    .filter(([, value]) => value.attempts > 0)
    .sort((a, b) => a[1].precision - b[1].precision || b[1].wrong - a[1].wrong)
    .map(([category]) => category);

  return { categoryStats, questionStats, recentCategoryStats, weakCategories };
}

function getDifficultyPlan(history) {
  const recentHistory = sortHistory(history).slice(-20);
  if (recentHistory.length < 4) return { basic: 3, intermediate: 2, advanced: 1 };

  const correct = recentHistory.filter((answer) => answer.isCorrect).length;
  const precision = Math.round((correct / recentHistory.length) * 100);

  if (precision < 55) return { basic: 4, intermediate: 2, advanced: 0 };
  if (precision < 80) return { basic: 2, intermediate: 3, advanced: 1 };
  return { basic: 1, intermediate: 3, advanced: 2 };
}

function selectSmartQuestions(questions, history, count) {
  const profile = buildLearningProfile(history, questions);
  const difficultyPlan = getDifficultyPlan(history);
  const maxPerCategory = Math.max(2, Math.ceil(count / 3));
  const categoryUsage = new Map();
  const selected = [];

  const scoredQuestions = questions
    .map((question) => {
      const questionStats = profile.questionStats.get(question.id) || {
        attempts: 0,
        correct: 0,
        wrong: 0,
        lastSeen: 0,
        latestCorrect: null,
        recentWrongWeight: 0
      };
      const categoryStats = profile.recentCategoryStats.get(question.category) || { attempts: 0, precision: 100, wrong: 0 };
      const isWeakCategory = profile.weakCategories.slice(0, 3).includes(question.category);
      const isNew = questionStats.attempts === 0;
      const difficultyNeed = difficultyPlan[question.difficulty] || 0;
      const recencyPenalty = questionStats.lastSeen ? questionStats.lastSeen / Math.max(1, history.length) : 0;

      return {
        question,
        score:
          questionStats.recentWrongWeight * 8 +
          (questionStats.latestCorrect === false ? 4 : 0) +
          (isWeakCategory ? 4 : 0) +
          (isNew ? 3 : 0) +
          difficultyNeed * 1.8 +
          (categoryStats.precision < 70 ? 2 : 0) -
          (questionStats.latestCorrect === true ? 1.5 : 0) -
          recencyPenalty
      };
    })
    .sort((a, b) => b.score - a.score);

  scoredQuestions.forEach(({ question }) => {
    if (selected.length >= count) return;
    const usedInCategory = categoryUsage.get(question.category) || 0;
    if (usedInCategory >= maxPerCategory && selected.length < questions.length - 1) return;
    selected.push(question);
    categoryUsage.set(question.category, usedInCategory + 1);
  });

  scoredQuestions.forEach(({ question }) => {
    if (selected.length >= count) return;
    if (selected.some((item) => item.id === question.id)) return;
    selected.push(question);
  });

  return selected.slice(0, count).map((question) => shuffleQuestionOptions(question));
}

function getSmartSessionSummary(questions, history) {
  const todayHistory = history.filter((answer) => isAnswerFromToday(answer));
  const profile = buildLearningProfile(todayHistory, questions);
  const starterTopics = Array.from(new Set(questions.map((question) => question.category))).slice(0, 3);
  const weakTopics = profile.weakCategories.length
    ? profile.weakCategories.slice(0, 3)
    : starterTopics;
  const criteria = todayHistory.length
    ? ["Fallos recientes", "Áreas débiles", "Dificultad adaptativa", "Preguntas no vistas"]
    : ["Diagnóstico inicial", "Variedad de temas", "Base e intermedia", "Preguntas no vistas"];

  return { criteria, weakTopics, hasActivityToday: todayHistory.length > 0 };
}

function buildCategoryMastery(history, questions, categories) {
  const categoryMap = new Map();

  categories.forEach((category) => {
    categoryMap.set(category, {
      category,
      attempts: 0,
      correct: 0,
      wrong: 0,
      precision: 0,
      questionCount: 0
    });
  });

  questions.forEach((question) => {
    const category = question.category || "Sin clasificar";
    const current = categoryMap.get(category) || {
      category,
      attempts: 0,
      correct: 0,
      wrong: 0,
      precision: 0,
      questionCount: 0
    };
    current.questionCount += 1;
    categoryMap.set(category, current);
  });

  history.forEach((answer) => {
    const category = answer.category || "Sin clasificar";
    const current = categoryMap.get(category) || {
      category,
      attempts: 0,
      correct: 0,
      wrong: 0,
      precision: 0,
      questionCount: 0
    };

    current.attempts += 1;
    if (answer.isCorrect) current.correct += 1;
    else current.wrong += 1;
    current.precision = Math.round((current.correct / current.attempts) * 100);
    categoryMap.set(category, current);
  });

  return Array.from(categoryMap.values()).filter((item) => item.questionCount > 0 || item.attempts > 0);
}

function getSessionUser(session) {
  return {
    id: `local-${session.userRole}`,
    initials: session.userRole === "student" ? "AL" : session.userRole === "teacher" ? "PR" : "SU",
    name: roleLabels[session.userRole],
    role: session.userRole
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function describeSupabaseError(error) {
  const message = error?.message || error?.error_description || error?.details || "error desconocido";
  if (message.length > 90) return `${message.slice(0, 90)}...`;
  return message;
}

export {
  shuffle,
  cloneQuestion,
  shuffleQuestionOptions,
  prepareDeck,
  roleAliases,
  roleAccess,
  managedRoleOptions,
  getInitialSession,
  isAnswerFromToday,
  buildLearningProfile,
  getDifficultyPlan,
  selectSmartQuestions,
  getSmartSessionSummary,
  buildCategoryMastery,
  getSessionUser,
  isUuid,
  describeSupabaseError
};
