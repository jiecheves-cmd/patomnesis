import React, { useMemo, useState } from "react";
import { difficultyLabels, roleLabels, seedQuestions } from "./data/questions.js";
import { isSupabaseConfigured } from "./lib/supabase.js";

const emptyQuestion = {
  id: "",
  category: "",
  system: "",
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

  return selected.slice(0, count);
}

function getSmartSessionSummary(questions, history) {
  const profile = buildLearningProfile(history, questions);
  const starterTopics = Array.from(new Set(questions.map((question) => question.category))).slice(0, 3);
  const weakTopics = profile.weakCategories.length
    ? profile.weakCategories.slice(0, 3)
    : starterTopics;
  const criteria = history.length
    ? ["Fallos recientes", "Areas debiles", "Dificultad adaptativa", "Preguntas no vistas"]
    : ["Diagnostico inicial", "Variedad de temas", "Base e intermedia", "Preguntas no vistas"];

  return { criteria, weakTopics };
}

function App() {
  const [session] = useState(() => getInitialSession());
  const [role, setRole] = useState(session.viewRole);
  const [questions, setQuestions] = useState(seedQuestions);
  const [category, setCategory] = useState("Todas");
  const [difficulty, setDifficulty] = useState("Todas");
  const [deck, setDeck] = useState(() => shuffle(seedQuestions).slice(0, 6));
  const [questionCount, setQuestionCount] = useState(10);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answerHistory, setAnswerHistory] = useState([]);
  const [editorQuestion, setEditorQuestion] = useState(() => cloneQuestion(emptyQuestion));
  const [editingId, setEditingId] = useState(null);

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(questions.map((question) => question.category))).sort()],
    [questions]
  );

  const currentQuestion = deck[currentIndex];
  const currentAnswer = currentQuestion
    ? answers.find((answer) => answer.questionId === currentQuestion.id)
    : null;

  const filteredQuestions = useMemo(
    () =>
      questions.filter((question) => {
        const categoryMatch = category === "Todas" || question.category === category;
        const difficultyMatch = difficulty === "Todas" || question.difficulty === difficulty;
        return categoryMatch && difficultyMatch;
      }),
    [category, difficulty, questions]
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
    setSelectedOptionId(null);
  }

  function startQuiz(source = filteredQuestions) {
    const nextDeck = shuffle(source).slice(0, Math.min(questionCount, source.length));
    setDeck(nextDeck);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setAnswers([]);
    setShowQuiz(true);
  }

  function startQuickQuiz() {
    setCategory("Todas");
    setDifficulty("Todas");
    startQuiz(questions);
  }

  function startSmartSession() {
    const smartDeck = selectSmartQuestions(questions, answerHistory, Math.min(10, questions.length));
    setCategory("Todas");
    setDifficulty("Todas");
    setDeck(smartDeck);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setAnswers([]);
    setShowQuiz(true);
  }

  function startDifficultyQuiz(nextDifficulty) {
    setCategory("Todas");
    setDifficulty(nextDifficulty);
    startQuiz(questions.filter((question) => question.difficulty === nextDifficulty));
  }

  function answerQuestion(option) {
    if (!currentQuestion || selectedOptionId) return;
    const correctOption = currentQuestion.options.find((item) => item.isCorrect);
    const nextAnswer = {
      questionId: currentQuestion.id,
      category: currentQuestion.category,
      difficulty: currentQuestion.difficulty,
      selectedOptionId: option.id,
      correctOptionId: correctOption.id,
      isCorrect: option.isCorrect
    };

    setSelectedOptionId(option.id);
    setAnswers((previous) => [...previous, nextAnswer]);
    setAnswerHistory((previous) => [...previous, nextAnswer]);
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
              <span>Quiz de anatomia patologica</span>
            </div>
          </div>
          <div className="profile-actions">
            <span className="avatar">SU</span>
            <span>{roleLabels[session.userRole]}</span>
            <button className="ghost" type="button">
              Mi perfil
            </button>
            <button className="ghost" type="button">
              Cerrar sesion
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
              selectedOptionId={selectedOptionId}
              stats={stats}
            />
          ) : (
            <StudentLaunch
              categories={categories}
              category={category}
              difficulty={difficulty}
              filteredCount={filteredQuestions.length}
              hasMistakes={answers.some((answer) => !answer.isCorrect)}
              onDifficultyStart={startDifficultyQuiz}
              onQuickStart={startSmartSession}
              onRetryMistakes={retryMistakes}
              onStartFiltered={() => startQuiz()}
              questionCount={questionCount}
              questions={questions}
              setCategory={setCategory}
              setDifficulty={setDifficulty}
              setQuestionCount={setQuestionCount}
              smartSession={smartSession}
              stats={learningStats}
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
          newQuestion={newQuestion}
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
  category,
  difficulty,
  filteredCount,
  hasMistakes,
  onDifficultyStart,
  onQuickStart,
  onRetryMistakes,
  onStartFiltered,
  questionCount,
  questions,
  setCategory,
  setDifficulty,
  setQuestionCount,
  smartSession,
  stats
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
    : categories.filter((item) => item !== "Todas").slice(0, 3);
  const dailyProgress = Math.min(stats.answered, 20);

  return (
    <section className="student-dashboard">
      <article className="student-main-card">
        <div className="smart-card">
          <div>
            <p className="smart-label">Sesion inteligente</p>
            <h2>Hasta 10 preguntas adaptadas a ti</h2>
            <p>Tus puntos mas debiles de hoy:</p>
            <div className="focus-chips">
              {focusTopics.map((topic) => (
                <span key={topic}>{topic}</span>
              ))}
            </div>
            <div className="smart-criteria" aria-label="Criterios de seleccion">
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
          <h2>Preparado para tu siguiente reto?</h2>
          <p>
            Continua entrenando diagnostico visual con sesiones cortas, feedback inmediato y dificultad
            ajustable.
          </p>
        </div>

        <div className="mission-card">
          <div>
            <strong>Responder 20 preguntas</strong>
            <span>Suma cualquier sesion de practica o repaso inteligente.</span>
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
            <button className="tiny-pill" onClick={() => setCategory("Todas")} type="button">
              Todos
            </button>
          </div>
          <div className="topic-chips">
            {categories.map((item) => (
              <button
                className={category === item ? "active" : ""}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="control-block">
          <strong>Numero de preguntas</strong>
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
          <p className="availability">{filteredCount} preguntas disponibles con esta configuracion.</p>
        </div>

        <div className="start-stack">
          <button className="start-primary" disabled={!filteredCount} onClick={onStartFiltered} type="button">
            Empezar quiz
          </button>
          <button className="exam-mode" disabled={!filteredCount} onClick={onStartFiltered} type="button">
            Modo examen - sin feedback inmediato
          </button>
        </div>
      </article>

      <aside className="student-side">
        <section className="progress-card">
          <span>Tu progreso</span>
          <div className="streak">Racha diaria: 2 dias seguidos</div>
          <strong>#1</strong>
          <p>posicion en el ranking global</p>
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
  selectedOptionId,
  stats
}) {
  if (!currentQuestion) {
    return (
      <section className="panel empty-state">
        <h2>Ronda terminada</h2>
        <p>
          Resultado: {stats.correct} de {answers.length}. Precision {stats.precision}%.
        </p>
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
        <Metric label="Puntuacion" value={stats.correct} />
        <Metric label="Precision" value={`${stats.precision}%`} />
        <Metric label="Contestadas" value={stats.answered} />
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
            const shouldReveal = Boolean(selectedOptionId);
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
        {currentAnswer && (
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
  newQuestion,
  questions,
  saveQuestion,
  updateEditorField,
  updateOption
}) {
  return (
    <section className="teacher-layout">
      <aside className="panel bank-list">
        <div className="section-heading">
          <h2>Banco profesor</h2>
          <button className="secondary" onClick={newQuestion} type="button">
            Nueva
          </button>
        </div>
        {questions.map((question) => (
          <article className={editingId === question.id ? "bank-item selected" : "bank-item"} key={question.id}>
            <span className={`difficulty ${question.difficulty}`}>{difficultyLabels[question.difficulty]}</span>
            <h3>{question.stem}</h3>
            <p>
              {question.category} · {question.topic}
            </p>
            <div className="button-row">
              <button className="secondary" onClick={() => editQuestion(question)} type="button">
                Editar
              </button>
              <button className="danger" onClick={() => deleteQuestion(question.id)} type="button">
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </aside>

      <article className="panel editor">
        <h2>{editingId ? "Editar pregunta" : "Nueva pregunta"}</h2>
        <div className="form-grid">
          <label>
            Categoria
            <input value={editorQuestion.category} onChange={(event) => updateEditorField("category", event.target.value)} />
          </label>
          <label>
            Sistema
            <input value={editorQuestion.system} onChange={(event) => updateEditorField("system", event.target.value)} />
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
            Explicacion
            <textarea value={editorQuestion.explanation} onChange={(event) => updateEditorField("explanation", event.target.value)} />
          </label>
          <label className="wide">
            Idea clave
            <input value={editorQuestion.keyPoint} onChange={(event) => updateEditorField("keyPoint", event.target.value)} />
          </label>
        </div>
        <button onClick={saveQuestion} type="button">
          Guardar pregunta
        </button>
      </article>
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
        <Metric label="Categoria a reforzar" value={weakCategory} />
      </div>
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Correctas</th>
            <th>Fallos</th>
            <th>Precision</th>
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
              <td colSpan="4">Todavia no hay respuestas en esta sesion local.</td>
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
