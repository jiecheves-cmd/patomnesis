import React, { useMemo, useRef, useState } from "react";
import { difficultyLabels, questionThemes, roleLabels, seedQuestions } from "./data/questions.js";
import { isSupabaseConfigured } from "./lib/supabase.js";

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
  teacher: "teacher"
};

const roleAccess = {
  student: ["student"],
  teacher: ["student", "teacher"],
  supervisor: ["student", "teacher", "supervisor"]
};

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
  const [editorQuestion, setEditorQuestion] = useState(() => cloneQuestion(emptyQuestion));
  const [editingId, setEditingId] = useState(null);
  const [importMessage, setImportMessage] = useState("");

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

  const availableRoles = roleAccess[session.userRole];

  function changeRole(nextRole) {
    setRole(nextRole);
    setShowQuiz(false);
    setQuizMode("practice");
    setSelectedOptionId(null);
  }

  function startQuiz(source = filteredQuestions, mode = "practice") {
    const nextDeck = prepareDeck(source, questionCount);
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
    startQuiz(questions);
  }

  function startSmartSession() {
    const smartDeck = selectSmartQuestions(questions, answerHistory, Math.min(10, questions.length));
    setSelectedCategories([]);
    setDifficulty("Todas");
    setDeck(smartDeck);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setAnswers([]);
    setQuizMode("practice");
    setShowQuiz(true);
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
      category: currentQuestion.category,
      difficulty: currentQuestion.difficulty,
      selectedOptionId: option.id,
      correctOptionId: correctOption.id,
      isCorrect: option.isCorrect
    };

    setAnswers((previous) => [...previous, nextAnswer]);
    setAnswerHistory((previous) => [...previous, nextAnswer]);

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
            <span className="avatar">SU</span>
            <span>{roleLabels[session.userRole]}</span>
            <button className="ghost" type="button">
              Mi perfil
            </button>
            <button className="ghost" type="button">
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
              {isSupabaseConfigured ? "Supabase conectado" : "Demo local"}
            </span>
          </nav>
        )}
      </header>

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

      {role === "supervisor" && <SupervisorDashboard answers={answers} questions={questions} />}
    </main>
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

  function handleNewQuestion() {
    newQuestion();
    setEditorVisible(true);
  }

  function handleEditQuestion(question) {
    editQuestion(question);
    setEditorVisible(true);
  }

  function closeEditor() {
    setEditorVisible(false);
  }

  return (
    <section className="teacher-layout">
      <div className="teacher-subnav">
        <button className="ghost" type="button">Estadísticas</button>
        <button className="ghost" type="button">Ranking</button>
        <button className="active" type="button">Preguntas</button>
        <button className="ghost" type="button">Generar IA</button>
        <button className="ghost" onClick={() => fileInputRef.current?.click()} type="button">Importar</button>
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
    </section>
  );
}

function SupervisorDashboard({ answers, questions }) {
  const rows = useMemo(() => {
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

  const weakCategory = rows.length ? [...rows].sort((a, b) => a.precision - b.precision)[0].category : "Sin datos";

  return (
    <section className="panel supervisor">
      <h2>Panel supervisor</h2>
      <div className="metric-grid">
        <Metric label="Preguntas en banco" value={questions.length} />
        <Metric label="Respuestas registradas" value={answers.length} />
        <Metric label="Tema a reforzar" value={weakCategory} />
      </div>
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
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>{row.correct}</td>
                <td>{row.wrong}</td>
                <td>{row.precision}%</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4">Todavía no hay respuestas en esta sesión local.</td>
            </tr>
          )}
        </tbody>
      </table>
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
