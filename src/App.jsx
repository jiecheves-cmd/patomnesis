import React, { useEffect, useMemo, useRef, useState } from "react";
import { difficultyLabels, questionThemes, roleLabels, seedQuestions } from "./data/questions.js";
import {
  createQuizAttempt,
  createManagedUser,
  deleteManagedUser,
  fetchProfiles,
  fetchPublishedQuestions,
  finishQuizAttempt,
  getCurrentProfileSession,
  isSupabaseConfigured,
  recordQuizAnswer,
  signInWithPassword,
  signOutUser,
  updateOwnPassword,
  updateOwnProfile,
  updateOwnUserMetadata,
  updateProfileRole
} from "./lib/supabase.js";

const emptyQuestion = {
  id: "",
  category: "",
  topic: "",
  difficulty: "basic",
  stem: "",
  imageUrl: "",
  options: [
    { id: "new-a", text: "", isCorrect: true },
    { id: "new-b", text: "", isCorrect: false },
    { id: "new-c", text: "", isCorrect: false },
    { id: "new-d", text: "", isCorrect: false }
  ],
  explanation: "",
  keyPoint: ""
};

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

const difficultyAliases = {
  avanzada: "advanced",
  advanced: "advanced",
  alta: "advanced",
  basica: "basic",
  basic: "basic",
  baja: "basic",
  intermedia: "intermediate",
  intermediate: "intermediate",
  media: "intermediate"
};

const importColumnAliases = {
  category: ["tema_principal", "tema principal", "categoria", "categoría", "category"],
  topic: ["tema", "subtema", "topic"],
  difficulty: ["dificultad", "nivel", "difficulty"],
  stem: ["enunciado", "pregunta", "question", "stem"],
  imageUrl: ["imagen", "imagen_url", "url_imagen", "image", "image_url", "imageurl"],
  correct: ["respuesta_correcta", "respuesta correcta", "correcta", "correct", "answer"],
  distractor1: ["distractor_1", "distractor 1", "opcion_b", "opción_b", "opcion b", "opción b"],
  distractor2: ["distractor_2", "distractor 2", "opcion_c", "opción_c", "opcion c", "opción c"],
  distractor3: ["distractor_3", "distractor 3", "opcion_d", "opción_d", "opcion d", "opción d"],
  explanation: ["explicacion", "explicación", "feedback", "explanation"],
  keyPoint: ["idea_clave", "idea clave", "clave", "key_point", "keypoint"]
};

function normalizeText(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeHeader(value) {
  return normalizeText(value).replace(/[\s-]+/g, "_");
}

function getImportValue(row, field) {
  const aliases = importColumnAliases[field].map(normalizeHeader);
  const match = Object.entries(row).find(([key]) => aliases.includes(normalizeHeader(key)));
  return match ? String(match[1] || "").trim() : "";
}

function normalizeDifficulty(value) {
  return difficultyAliases[normalizeText(value)] || "basic";
}

function normalizeTheme(value) {
  const normalized = normalizeText(value);
  return questionThemes.find((theme) => normalizeText(theme) === normalized) || value || questionThemes[0];
}

function buildImportedQuestions(rows) {
  const imported = [];
  const skipped = [];
  const timestamp = Date.now();

  rows.forEach((row, index) => {
    const stem = getImportValue(row, "stem");
    const correct = getImportValue(row, "correct");
    const distractors = [
      getImportValue(row, "distractor1"),
      getImportValue(row, "distractor2"),
      getImportValue(row, "distractor3")
    ].filter(Boolean);

    if (!stem || !correct || distractors.length < 1) {
      skipped.push(index + 2);
      return;
    }

    const id = `import-${timestamp}-${index}`;
    imported.push({
      id,
      category: normalizeTheme(getImportValue(row, "category")),
      topic: getImportValue(row, "topic"),
      difficulty: normalizeDifficulty(getImportValue(row, "difficulty")),
      stem,
      imageUrl: getImportValue(row, "imageUrl"),
      options: [correct, ...distractors].slice(0, 4).map((text, optionIndex) => ({
        id: `${id}-option-${optionIndex}`,
        text,
        isCorrect: optionIndex === 0
      })),
      explanation: getImportValue(row, "explanation"),
      keyPoint: getImportValue(row, "keyPoint")
    });
  });

  return { imported, skipped };
}

async function readQuestionRowsFromFile(file) {
  const { read, utils } = await import("xlsx");
  const data = await file.arrayBuffer();
  const workbook = read(data, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return utils.sheet_to_json(sheet, { defval: "" });
}

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
  const categoryStats = new Map();
  const questionStats = new Map();

  questions.forEach((question) => {
    categoryStats.set(question.category, { attempts: 0, correct: 0, wrong: 0, precision: 100 });
    questionStats.set(question.id, { attempts: 0, correct: 0, wrong: 0, lastSeen: 0 });
  });

  history.forEach((answer, index) => {
    const category = categoryStats.get(answer.category) || { attempts: 0, correct: 0, wrong: 0, precision: 100 };
    const question = questionStats.get(answer.questionId) || { attempts: 0, correct: 0, wrong: 0, lastSeen: 0 };

    category.attempts += 1;
    question.attempts += 1;
    question.lastSeen = index + 1;

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

  const weakCategories = Array.from(categoryStats.entries())
    .filter(([, value]) => value.attempts > 0)
    .sort((a, b) => a[1].precision - b[1].precision || b[1].wrong - a[1].wrong)
    .map(([category]) => category);

  return { categoryStats, questionStats, weakCategories };
}

function getDifficultyPlan(history) {
  if (history.length < 4) return { basic: 3, intermediate: 2, advanced: 1 };

  const correct = history.filter((answer) => answer.isCorrect).length;
  const precision = Math.round((correct / history.length) * 100);

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
      const questionStats = profile.questionStats.get(question.id) || { attempts: 0, correct: 0, wrong: 0, lastSeen: 0 };
      const categoryStats = profile.categoryStats.get(question.category) || { attempts: 0, precision: 100, wrong: 0 };
      const isWeakCategory = profile.weakCategories.slice(0, 3).includes(question.category);
      const isNew = questionStats.attempts === 0;
      const difficultyNeed = difficultyPlan[question.difficulty] || 0;
      const recencyPenalty = questionStats.lastSeen ? questionStats.lastSeen / Math.max(1, history.length) : 0;

      return {
        question,
        score:
          questionStats.wrong * 6 +
          (isWeakCategory ? 4 : 0) +
          (isNew ? 3 : 0) +
          difficultyNeed * 1.8 +
          (categoryStats.precision < 70 ? 2 : 0) -
          questionStats.correct * 0.9 -
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
  const profile = buildLearningProfile(history, questions);
  const starterTopics = Array.from(new Set(questions.map((question) => question.category))).slice(0, 3);
  const weakTopics = profile.weakCategories.length
    ? profile.weakCategories.slice(0, 3)
    : starterTopics;
  const criteria = history.length
    ? ["Fallos recientes", "Áreas débiles", "Dificultad adaptativa", "Preguntas no vistas"]
    : ["Diagnóstico inicial", "Variedad de temas", "Base e intermedia", "Preguntas no vistas"];

  return { criteria, weakTopics };
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

function App() {
  const [session] = useState(() => getInitialSession());
  const [role, setRole] = useState(session.viewRole);
  const [questions, setQuestions] = useState(seedQuestions);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [difficulty, setDifficulty] = useState("Todas");
  const [deck, setDeck] = useState(() => prepareDeck(seedQuestions, 6));
  const [questionCount, setQuestionCount] = useState(10);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizMode, setQuizMode] = useState("practice");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answerHistory, setAnswerHistory] = useState([]);
  const [activeAttemptId, setActiveAttemptId] = useState(null);
  const [attemptFinished, setAttemptFinished] = useState(false);
  const [editorQuestion, setEditorQuestion] = useState(() => cloneQuestion(emptyQuestion));
  const [editingId, setEditingId] = useState(null);
  const [importMessage, setImportMessage] = useState("");
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [supabaseProfile, setSupabaseProfile] = useState(null);
  const [supabaseStatus, setSupabaseStatus] = useState(
    isSupabaseConfigured ? "Conectando Supabase..." : "Demo local"
  );
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const categories = useMemo(
    () =>
      Array.from(new Set([...questionThemes, ...questions.map((question) => question.category)])).filter(Boolean),
    [questions]
  );

  const currentQuestion = deck[currentIndex];
  const currentAnswer = currentQuestion
    ? answers.find((answer) => answer.questionId === currentQuestion.id)
    : null;

  const filteredQuestions = useMemo(
    () =>
      questions.filter((question) => {
        const categoryMatch =
          selectedCategories.length === 0 || selectedCategories.includes(question.category);
        const difficultyMatch = difficulty === "Todas" || question.difficulty === difficulty;
        return categoryMatch && difficultyMatch;
      }),
    [difficulty, questions, selectedCategories]
  );

  const stats = useMemo(() => {
    const correct = answers.filter((answer) => answer.isCorrect).length;
    const precision = answers.length ? Math.round((correct / answers.length) * 100) : 0;
    return { correct, precision, answered: answers.length };
  }, [answers]);

  const learningStats = useMemo(() => {
    const correct = answerHistory.filter((answer) => answer.isCorrect).length;
    const precision = answerHistory.length ? Math.round((correct / answerHistory.length) * 100) : 0;
    return { correct, precision, answered: answerHistory.length };
  }, [answerHistory]);

  const smartSession = useMemo(
    () => getSmartSessionSummary(questions, answerHistory),
    [answerHistory, questions]
  );

  const currentUser = useMemo(() => {
    if (!supabaseUser) return getSessionUser(session);

    return {
      id: supabaseUser.id,
      initials: (supabaseProfile?.full_name || supabaseProfile?.email || "US")
        .slice(0, 2)
        .toUpperCase(),
      name: supabaseProfile?.full_name || supabaseProfile?.email || "Usuario Supabase",
      role: supabaseProfile?.role || "student"
    };
  }, [session, supabaseProfile, supabaseUser]);
  const availableRoles = roleAccess[currentUser.role] || roleAccess.student;

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;

    async function connectSupabase() {
      setAuthLoading(true);
      setSupabaseStatus("Conectando Supabase...");

      const results = await Promise.allSettled([
        fetchPublishedQuestions(),
        getCurrentProfileSession()
      ]);

      if (cancelled) return;

      const [questionsResult, authResult] = results;
      const remoteQuestions = questionsResult.status === "fulfilled" ? questionsResult.value : [];
      const auth = authResult.status === "fulfilled" ? authResult.value : { profile: null, user: null };

      if (questionsResult.status === "rejected") {
        console.warn("No se pudieron leer preguntas de Supabase", questionsResult.reason);
      }

      if (authResult.status === "rejected") {
        console.warn("No se pudo leer la sesión de Supabase", authResult.reason);
      }

      if (remoteQuestions.length) {
        setQuestions(remoteQuestions);
        setDeck(prepareDeck(remoteQuestions, 6));
      }

      setSupabaseUser(auth.user);
      setSupabaseProfile(auth.profile);
      if (auth.profile?.role) setRole(auth.profile.role);

      if (auth.user && questionsResult.status === "fulfilled") {
        setSupabaseStatus(
          remoteQuestions.length
            ? `Supabase conectado · ${remoteQuestions.length} preguntas`
            : "Supabase conectado · sin preguntas publicadas"
        );
        setAuthLoading(false);
        return;
      }

      if (auth.user) {
        setSupabaseStatus(`Sesión iniciada · preguntas: ${describeSupabaseError(questionsResult.reason)}`);
        setAuthLoading(false);
        return;
      }

      if (questionsResult.status === "fulfilled") {
        setSupabaseStatus(
          remoteQuestions.length
            ? `Supabase listo · ${remoteQuestions.length} preguntas`
            : "Supabase conectado · sin preguntas publicadas"
        );
        setAuthLoading(false);
        return;
      }

      setSupabaseStatus(
        `Supabase no disponible · ${describeSupabaseError(authResult.reason || questionsResult.reason)}`
      );
      setAuthLoading(false);
    }

    connectSupabase();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeAttemptId || attemptFinished || !showQuiz || !deck.length || currentIndex < deck.length) return;

    const score = answers.filter((answer) => answer.isCorrect).length;
    setAttemptFinished(true);
    finishQuizAttempt({ attemptId: activeAttemptId, score, total: answers.length }).catch((error) => {
      console.warn("No se pudo cerrar el intento en Supabase", error);
    });
  }, [activeAttemptId, answers, attemptFinished, currentIndex, deck.length, showQuiz]);

  function changeRole(nextRole) {
    if (!availableRoles.includes(nextRole)) return;
    setRole(nextRole);
    setShowQuiz(false);
    setQuizMode("practice");
    setSelectedOptionId(null);
  }

  async function handleLogin(credentials) {
    setAuthError("");
    setAuthLoading(true);

    try {
      const auth = await signInWithPassword(credentials);
      setSupabaseUser(auth.user);
      setSupabaseProfile(auth.profile);
      setRole(auth.profile?.role || "student");
      setSupabaseStatus("Supabase conectado · sesión iniciada");
    } catch (error) {
      setAuthError(describeSupabaseError(error));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthError("");
    setAuthLoading(true);

    try {
      await signOutUser();
      setSupabaseUser(null);
      setSupabaseProfile(null);
      setRole("student");
      setShowQuiz(false);
      setActiveAttemptId(null);
      setSupabaseStatus("Supabase conectado · inicia sesión");
    } catch (error) {
      setAuthError(describeSupabaseError(error));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleProfileSave({ fullName, newPassword }) {
    if (!supabaseUser) return;

    setProfileMessage("Guardando cambios...");

    try {
      let nextProfile = supabaseProfile;

      if (fullName !== (supabaseProfile?.full_name || "")) {
        nextProfile = await updateOwnProfile({ fullName, userId: supabaseUser.id });
        await updateOwnUserMetadata({ fullName });
        setSupabaseProfile(nextProfile);
      }

      if (newPassword) {
        await updateOwnPassword(newPassword);
      }

      setProfileMessage(newPassword ? "Perfil y contraseña actualizados." : "Perfil actualizado.");
    } catch (error) {
      setProfileMessage(`No se pudo guardar: ${describeSupabaseError(error)}`);
    }
  }

  async function createAttemptForDeck(nextDeck, mode, categoryFilter = "Todas", difficultyFilter = "Todas") {
    setActiveAttemptId(null);
    setAttemptFinished(false);

    if (!supabaseUser || !nextDeck.length) return;

    try {
      const attempt = await createQuizAttempt({
        categoryFilter,
        difficultyFilter,
        mode,
        studentId: supabaseUser.id,
        total: nextDeck.length
      });
      setActiveAttemptId(attempt?.id || null);
    } catch (error) {
      console.warn("No se pudo crear el intento en Supabase", error);
      setSupabaseStatus("Supabase conectado · guardado pendiente");
    }
  }

  async function startQuiz(source = filteredQuestions, mode = "practice") {
    const nextDeck = prepareDeck(source, questionCount);
    setDeck(nextDeck);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setAnswers([]);
    setQuizMode(mode);
    setShowQuiz(true);
    await createAttemptForDeck(
      nextDeck,
      mode,
      selectedCategories.length ? selectedCategories.join(", ") : "Todas",
      difficulty
    );
  }

  function startQuickQuiz() {
    setSelectedCategories([]);
    setDifficulty("Todas");
    startQuiz(questions);
  }

  async function startSmartSession() {
    const smartDeck = selectSmartQuestions(questions, answerHistory, Math.min(10, questions.length));
    setSelectedCategories([]);
    setDifficulty("Todas");
    setDeck(smartDeck);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setAnswers([]);
    setQuizMode("practice");
    setShowQuiz(true);
    await createAttemptForDeck(smartDeck, "smart", "Sesión inteligente", "Adaptativa");
  }

  function startDifficultyQuiz(nextDifficulty) {
    setSelectedCategories([]);
    setDifficulty(nextDifficulty);
    startQuiz(questions.filter((question) => question.difficulty === nextDifficulty));
  }

  function toggleCategory(nextCategory) {
    setSelectedCategories((previous) =>
      previous.includes(nextCategory)
        ? previous.filter((category) => category !== nextCategory)
        : [...previous, nextCategory]
    );
  }

  function answerQuestion(option) {
    if (!currentQuestion || (quizMode === "practice" && selectedOptionId)) return;
    const correctOption = currentQuestion.options.find((item) => item.isCorrect);
    const nextAnswer = {
      questionId: currentQuestion.id,
      questionStem: currentQuestion.stem,
      category: currentQuestion.category,
      difficulty: currentQuestion.difficulty,
      selectedOptionId: option.id,
      correctOptionId: correctOption.id,
      isCorrect: option.isCorrect,
      userId: currentUser.id,
      userInitials: currentUser.initials,
      userName: currentUser.name,
      userRole: currentUser.role,
      answeredAt: new Date().toISOString()
    };

    setAnswers((previous) => [...previous, nextAnswer]);
    setAnswerHistory((previous) => [...previous, nextAnswer]);

    if (activeAttemptId && isUuid(currentQuestion.id) && isUuid(option.id)) {
      recordQuizAnswer({
        attemptId: activeAttemptId,
        isCorrect: option.isCorrect,
        questionId: currentQuestion.id,
        selectedOptionId: option.id
      }).catch((error) => {
        console.warn("No se pudo guardar la respuesta en Supabase", error);
      });
    }

    if (quizMode === "exam") {
      setSelectedOptionId(null);
      setCurrentIndex((index) => index + 1);
      return;
    }

    setSelectedOptionId(option.id);
  }

  function nextQuestion() {
    setSelectedOptionId(null);
    setCurrentIndex((index) => index + 1);
  }

  function retryMistakes() {
    const missedIds = answers.filter((answer) => !answer.isCorrect).map((answer) => answer.questionId);
    const missedQuestions = questions.filter((question) => missedIds.includes(question.id));
    if (missedQuestions.length) startQuiz(missedQuestions);
  }

  function editQuestion(question) {
    setEditingId(question.id);
    setEditorQuestion(cloneQuestion(question));
    changeRole("teacher");
  }

  function newQuestion() {
    setEditingId(null);
    setEditorQuestion(cloneQuestion(emptyQuestion));
    changeRole("teacher");
  }

  function saveQuestion() {
    const normalized = {
      ...editorQuestion,
      id: editingId || `q-${Date.now()}`,
      options: editorQuestion.options.map((option, index) => ({
        ...option,
        id: option.id || `opt-${Date.now()}-${index}`,
        isCorrect: index === 0
      }))
    };

    setQuestions((previous) => {
      if (!editingId) return [...previous, normalized];
      return previous.map((question) => (question.id === editingId ? normalized : question));
    });
    setEditingId(normalized.id);
    setEditorQuestion(cloneQuestion(normalized));
  }

  async function importQuestionsFromFile(file) {
    if (!file) return;
    try {
      const rows = await readQuestionRowsFromFile(file);
      const { imported, skipped } = buildImportedQuestions(rows);

      if (!imported.length) {
        setImportMessage("No se importaron preguntas. Revisa que el archivo tenga enunciado, respuesta_correcta y al menos un distractor.");
        return;
      }

      setQuestions((previous) => [...previous, ...imported]);
      setImportMessage(
        `${imported.length} pregunta${imported.length === 1 ? "" : "s"} importada${imported.length === 1 ? "" : "s"}.` +
          (skipped.length ? ` Filas omitidas: ${skipped.join(", ")}.` : "")
      );
    } catch (error) {
      setImportMessage("No se pudo leer el archivo. Prueba con un .xlsx, .xls o .csv con encabezados en la primera fila.");
    }
  }

  function deleteQuestion(questionId) {
    setQuestions((previous) => previous.filter((question) => question.id !== questionId));
    if (editingId === questionId) newQuestion();
  }

  function updateEditorField(field, value) {
    setEditorQuestion((question) => ({ ...question, [field]: value }));
  }

  function updateOption(index, value) {
    setEditorQuestion((question) => ({
      ...question,
      options: question.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, text: value } : option
      )
    }));
  }

  if (isSupabaseConfigured && authLoading && !supabaseUser) {
    return <LoginScreen authError="" authLoading={authLoading} onLogin={handleLogin} status={supabaseStatus} />;
  }

  if (isSupabaseConfigured && !supabaseUser) {
    return (
      <LoginScreen
        authError={authError}
        authLoading={authLoading}
        onLogin={handleLogin}
        status={supabaseStatus}
      />
    );
  }

  return (
    <main className="shell app-shell">
      <header className="app-header">
        <div className="topbar">
          <div className="brand-mini">
            <img src="/brand/patomnesis-icon.png" alt="" />
            <div>
              <h1>Patomnesis</h1>
              <span>Quiz de anatomía patológica</span>
            </div>
          </div>
          <div className="profile-actions">
            <span className="avatar">{currentUser.initials}</span>
            <span>{roleLabels[currentUser.role] || roleLabels[session.userRole]}</span>
            <button className="ghost" onClick={() => setProfileOpen(true)} type="button">
              Mi perfil
            </button>
            <button className="ghost" onClick={handleSignOut} type="button">
              Cerrar sesión
            </button>
          </div>
        </div>

        {availableRoles.length > 1 && (
          <nav className="mode-tabs" aria-label="Cambiar vista">
            {availableRoles.map((value) => (
              <button
                className={role === value ? "active" : ""}
                key={value}
                onClick={() => changeRole(value)}
                type="button"
              >
                {value === "student" ? "Modo Alumno" : value === "teacher" ? "Modo Profesor" : "Modo Supervisor"}
              </button>
            ))}
          </nav>
        )}

        {role === "student" && (
          <nav className="section-tabs" aria-label="Secciones">
            <button className="active" type="button">
              Inicio
            </button>
            <button type="button">Liga</button>
            <button type="button">Hall of Fame</button>
            <span className="supabase-pill">
              {supabaseStatus}
            </span>
          </nav>
        )}
      </header>

      {profileOpen && (
        <ProfileDialog
          currentUser={currentUser}
          message={profileMessage}
          onClose={() => {
            setProfileOpen(false);
            setProfileMessage("");
          }}
          onSave={handleProfileSave}
          profile={supabaseProfile}
        />
      )}

      {role === "student" && (
        <>
          {showQuiz ? (
            <QuizPlayer
              answers={answers}
              currentAnswer={currentAnswer}
              currentIndex={currentIndex}
              currentQuestion={currentQuestion}
              deck={deck}
              nextQuestion={nextQuestion}
              onAnswer={answerQuestion}
              onExit={() => setShowQuiz(false)}
              quizMode={quizMode}
              selectedOptionId={selectedOptionId}
              stats={stats}
            />
          ) : (
            <StudentLaunch
              categories={categories}
              difficulty={difficulty}
              filteredCount={filteredQuestions.length}
              hasMistakes={answers.some((answer) => !answer.isCorrect)}
              onDifficultyStart={startDifficultyQuiz}
              onQuickStart={startSmartSession}
              onRetryMistakes={retryMistakes}
              onStartExam={() => startQuiz(filteredQuestions, "exam")}
              onStartFiltered={() => startQuiz()}
              questionCount={questionCount}
              questions={questions}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              setDifficulty={setDifficulty}
              setQuestionCount={setQuestionCount}
              smartSession={smartSession}
              stats={learningStats}
              toggleCategory={toggleCategory}
            />
          )}
        </>
      )}

      {role === "teacher" && (
        <TeacherBank
          deleteQuestion={deleteQuestion}
          editQuestion={editQuestion}
          editingId={editingId}
          editorQuestion={editorQuestion}
          importMessage={importMessage}
          newQuestion={newQuestion}
          onImportQuestions={importQuestionsFromFile}
          questions={questions}
          saveQuestion={saveQuestion}
          updateEditorField={updateEditorField}
          updateOption={updateOption}
        />
      )}

      {role === "supervisor" && (
        <SupervisorDashboard answers={answerHistory} currentUser={currentUser} questions={questions} />
      )}
    </main>
  );
}

function LoginScreen({ authError, authLoading, onLogin, status }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submitLogin(event) {
    event.preventDefault();
    onLogin({ email: email.trim(), password });
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <img src="/brand/patomnesis-icon.png" alt="" />
          <div>
            <h1>Patomnesis</h1>
            <span>Acceso con perfil</span>
          </div>
        </div>

        <div className="auth-copy">
          <p className="eyebrow">Usuarios reales</p>
          <h2>Entra con tu cuenta</h2>
          <p>
            Cada usuario accede con email y contraseña. El rol de alumno, profesor o supervisor
            se toma del perfil guardado en Supabase.
          </p>
        </div>

        <form className="auth-form" onSubmit={submitLogin}>
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Contraseña
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tu contraseña"
              required
              type="password"
              value={password}
            />
          </label>
          {authError && <p className="auth-error">{authError}</p>}
          <button className="primary-large" disabled={authLoading} type="submit">
            {authLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="auth-note">
          {status}. Si tu cuenta debe ser supervisora, primero crea el usuario en Supabase y despues
          ejecuta el script `make_supervisor.sql`.
        </p>
      </section>
    </main>
  );
}

function ProfileDialog({ currentUser, message, onClose, onSave, profile }) {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  function submitProfile(event) {
    event.preventDefault();
    setLocalError("");

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        setLocalError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setLocalError("Las contraseñas no coinciden.");
        return;
      }
    }

    onSave({
      fullName: fullName.trim(),
      newPassword
    });
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="profile-overlay" role="presentation">
      <section className="profile-dialog" aria-modal="true" role="dialog" aria-labelledby="profile-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mi perfil</p>
            <h2 id="profile-title">Cuenta de Patomnesis</h2>
          </div>
          <button className="ghost compact" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>

        <div className="profile-summary">
          <span className="avatar">{currentUser.initials}</span>
          <div>
            <strong>{currentUser.name}</strong>
            <span>{roleLabels[currentUser.role] || currentUser.role}</span>
          </div>
        </div>

        <form className="profile-form" onSubmit={submitProfile}>
          <label>
            Nombre de usuario
            <input
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nombre que verá el profesor o supervisor"
              value={fullName}
            />
          </label>
          <label>
            Email
            <input disabled value={profile?.email || ""} />
          </label>
          <div className="profile-password-block">
            <p>
              <b>Cambiar contraseña</b>
              <span>Déjalo vacío si no quieres cambiarla.</span>
            </p>
            <label>
              Nueva contraseña
              <input
                autoComplete="new-password"
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
            </label>
            <label>
              Repetir nueva contraseña
              <input
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                value={confirmPassword}
              />
            </label>
          </div>
          {localError && <p className="auth-error">{localError}</p>}
          {message && <p className="profile-message">{message}</p>}
          <button type="submit">Guardar cambios</button>
        </form>
      </section>
    </div>
  );
}

function StudentLaunch({
  categories,
  difficulty,
  filteredCount,
  hasMistakes,
  onDifficultyStart,
  onQuickStart,
  onRetryMistakes,
  onStartExam,
  onStartFiltered,
  questionCount,
  questions,
  selectedCategories,
  setSelectedCategories,
  setDifficulty,
  setQuestionCount,
  smartSession,
  stats,
  toggleCategory
}) {
  const difficultyCounts = useMemo(
    () =>
      Object.keys(difficultyLabels).map((difficulty) => ({
        difficulty,
        count: questions.filter((question) => question.difficulty === difficulty).length
      })),
    [questions]
  );

  const focusTopics = smartSession.weakTopics.length
    ? smartSession.weakTopics
    : categories.slice(0, 3);
  const dailyProgress = Math.min(stats.answered, 20);
  const allTopicsSelected = selectedCategories.length === 0;

  return (
    <section className="student-dashboard">
      <article className="student-main-card">
        <div className="smart-card">
          <div>
            <p className="smart-label">Sesión inteligente</p>
            <h2>Hasta 10 preguntas adaptadas a ti</h2>
            <p>Tus puntos más débiles de hoy:</p>
            <div className="focus-chips">
              {focusTopics.map((topic) => (
                <span key={topic}>{topic}</span>
              ))}
            </div>
            <div className="smart-criteria" aria-label="Criterios de selección">
              {smartSession.criteria.map((criterion) => (
                <span key={criterion}>{criterion}</span>
              ))}
            </div>
          </div>
          <button className="smart-cta" onClick={onQuickStart} type="button">
            Empezar ahora
          </button>
        </div>

        <div className="student-copy">
          <p className="eyebrow">Modo alumno</p>
          <h2>¿Preparado para tu siguiente reto?</h2>
          <p>
            Continúa entrenando diagnóstico visual con sesiones cortas, feedback inmediato y dificultad
            ajustable.
          </p>
        </div>

        <div className="mission-card">
          <div>
            <strong>Responder 20 preguntas</strong>
            <span>Suma cualquier sesión de práctica o repaso inteligente.</span>
          </div>
          <b>{dailyProgress}/20 preguntas hoy</b>
          <div className="mission-bar">
            <span style={{ width: `${(dailyProgress / 20) * 100}%` }} />
          </div>
        </div>

        <div className="control-block">
          <div className="control-heading">
            <strong>Dificultad</strong>
          </div>
          <div className="pill-row">
            <button className={difficulty === "Todas" ? "active" : ""} onClick={() => setDifficulty("Todas")} type="button">
              Todas
            </button>
            {Object.entries(difficultyLabels).map(([value, label]) => (
              <button
                className={difficulty === value ? "active" : ""}
                key={value}
                onClick={() => setDifficulty(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-block">
          <div className="control-heading">
            <strong>Temas</strong>
            <button
              className={allTopicsSelected ? "tiny-pill active" : "tiny-pill"}
              onClick={() => setSelectedCategories([])}
              type="button"
            >
              Todas
            </button>
          </div>
          <div className="topic-chips">
            {categories.map((item) => (
              <button
                className={selectedCategories.includes(item) ? "active" : ""}
                key={item}
                onClick={() => toggleCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <p className="availability">
            {allTopicsSelected
              ? "Todos los temas seleccionados."
              : `${selectedCategories.length} temas seleccionados: ${selectedCategories.join(", ")}.`}
          </p>
        </div>

        <div className="control-block">
          <strong>Número de preguntas</strong>
          <div className="count-row">
            {[5, 10, 15, 20].map((count) => (
              <button
                className={questionCount === count ? "active" : ""}
                key={count}
                onClick={() => setQuestionCount(count)}
                type="button"
              >
                {count}
              </button>
            ))}
          </div>
          <p className="availability">{filteredCount} preguntas disponibles con esta configuración.</p>
        </div>

        <div className="start-stack">
          <button className="start-primary" disabled={!filteredCount} onClick={onStartFiltered} type="button">
            Empezar quiz
          </button>
          <button className="exam-mode" disabled={!filteredCount} onClick={onStartExam} type="button">
            Modo examen - sin feedback inmediato
          </button>
        </div>
      </article>

      <aside className="student-side">
        <section className="progress-card">
          <span>Tu progreso</span>
          <div className="streak">Racha diaria: 2 días seguidos</div>
          <strong>#1</strong>
          <p>posición en el ranking global</p>
          <div className="xp-line">
            <b>{84 + stats.correct * 4} PatoXP acumulados</b>
            <span><i style={{ width: `${Math.min(100, 35 + stats.correct * 12)}%` }} /></span>
          </div>
          <p>Nivel 1</p>
          <h3>Aprendiz</h3>
          <small>Cobertura: {stats.answered} / {questions.length} preguntas</small>
        </section>

        <section className="map-card">
          <div className="section-heading">
            <h3>Tu mapa de dominio</h3>
            <button className="tiny-pill" type="button">Ampliar</button>
          </div>
          <div className="radar-chart" aria-hidden="true">
            <span />
          </div>
          <div className="difficulty-starts compact">
            {difficultyCounts.map((item) => (
              <button
                className={`difficulty-start ${item.difficulty}`}
                disabled={!item.count}
                key={item.difficulty}
                onClick={() => onDifficultyStart(item.difficulty)}
                type="button"
              >
                <span>{difficultyLabels[item.difficulty]}</span>
                <b>{item.count}</b>
              </button>
            ))}
          </div>
          <button className="secondary retry-full" disabled={!hasMistakes} onClick={onRetryMistakes} type="button">
            Repasar fallos
          </button>
        </section>
      </aside>
    </section>
  );
}

function QuizPlayer({
  answers,
  currentAnswer,
  currentIndex,
  currentQuestion,
  deck,
  nextQuestion,
  onAnswer,
  onExit,
  quizMode,
  selectedOptionId,
  stats
}) {
  const isExam = quizMode === "exam";

  if (!currentQuestion) {
    const reviewItems = deck.map((question, index) => {
      const answer = answers.find((item) => item.questionId === question.id);
      const selectedOption = question.options.find((option) => option.id === answer?.selectedOptionId);
      const correctOption = question.options.find((option) => option.isCorrect);

      return { answer, correctOption, index, question, selectedOption };
    });

    return (
      <section className={isExam ? "panel empty-state exam-results" : "panel empty-state"}>
        <h2>{isExam ? "Examen terminado" : "Ronda terminada"}</h2>
        {!isExam && (
          <p>
            Resultado: {stats.correct} de {answers.length}. Precisión {stats.precision}%.
          </p>
        )}
        {isExam && (
          <div className="exam-review">
            <h3>Revisión del examen</h3>
            {reviewItems.map(({ answer, correctOption, index, question, selectedOption }) => (
              <details
                className={answer?.isCorrect ? "review-item correct" : "review-item wrong"}
                key={question.id}
              >
                <summary>
                  <span>
                    <b>Pregunta {index + 1}</b>
                    {question.stem}
                  </span>
                  <strong>{answer?.isCorrect ? "Correcta" : "Incorrecta"}</strong>
                </summary>
                <div className="review-detail">
                  <p className="review-answer">
                    <b>Tu respuesta:</b> {selectedOption?.text || "Sin respuesta"}
                  </p>
                  <p className="review-answer">
                    <b>Respuesta correcta:</b> {correctOption?.text}
                  </p>
                  <p>{question.explanation}</p>
                  <p>
                    <b>Idea clave:</b> {question.keyPoint}
                  </p>
                </div>
              </details>
            ))}
          </div>
        )}
        <button onClick={onExit} type="button">
          Configurar otra ronda
        </button>
      </section>
    );
  }

  const correctOption = currentQuestion.options.find((option) => option.isCorrect);

  return (
    <section className="grid">
      <aside className="panel metrics">
        <Metric label="Pregunta" value={`${currentIndex + 1}/${deck.length}`} />
        {!isExam && <Metric label="Puntuación" value={stats.correct} />}
        {!isExam && <Metric label="Precisión" value={`${stats.precision}%`} />}
        <Metric label="Contestadas" value={stats.answered} />
        {isExam && <div className="exam-badge">Modo examen: feedback al final</div>}
        <button className="secondary wide-action" onClick={onExit} type="button">
          Configurar otra ronda
        </button>
      </aside>

      <article className="panel quiz-card">
        <div className="question-meta">
          <span className="tag">{currentQuestion.category}</span>
          <span className={`difficulty ${currentQuestion.difficulty}`}>
            {difficultyLabels[currentQuestion.difficulty]}
          </span>
        </div>
        <h2>{currentQuestion.stem}</h2>
        {currentQuestion.imageUrl && (
          <img className="question-image" src={currentQuestion.imageUrl} alt="Imagen de la pregunta" />
        )}
        <div className="answers">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOptionId === option.id;
            const shouldReveal = !isExam && Boolean(selectedOptionId);
            const letter = String.fromCharCode(65 + index);
            const className = [
              "answer",
              shouldReveal && option.isCorrect ? "correct" : "",
              shouldReveal && isSelected && !option.isCorrect ? "wrong" : ""
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button className={className} disabled={shouldReveal} key={option.id} onClick={() => onAnswer(option)} type="button">
                <span className="answer-letter">{letter}</span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>
        {!isExam && currentAnswer && (
          <div className="feedback">
            <strong>{currentAnswer.isCorrect ? "Correcto." : "Incorrecto."}</strong>
            <p>{currentQuestion.explanation}</p>
            <p>
              <b>Respuesta:</b> {correctOption.text}
            </p>
            <p>
              <b>Idea clave:</b> {currentQuestion.keyPoint}
            </p>
            <button onClick={nextQuestion} type="button">
              Siguiente
            </button>
          </div>
        )}
      </article>
    </section>
  );
}

function TeacherBank({
  deleteQuestion,
  editQuestion,
  editingId,
  editorQuestion,
  importMessage,
  newQuestion,
  onImportQuestions,
  questions,
  saveQuestion,
  updateEditorField,
  updateOption
}) {
  const fileInputRef = useRef(null);
  const [bankSearch, setBankSearch] = useState("");
  const [bankTheme, setBankTheme] = useState("Todos");
  const [bankDifficulty, setBankDifficulty] = useState("Todas");
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [editorVisible, setEditorVisible] = useState(Boolean(editingId));
  const [teacherTab, setTeacherTab] = useState("questions");

  const filteredBankQuestions = useMemo(() => {
    const query = normalizeText(bankSearch);
    return questions.filter((question) => {
      const matchesSearch =
        !query ||
        [question.stem, question.category, question.topic, question.explanation, question.keyPoint].some((value) =>
          normalizeText(value).includes(query)
        );
      const matchesTheme = bankTheme === "Todos" || question.category === bankTheme;
      const matchesDifficulty = bankDifficulty === "Todas" || question.difficulty === bankDifficulty;
      return matchesSearch && matchesTheme && matchesDifficulty;
    });
  }, [bankDifficulty, bankSearch, bankTheme, questions]);

  const bankStats = useMemo(() => {
    const byDifficulty = Object.keys(difficultyLabels).map((difficulty) => ({
      difficulty,
      count: questions.filter((question) => question.difficulty === difficulty).length
    }));
    const byTheme = questionThemes
      .map((theme) => ({
        theme,
        count: questions.filter((question) => question.category === theme).length
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
    const withImages = questions.filter((question) => question.imageUrl).length;
    const withExplanation = questions.filter((question) => question.explanation).length;
    const advanced = byDifficulty.find((item) => item.difficulty === "advanced")?.count || 0;

    return { advanced, byDifficulty, byTheme, withExplanation, withImages };
  }, [questions]);

  function handleNewQuestion() {
    newQuestion();
    setEditorVisible(true);
    setTeacherTab("questions");
  }

  function handleEditQuestion(question) {
    editQuestion(question);
    setEditorVisible(true);
    setTeacherTab("questions");
  }

  function closeEditor() {
    setEditorVisible(false);
  }

  return (
    <section className="teacher-layout">
      <div className="teacher-subnav">
        <button
          className={teacherTab === "stats" ? "active" : "ghost"}
          onClick={() => setTeacherTab("stats")}
          type="button"
        >
          Estadísticas
        </button>
        <button
          className={teacherTab === "questions" ? "active" : "ghost"}
          onClick={() => setTeacherTab("questions")}
          type="button"
        >
          Preguntas
        </button>
        <button className="ghost" onClick={() => fileInputRef.current?.click()} type="button">Importar Excel</button>
        <input
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(event) => {
            onImportQuestions(event.target.files?.[0]);
            event.target.value = "";
          }}
          ref={fileInputRef}
          type="file"
        />
      </div>

      {teacherTab === "stats" ? (
        <TeacherStats questions={questions} stats={bankStats} />
      ) : (
        <>
          <div className="teacher-bank-head">
            <p>
              <span>{questions.length} preguntas</span> · <strong>{filteredBankQuestions.length} visibles</strong>
            </p>
            <button className="add-link" onClick={handleNewQuestion} type="button">+ Nueva</button>
          </div>

          <section className="question-filter-panel">
            <div className="filter-row">
              <strong>Buscar:</strong>
              <input
                placeholder="Buscar por enunciado, tema o explicación..."
                value={bankSearch}
                onChange={(event) => setBankSearch(event.target.value)}
              />
            </div>
            <div className="filter-row">
              <strong>Tema:</strong>
              <select value={bankTheme} onChange={(event) => setBankTheme(event.target.value)}>
                <option value="Todos">Todos los temas ({questions.length})</option>
                {questionThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-row">
              <strong>Dificultad:</strong>
              <div className="segmented-filter">
                <button className={bankDifficulty === "Todas" ? "active" : ""} onClick={() => setBankDifficulty("Todas")} type="button">
                  Todas
                </button>
                {Object.entries(difficultyLabels).map(([value, label]) => (
                  <button
                    className={bankDifficulty === value ? "active" : ""}
                    key={value}
                    onClick={() => setBankDifficulty(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <details className="import-helper">
              <summary>Formato Excel esperado</summary>
              <p>
                Usa el botón <b>Importar Excel</b> para subir archivos .xlsx, .xls o .csv.
              </p>
              <p>
                tema_principal, tema, dificultad, enunciado, respuesta_correcta, distractor_1,
                distractor_2, distractor_3, explicación, idea_clave.
              </p>
            </details>
            {importMessage && <p className="import-message">{importMessage}</p>}
          </section>

          {editorVisible && (
            <article className="panel editor teacher-editor-panel">
              <div className="section-heading editor-heading">
                <h2>{editingId ? "Editar pregunta" : "Nueva pregunta"}</h2>
                <div className="button-row">
                  <button className="secondary" onClick={closeEditor} type="button">
                    Cerrar editor
                  </button>
                  {editingId && (
                    <button className="danger" onClick={() => deleteQuestion(editingId)} type="button">
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
              <div className="form-grid">
                <label>
                  Tema principal
                  <select value={editorQuestion.category} onChange={(event) => updateEditorField("category", event.target.value)}>
                    <option value="">Selecciona un tema</option>
                    {questionThemes.map((theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tema
                  <input value={editorQuestion.topic} onChange={(event) => updateEditorField("topic", event.target.value)} />
                </label>
                <label>
                  Dificultad
                  <select value={editorQuestion.difficulty} onChange={(event) => updateEditorField("difficulty", event.target.value)}>
                    {Object.entries(difficultyLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="wide">
                  Enunciado
                  <textarea value={editorQuestion.stem} onChange={(event) => updateEditorField("stem", event.target.value)} />
                </label>
                <label className="wide">
                  URL de imagen
                  <input value={editorQuestion.imageUrl} onChange={(event) => updateEditorField("imageUrl", event.target.value)} />
                </label>
                {editorQuestion.options.map((option, index) => (
                  <label key={option.id}>
                    {index === 0 ? "Respuesta correcta" : `Distractor ${index}`}
                    <input value={option.text} onChange={(event) => updateOption(index, event.target.value)} />
                  </label>
                ))}
                <label className="wide">
                  Explicación
                  <textarea value={editorQuestion.explanation} onChange={(event) => updateEditorField("explanation", event.target.value)} />
                </label>
                <label className="wide">
                  Idea clave
                  <input value={editorQuestion.keyPoint} onChange={(event) => updateEditorField("keyPoint", event.target.value)} />
                </label>
              </div>
              <div className="editor-actions">
                <button onClick={saveQuestion} type="button">
                  Guardar pregunta
                </button>
              </div>
            </article>
          )}

          <aside className="bank-list">
            <div className="bank-table" aria-label="Banco de preguntas">
              {filteredBankQuestions.map((question) => {
                const correctOption = question.options.find((option) => option.isCorrect);
                const isExpanded = expandedQuestionId === question.id;

                return (
                  <article className={editingId === question.id ? "bank-row selected" : "bank-row"} key={question.id}>
                    <span className="bank-row-level">
                      <span className={`difficulty ${question.difficulty}`}>{difficultyLabels[question.difficulty]}</span>
                    </span>
                    <span className="bank-row-question">
                      <b>{question.stem}</b>
                    </span>
                    <span className="bank-row-topic">
                      <b>{question.category}</b>
                      <small>{question.topic || "Sin subtema"}</small>
                    </span>
                    <span className="bank-row-answer">{correctOption?.text || "Sin respuesta"}</span>
                    <span className="bank-row-actions">
                      <button className="secondary" onClick={() => handleEditQuestion(question)} type="button">
                        Editar
                      </button>
                      <button
                        className="ghost compact"
                        onClick={() => setExpandedQuestionId((current) => (current === question.id ? null : question.id))}
                        type="button"
                      >
                        {isExpanded ? "Ocultar" : "Ver completa"}
                      </button>
                    </span>
                    {isExpanded && (
                      <div className="bank-row-detail">
                        <p>
                          <b>Pregunta:</b> {question.stem}
                        </p>
                        <p>
                          <b>Respuesta correcta:</b> {correctOption?.text || "Sin respuesta"}
                        </p>
                        <p>
                          <b>Opciones:</b> {question.options.map((option) => option.text).join(" · ")}
                        </p>
                        {question.explanation && (
                          <p>
                            <b>Explicación:</b> {question.explanation}
                          </p>
                        )}
                        {question.keyPoint && (
                          <p>
                            <b>Idea clave:</b> {question.keyPoint}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
              {!filteredBankQuestions.length && (
                <div className="empty-bank">No hay preguntas que coincidan con los filtros.</div>
              )}
            </div>
          </aside>
        </>
      )}
    </section>
  );
}

function TeacherStats({ questions, stats }) {
  const maxThemeCount = Math.max(1, ...stats.byTheme.map((item) => item.count));
  const total = Math.max(1, questions.length);

  return (
    <section className="teacher-stats">
      <div className="stats-grid">
        <Metric label="Preguntas en banco" value={questions.length} />
        <Metric label="Con imagen" value={stats.withImages} />
        <Metric label="Con explicación" value={stats.withExplanation} />
        <Metric label="Avanzadas" value={stats.advanced} />
      </div>

      <div className="stats-panels">
        <article className="panel stat-panel">
          <h3>Dificultad</h3>
          <div className="stat-bars">
            {stats.byDifficulty.map((item) => (
              <div className="stat-row" key={item.difficulty}>
                <span>{difficultyLabels[item.difficulty]}</span>
                <div className="stat-track">
                  <i style={{ width: `${(item.count / total) * 100}%` }} />
                </div>
                <b>{item.count}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="panel stat-panel">
          <h3>Temas con preguntas</h3>
          <div className="stat-bars">
            {stats.byTheme.length ? (
              stats.byTheme.map((item) => (
                <div className="stat-row" key={item.theme}>
                  <span>{item.theme}</span>
                  <div className="stat-track">
                    <i style={{ width: `${(item.count / maxThemeCount) * 100}%` }} />
                  </div>
                  <b>{item.count}</b>
                </div>
              ))
            ) : (
              <p className="empty-stat">Todavía no hay preguntas clasificadas por tema.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function SupervisorDashboard({ answers, currentUser, questions }) {
  const [supervisorTab, setSupervisorTab] = useState("stats");
  const [profiles, setProfiles] = useState([]);
  const [profilesStatus, setProfilesStatus] = useState("Cargando usuarios...");
  const [roleUpdatingId, setRoleUpdatingId] = useState("");

  const topicRows = useMemo(() => {
    const grouped = new Map();
    answers.forEach((answer) => {
      const current = grouped.get(answer.category) || { correct: 0, wrong: 0 };
      if (answer.isCorrect) current.correct += 1;
      else current.wrong += 1;
      grouped.set(answer.category, current);
    });
    return Array.from(grouped.entries()).map(([category, value]) => {
      const total = value.correct + value.wrong;
      return { category, ...value, precision: total ? Math.round((value.correct / total) * 100) : 0 };
    });
  }, [answers]);

  const userRows = useMemo(() => {
    const grouped = new Map();

    answers.forEach((answer) => {
      const userId = answer.userId || currentUser.id;
      const current = grouped.get(userId) || {
        id: userId,
        initials: answer.userInitials || currentUser.initials,
        name: answer.userName || currentUser.name,
        role: answer.userRole || currentUser.role,
        correct: 0,
        wrong: 0,
        total: 0,
        lastWrongCategory: "Sin fallos",
        lastWrongQuestion: ""
      };

      current.total += 1;

      if (answer.isCorrect) {
        current.correct += 1;
      } else {
        current.wrong += 1;
        current.lastWrongCategory = answer.category;
        current.lastWrongQuestion = answer.questionStem || "";
      }

      grouped.set(userId, current);
    });

    if (!grouped.size) {
      grouped.set(currentUser.id, {
        id: currentUser.id,
        initials: currentUser.initials,
        name: currentUser.name,
        role: currentUser.role,
        correct: 0,
        wrong: 0,
        total: 0,
        lastWrongCategory: "Sin datos",
        lastWrongQuestion: ""
      });
    }

    return Array.from(grouped.values())
      .map((user) => ({
        ...user,
        precision: user.total ? Math.round((user.correct / user.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [answers, currentUser]);

  const activeUsers = userRows.filter((user) => user.total > 0).length;
  const averagePrecision = activeUsers
    ? Math.round(userRows.filter((user) => user.total > 0).reduce((sum, user) => sum + user.precision, 0) / activeUsers)
    : 0;
  const weakCategory = topicRows.length
    ? [...topicRows].sort((a, b) => a.precision - b.precision || b.wrong - a.wrong)[0].category
    : "Sin datos";

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      try {
        const nextProfiles = await fetchProfiles();
        if (cancelled) return;
        setProfiles(nextProfiles);
        setProfilesStatus(nextProfiles.length ? `${nextProfiles.length} usuarios registrados` : "Sin usuarios registrados");
      } catch (error) {
        if (cancelled) return;
        setProfilesStatus(`No se pudieron cargar usuarios: ${describeSupabaseError(error)}`);
      }
    }

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, []);

  async function changeUserRole(profileId, nextRole) {
    setRoleUpdatingId(profileId);
    setProfilesStatus("Actualizando rol...");

    try {
      const updatedProfile = await updateProfileRole({ profileId, role: nextRole });
      setProfiles((previous) =>
        previous.map((profile) => (profile.id === updatedProfile.id ? updatedProfile : profile))
      );
      setProfilesStatus("Rol actualizado.");
    } catch (error) {
      setProfilesStatus(`No se pudo actualizar el rol: ${describeSupabaseError(error)}`);
    } finally {
      setRoleUpdatingId("");
    }
  }

  async function createUser(userData) {
    setProfilesStatus("Creando usuario...");

    try {
      const createdProfile = await createManagedUser(userData);
      if (createdProfile) {
        setProfiles((previous) => [createdProfile, ...previous.filter((profile) => profile.id !== createdProfile.id)]);
      }
      setProfilesStatus("Usuario creado.");
    } catch (error) {
      setProfilesStatus(`No se pudo crear el usuario: ${describeSupabaseError(error)}`);
    }
  }

  async function deleteUser(profile) {
    if (profile.id === currentUser.id) return;
    const label = profile.full_name || profile.email;
    const confirmed = window.confirm(`¿Eliminar definitivamente a ${label}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    setRoleUpdatingId(profile.id);
    setProfilesStatus("Eliminando usuario...");

    try {
      await deleteManagedUser(profile.id);
      setProfiles((previous) => previous.filter((item) => item.id !== profile.id));
      setProfilesStatus("Usuario eliminado.");
    } catch (error) {
      setProfilesStatus(`No se pudo eliminar el usuario: ${describeSupabaseError(error)}`);
    } finally {
      setRoleUpdatingId("");
    }
  }

  return (
    <section className="supervisor-dashboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Modo supervisor</p>
          <h2>{supervisorTab === "stats" ? "Estadísticas de usuarios" : "Gestión de usuarios"}</h2>
        </div>
      </div>

      <nav className="supervisor-tabs" aria-label="Secciones de supervisor">
        <button
          className={supervisorTab === "stats" ? "active" : ""}
          onClick={() => setSupervisorTab("stats")}
          type="button"
        >
          Estadísticas
        </button>
        <button
          className={supervisorTab === "users" ? "active" : ""}
          onClick={() => setSupervisorTab("users")}
          type="button"
        >
          Usuarios
        </button>
      </nav>

      {supervisorTab === "users" ? (
        <SupervisorUsers
          currentUser={currentUser}
          onCreateUser={createUser}
          onDeleteUser={deleteUser}
          onRoleChange={changeUserRole}
          profiles={profiles}
          roleUpdatingId={roleUpdatingId}
          status={profilesStatus}
        />
      ) : (
        <>
      <div className="stats-grid">
        <Metric label="Usuarios activos" value={activeUsers} />
        <Metric label="Respuestas registradas" value={answers.length} />
        <Metric label="Precisión media" value={`${averagePrecision}%`} />
        <Metric label="Tema a reforzar" value={weakCategory} />
      </div>

      <article className="panel user-stats-panel">
        <div className="section-heading">
          <h3>Rendimiento por usuario</h3>
          <span className="table-note">Demo local: se actualizará con cada respuesta registrada.</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Respuestas</th>
                <th>Aciertos</th>
                <th>Fallos</th>
                <th>Precisión</th>
                <th>Último tema fallado</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="user-cell">
                      <span className="avatar small">{user.initials}</span>
                      <b>{user.name}</b>
                    </span>
                  </td>
                  <td>{roleLabels[user.role] || user.role}</td>
                  <td>{user.total}</td>
                  <td>{user.correct}</td>
                  <td>{user.wrong}</td>
                  <td>
                    <span className={`precision-pill ${user.precision >= 80 ? "good" : user.precision >= 60 ? "mid" : "low"}`}>
                      {user.precision}%
                    </span>
                  </td>
                  <td title={user.lastWrongQuestion}>{user.lastWrongCategory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel user-stats-panel">
        <div className="section-heading">
          <h3>Rendimiento por tema</h3>
          <span className="table-note">{questions.length} preguntas en el banco</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tema</th>
                <th>Correctas</th>
                <th>Fallos</th>
                <th>Precisión</th>
              </tr>
            </thead>
            <tbody>
              {topicRows.length ? (
                topicRows.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td>{row.correct}</td>
                    <td>{row.wrong}</td>
                    <td>{row.precision}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">Todavía no hay respuestas registradas en esta demo local.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
        </>
      )}
    </section>
  );
}

function SupervisorUsers({ currentUser, onCreateUser, onDeleteUser, onRoleChange, profiles, roleUpdatingId, status }) {
  const [newUser, setNewUser] = useState({
    email: "",
    fullName: "",
    password: "",
    role: "student"
  });
  const [localError, setLocalError] = useState("");
  const profileRows = profiles.map((profile) => ({
    ...profile,
    displayName: profile.full_name || profile.email,
    initials: (profile.full_name || profile.email || "US").slice(0, 2).toUpperCase()
  }));

  function updateNewUser(field, value) {
    setNewUser((previous) => ({ ...previous, [field]: value }));
  }

  function submitNewUser(event) {
    event.preventDefault();
    setLocalError("");

    if (!newUser.email.trim() || !newUser.password) {
      setLocalError("Email y contraseña inicial son obligatorios.");
      return;
    }

    if (newUser.password.length < 6) {
      setLocalError("La contraseña inicial debe tener al menos 6 caracteres.");
      return;
    }

    onCreateUser({
      email: newUser.email.trim(),
      fullName: newUser.fullName.trim(),
      password: newUser.password,
      role: newUser.role
    });

    setNewUser({ email: "", fullName: "", password: "", role: "student" });
  }

  return (
    <section className="supervisor-users">
      <article className="panel user-create-panel">
        <div className="section-heading">
          <div>
            <h3>Agregar usuario</h3>
            <span className="table-note">Crea una cuenta con contraseña inicial y rol asignado.</span>
          </div>
        </div>

        <form className="user-create-form" onSubmit={submitNewUser}>
          <label>
            Nombre
            <input
              onChange={(event) => updateNewUser("fullName", event.target.value)}
              placeholder="Nombre visible"
              value={newUser.fullName}
            />
          </label>
          <label>
            Email
            <input
              onChange={(event) => updateNewUser("email", event.target.value)}
              placeholder="usuario@ejemplo.com"
              required
              type="email"
              value={newUser.email}
            />
          </label>
          <label>
            Contraseña inicial
            <input
              onChange={(event) => updateNewUser("password", event.target.value)}
              required
              type="password"
              value={newUser.password}
            />
          </label>
          <label>
            Rol
            <select onChange={(event) => updateNewUser("role", event.target.value)} value={newUser.role}>
              {managedRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          {localError && <p className="auth-error wide">{localError}</p>}
          <button type="submit">Crear usuario</button>
        </form>
      </article>

      <article className="panel user-admin-panel">
        <div className="section-heading">
          <div>
            <h3>Usuarios registrados</h3>
            <span className="table-note">{status}</span>
          </div>
        </div>

        <div className="user-admin-note">
          <strong>Nota técnica</strong>
          <p>
            Crear y eliminar usuarios requiere la Edge Function <b>admin-users</b> desplegada en Supabase.
            Si falla, revisa que la función esté publicada y que exista la secret <b>SUPABASE_SERVICE_ROLE_KEY</b>.
          </p>
        </div>

        <div className="table-scroll">
          <table className="user-admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Alta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profileRows.length ? (
                profileRows.map((profile) => {
                  const isCurrentUser = profile.id === currentUser.id;

                  return (
                    <tr key={profile.id}>
                      <td>
                        <span className="user-cell">
                          <span className="avatar small">{profile.initials}</span>
                          <b>{profile.displayName}</b>
                        </span>
                      </td>
                      <td>{profile.email}</td>
                      <td>
                        <select
                          aria-label={`Rol de ${profile.displayName}`}
                          disabled={isCurrentUser || roleUpdatingId === profile.id}
                          onChange={(event) => onRoleChange(profile.id, event.target.value)}
                          value={profile.role}
                        >
                          {managedRoleOptions.map((role) => (
                            <option key={role} value={role}>
                              {roleLabels[role]}
                            </option>
                          ))}
                        </select>
                        {isCurrentUser && <span className="self-user-note">Tu cuenta</span>}
                      </td>
                      <td>{profile.created_at ? new Date(profile.created_at).toLocaleDateString("es-ES") : "-"}</td>
                      <td>
                        <button
                          className="danger compact"
                          disabled={isCurrentUser || roleUpdatingId === profile.id}
                          onClick={() => onDeleteUser(profile)}
                          type="button"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5">Todavía no hay perfiles cargados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
