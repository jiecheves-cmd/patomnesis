import React, { useEffect, useMemo, useState } from "react";
import { questionThemes, roleLabels, seedQuestions } from "./data/questions.js";
import { useIdleLogout } from "./lib/idleLogout.js";
import {
  createQuizAttempt,
  deleteQuestionFromSupabase,
  fetchAllAnswerHistory,
  fetchGlobalLeaderboard,
  fetchOwnAnswerHistory,
  fetchPublishedQuestions,
  finishQuizAttempt,
  getCurrentProfileSession,
  isSupabaseConfigured,
  recordQuizAnswer,
  saveQuestionToSupabase,
  sendPasswordResetEmail,
  signInWithPassword,
  signOutUser,
  updateOwnPassword,
  updateOwnProfile,
  updateOwnUserMetadata
} from "./lib/supabase.js";
import {
  cloneQuestion,
  describeSupabaseError,
  getInitialSession,
  getSessionUser,
  getSmartSessionSummary,
  buildCategoryMastery,
  isUuid,
  prepareDeck,
  roleAccess,
  selectSmartQuestions
} from "./lib/quizEngine.js";
import { buildProgressSummary } from "./lib/progressSystem.js";
import { buildImportedQuestions, readQuestionRowsFromFile } from "./lib/importQuestions.js";
import {
  LoginScreen,
  ProfileDialog,
  StudentLaunch,
  QuizPlayer,
  TeacherBank,
  SupervisorDashboard
} from "./components/index.js";

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

const LOCAL_QUESTIONS_KEY = "patomnesis.questions.v1";

function readStoredQuestions() {
  if (typeof window === "undefined") return seedQuestions;

  try {
    const stored = window.localStorage.getItem(LOCAL_QUESTIONS_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : seedQuestions;
  } catch (error) {
    console.warn("No se pudo leer el banco local de preguntas", error);
    return seedQuestions;
  }
}

function storeQuestionsLocally(nextQuestions) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCAL_QUESTIONS_KEY, JSON.stringify(nextQuestions));
  } catch (error) {
    console.warn("No se pudo guardar el banco local de preguntas", error);
  }
}

function isPlayableQuestion(question) {
  const options = question?.options || [];
  const hasCorrectOption = options.some((option) => option.isCorrect && option.text?.trim());
  const hasDistractor = options.some((option) => !option.isCorrect && option.text?.trim());

  return Boolean(question?.stem?.trim() && question?.category && options.length >= 2 && hasCorrectOption && hasDistractor);
}

function App() {
  const isPasswordRecovery = new URLSearchParams(window.location.search).get("password_recovery") === "1";
  const [session] = useState(() => getInitialSession());
  const [role, setRole] = useState(session.viewRole);
  const [questions, setQuestions] = useState(() => readStoredQuestions());
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
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
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
  const [profileOpen, setProfileOpen] = useState(isPasswordRecovery);
  const [profileMessage, setProfileMessage] = useState(
    isPasswordRecovery ? "Has entrado desde un enlace de recuperación. Escribe una contraseña nueva y guárdala." : ""
  );

  const categories = useMemo(
    () =>
      Array.from(new Set([...questionThemes, ...questions.map((question) => question.category)])).filter(Boolean),
    [questions]
  );

  const currentQuestion = deck[currentIndex];
  const currentAnswer = currentQuestion
    ? answers.find((answer) => answer.questionId === currentQuestion.id)
    : null;

  const playableQuestions = useMemo(() => questions.filter(isPlayableQuestion), [questions]);

  const filteredQuestions = useMemo(
    () =>
      playableQuestions.filter((question) => {
        const categoryMatch =
          selectedCategories.length === 0 || selectedCategories.includes(question.category);
        const difficultyMatch = difficulty === "Todas" || question.difficulty === difficulty;
        return categoryMatch && difficultyMatch;
      }),
    [difficulty, playableQuestions, selectedCategories]
  );

  const stats = useMemo(() => {
    const correct = answers.filter((answer) => answer.isCorrect).length;
    const precision = answers.length ? Math.round((correct / answers.length) * 100) : 0;
    return { correct, precision, answered: answers.length };
  }, [answers]);

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

  const currentUserAnswerHistory = useMemo(
    () => answerHistory.filter((answer) => !supabaseUser || answer.userId === currentUser.id),
    [answerHistory, currentUser.id, supabaseUser]
  );

  const studentStats = useMemo(() => {
    const correct = currentUserAnswerHistory.filter((answer) => answer.isCorrect).length;
    const precision = currentUserAnswerHistory.length ? Math.round((correct / currentUserAnswerHistory.length) * 100) : 0;
    return { correct, precision, answered: currentUserAnswerHistory.length };
  }, [currentUserAnswerHistory]);

  const progressSummary = useMemo(
    () =>
      buildProgressSummary({
        allHistory: answerHistory,
        currentUser,
        ownHistory: currentUserAnswerHistory,
        questions: playableQuestions,
        remoteLeaderboard: globalLeaderboard
      }),
    [answerHistory, currentUser, currentUserAnswerHistory, globalLeaderboard, playableQuestions]
  );

  const categoryMastery = useMemo(
    () => buildCategoryMastery(currentUserAnswerHistory, questions, categories),
    [categories, currentUserAnswerHistory, questions]
  );

  const smartSession = useMemo(
    () => getSmartSessionSummary(playableQuestions, currentUserAnswerHistory),
    [currentUserAnswerHistory, playableQuestions]
  );

  async function loadAnswerHistoryForProfile(profile) {
    if (profile?.role === "supervisor" || profile?.role === "admin") {
      return fetchAllAnswerHistory();
    }

    return fetchOwnAnswerHistory();
  }

  useEffect(() => {
    storeQuestionsLocally(questions);
  }, [questions]);

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
      const playableRemoteQuestions = remoteQuestions.filter(isPlayableQuestion);
      const auth = authResult.status === "fulfilled" ? authResult.value : { profile: null, user: null };

      if (questionsResult.status === "rejected") {
        console.warn("No se pudieron leer preguntas de Supabase", questionsResult.reason);
      }

      if (authResult.status === "rejected") {
        console.warn("No se pudo leer la sesión de Supabase", authResult.reason);
      }

      if (remoteQuestions.length) {
        setQuestions(remoteQuestions);
        if (playableRemoteQuestions.length) {
          setDeck(prepareDeck(playableRemoteQuestions, 6));
        }
      }

      setSupabaseUser(auth.user);
      setSupabaseProfile(auth.profile);
      if (auth.profile?.role) setRole(auth.profile.role);

      if (auth.user) {
        try {
          setAnswerHistory(await loadAnswerHistoryForProfile(auth.profile));
          fetchGlobalLeaderboard()
            .then(setGlobalLeaderboard)
            .catch((error) => {
              console.warn("No se pudo cargar el ranking global", error);
              setGlobalLeaderboard([]);
            });
        } catch (error) {
          console.warn("No se pudo cargar el historial de respuestas", error);
        }
      }

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

  useIdleLogout(Boolean(isSupabaseConfigured && supabaseUser), handleSignOut, 30 * 60 * 1000);

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
      setAnswerHistory(await loadAnswerHistoryForProfile(auth.profile));
      try {
        setGlobalLeaderboard(await fetchGlobalLeaderboard());
      } catch (error) {
        console.warn("No se pudo cargar el ranking global", error);
        setGlobalLeaderboard([]);
      }
    } catch (error) {
      setAuthError(describeSupabaseError(error));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handlePasswordReset(email) {
    await sendPasswordResetEmail(email);
  }

  async function handleSignOut() {
    setAuthError("");
    setAuthLoading(true);

    try {
      await signOutUser();
      setSupabaseUser(null);
      setSupabaseProfile(null);
      setAnswerHistory([]);
      setGlobalLeaderboard([]);
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

    if (!supabaseUser || !nextDeck.length) return null;

    try {
      const attempt = await createQuizAttempt({
        categoryFilter,
        difficultyFilter,
        mode,
        studentId: supabaseUser.id,
        total: nextDeck.length
      });
      return attempt?.id || null;
    } catch (error) {
      console.warn("No se pudo crear el intento en Supabase", error);
      setSupabaseStatus("Supabase conectado · guardado pendiente");
      return null;
    }
  }

  async function startQuiz(source = filteredQuestions, mode = "practice") {
    const nextDeck = prepareDeck(source, questionCount);
    const nextAttemptId = await createAttemptForDeck(
      nextDeck,
      mode,
      selectedCategories.length ? selectedCategories.join(", ") : "Todas",
      difficulty
    );
    setActiveAttemptId(nextAttemptId);
    setDeck(nextDeck);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setAnswers([]);
    setQuizMode(mode);
    setShowQuiz(true);
  }

  function startQuickQuiz() {
    setSelectedCategories([]);
    setDifficulty("Todas");
    startQuiz(playableQuestions);
  }

  async function startSmartSession() {
    const smartDeck = selectSmartQuestions(playableQuestions, currentUserAnswerHistory, Math.min(10, playableQuestions.length));
    const nextAttemptId = await createAttemptForDeck(smartDeck, "smart", "Sesión inteligente", "Adaptativa");
    setSelectedCategories([]);
    setDifficulty("Todas");
    setActiveAttemptId(nextAttemptId);
    setDeck(smartDeck);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setAnswers([]);
    setQuizMode("smart");
    setShowQuiz(true);
  }

  function toggleCategory(nextCategory) {
    setSelectedCategories((previous) =>
      previous.includes(nextCategory)
        ? previous.filter((category) => category !== nextCategory)
        : [...previous, nextCategory]
    );
  }

  function answerQuestion(option) {
    if (!currentQuestion || (quizMode !== "exam" && selectedOptionId)) return;
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
    setGlobalLeaderboard([]);

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
    if (quizMode === "smart") {
      const answeredIds = new Set(deck.slice(0, currentIndex + 1).map((question) => question.id));
      const candidates = playableQuestions.filter((question) => !answeredIds.has(question.id));
      const remainingCount = deck.length - currentIndex - 1;
      const adaptedRemainder = selectSmartQuestions(
        candidates,
        currentUserAnswerHistory,
        Math.min(remainingCount, candidates.length)
      );
      setDeck((previous) => [...previous.slice(0, currentIndex + 1), ...adaptedRemainder]);
    }
    setCurrentIndex((index) => index + 1);
  }

  function retryMistakes() {
    const latestByQuestion = new Map();
    currentUserAnswerHistory.forEach((answer) => {
      latestByQuestion.set(answer.questionId, answer);
    });
    const missedIds = Array.from(latestByQuestion.values())
      .filter((answer) => !answer.isCorrect)
      .map((answer) => answer.questionId);
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

  async function saveQuestion() {
    const correctOption = editorQuestion.options[0];
    const hasDistractor = editorQuestion.options.slice(1).some((option) => option.text?.trim());

    if (!editorQuestion.stem.trim() || !editorQuestion.category || !correctOption?.text?.trim() || !hasDistractor) {
      setImportMessage(
        "Completa enunciado, tema principal, respuesta correcta y al menos un distractor antes de guardar."
      );
      return;
    }

    const normalized = {
      ...editorQuestion,
      id: editingId || `q-${Date.now()}`,
      options: editorQuestion.options.map((option, index) => ({
        ...option,
        id: option.id || `opt-${Date.now()}-${index}`,
        isCorrect: index === 0
      }))
    };

    try {
      const savedQuestion = supabaseUser ? await saveQuestionToSupabase(normalized) : normalized;

      setQuestions((previous) => {
        if (!editingId) return [...previous, savedQuestion];
        return previous.map((question) => (question.id === editingId ? savedQuestion : question));
      });
      setEditingId(savedQuestion.id);
      setEditorQuestion(cloneQuestion(savedQuestion));
      setImportMessage(supabaseUser ? "Pregunta guardada en Supabase." : "Pregunta guardada en este navegador local.");
    } catch (error) {
      setImportMessage(`No se pudo guardar la pregunta: ${describeSupabaseError(error)}`);
    }
  }

  function saveLocalImportedQuestions(imported) {
    setQuestions((previous) => [...previous, ...imported]);
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

      const savedQuestions = supabaseUser
        ? await Promise.all(imported.map((question) => saveQuestionToSupabase(question)))
        : imported;
      saveLocalImportedQuestions(savedQuestions);
      setImportMessage(
        `${savedQuestions.length} pregunta${savedQuestions.length === 1 ? "" : "s"} importada${savedQuestions.length === 1 ? "" : "s"} ${supabaseUser ? "en Supabase" : "en este navegador local"}.` +
          (skipped.length ? ` Filas omitidas: ${skipped.join(", ")}.` : "")
      );
    } catch (error) {
      setImportMessage("No se pudo leer el archivo. Prueba con un .xlsx, .xls o .csv con encabezados en la primera fila.");
    }
  }

  async function deleteQuestion(questionId) {
    try {
      if (supabaseUser) {
        await deleteQuestionFromSupabase(questionId);
      }
      setQuestions((previous) => previous.filter((question) => question.id !== questionId));
      if (editingId === questionId) newQuestion();
      setImportMessage("Pregunta eliminada.");
    } catch (error) {
      setImportMessage(`No se pudo eliminar la pregunta: ${describeSupabaseError(error)}`);
    }
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
    return (
      <LoginScreen
        authError=""
        authLoading={authLoading}
        onLogin={handleLogin}
        onPasswordReset={handlePasswordReset}
        status={supabaseStatus}
      />
    );
  }

  if (isSupabaseConfigured && !supabaseUser) {
    return (
      <LoginScreen
        authError={authError}
        authLoading={authLoading}
        onLogin={handleLogin}
        onPasswordReset={handlePasswordReset}
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
              categoryMastery={categoryMastery}
              difficulty={difficulty}
              filteredCount={filteredQuestions.length}
              hasMistakes={currentUserAnswerHistory.some((answer) => !answer.isCorrect)}
              onQuickStart={startSmartSession}
              onRetryMistakes={retryMistakes}
              onStartExam={() => startQuiz(filteredQuestions, "exam")}
              onStartFiltered={() => startQuiz()}
              progress={progressSummary}
              questionCount={questionCount}
              questions={playableQuestions}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              setDifficulty={setDifficulty}
              setQuestionCount={setQuestionCount}
              smartSession={smartSession}
              stats={studentStats}
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

export default App;
