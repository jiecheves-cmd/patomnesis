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

function App() {
  const [role, setRole] = useState("student");
  const [questions, setQuestions] = useState(seedQuestions);
  const [category, setCategory] = useState("Todas");
  const [difficulty, setDifficulty] = useState("Todas");
  const [deck, setDeck] = useState(() => shuffle(seedQuestions).slice(0, 6));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [answers, setAnswers] = useState([]);
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

  function startQuiz(source = filteredQuestions) {
    const nextDeck = shuffle(source).slice(0, Math.min(8, source.length));
    setDeck(nextDeck);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setAnswers([]);
  }

  function startQuickQuiz() {
    setCategory("Todas");
    setDifficulty("Todas");
    startQuiz(questions);
  }

  function startDifficultyQuiz(nextDifficulty) {
    setCategory("Todas");
    setDifficulty(nextDifficulty);
    startQuiz(questions.filter((question) => question.difficulty === nextDifficulty));
  }

  function answerQuestion(option) {
    if (!currentQuestion || selectedOptionId) return;
    const correctOption = currentQuestion.options.find((item) => item.isCorrect);
    setSelectedOptionId(option.id);
    setAnswers((previous) => [
      ...previous,
      {
        questionId: currentQuestion.id,
        category: currentQuestion.category,
        difficulty: currentQuestion.difficulty,
        selectedOptionId: option.id,
        correctOptionId: correctOption.id,
        isCorrect: option.isCorrect
      }
    ]);
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
    setRole("teacher");
  }

  function newQuestion() {
    setEditingId(null);
    setEditorQuestion(cloneQuestion(emptyQuestion));
    setRole("teacher");
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
    <main className="shell">
      <header className="hero">
        <section>
          <img
            className="brand-lockup"
            src="/brand/patomnesis-lockup.png"
            alt="Patomnesis. Quiz de anatomia patologica"
          />
          <h1 className="sr-only">Patomnesis</h1>
          <p className="lead">Mira, piensa, diagnostica.</p>
          <nav className="role-switcher" aria-label="Cambiar rol">
            {Object.entries(roleLabels).map(([value, label]) => (
              <button
                className={role === value ? "active" : ""}
                key={value}
                onClick={() => setRole(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>
        </section>
        <aside className="status-card">
          {role === "student" ? (
            <>
              <span>Practica inmediata</span>
              <strong>Ronda express</strong>
              <p>6-8 preguntas mezcladas para calentar el ojo diagnostico.</p>
              <button onClick={startQuickQuiz} type="button">
                Empezar quiz rapido
              </button>
            </>
          ) : (
            <>
              <span>Estado Supabase</span>
              <strong>{isSupabaseConfigured ? "Configurado" : "Local MVP"}</strong>
              <p>{questions.length} preguntas en banco local</p>
            </>
          )}
        </aside>
      </header>

      {role === "student" && (
        <>
          <StudentLaunch
            hasMistakes={answers.some((answer) => !answer.isCorrect)}
            onDifficultyStart={startDifficultyQuiz}
            onQuickStart={startQuickQuiz}
            onRetryMistakes={retryMistakes}
            questions={questions}
            stats={stats}
          />

          <section className="toolbar student-toolbar">
            <label>
              Categoria
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dificultad
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                <option value="Todas">Todas</option>
                {Object.entries(difficultyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => startQuiz()} type="button">
              Empezar con filtros
            </button>
            <button className="secondary" disabled={!answers.some((answer) => !answer.isCorrect)} onClick={retryMistakes} type="button">
              Repasar fallos
            </button>
          </section>

          <QuizPlayer
            answers={answers}
            currentAnswer={currentAnswer}
            currentIndex={currentIndex}
            currentQuestion={currentQuestion}
            deck={deck}
            nextQuestion={nextQuestion}
            onAnswer={answerQuestion}
            selectedOptionId={selectedOptionId}
            stats={stats}
          />
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

function StudentLaunch({ hasMistakes, onDifficultyStart, onQuickStart, onRetryMistakes, questions, stats }) {
  const difficultyCounts = useMemo(
    () =>
      Object.keys(difficultyLabels).map((difficulty) => ({
        difficulty,
        count: questions.filter((question) => question.difficulty === difficulty).length
      })),
    [questions]
  );

  return (
    <section className="student-launch">
      <article className="launch-card">
        <div>
          <p className="eyebrow">Modo alumno</p>
          <h2>Entrena el ojo antes del examen.</h2>
          <p>
            Rondas cortas con feedback inmediato para reconocer patrones, mecanismos de lesion y claves
            morfologicas.
          </p>
        </div>
        <div className="launch-actions">
          <button className="primary-large" onClick={onQuickStart} type="button">
            Empezar quiz rapido
          </button>
          <button className="secondary" disabled={!hasMistakes} onClick={onRetryMistakes} type="button">
            Repasar fallos
          </button>
        </div>
      </article>

      <aside className="launch-side">
        <div className="mini-progress">
          <span>Sesion actual</span>
          <strong>{stats.precision}%</strong>
          <p>{stats.answered} respuestas registradas</p>
        </div>
        <div className="difficulty-starts">
          {difficultyCounts.map((item) => (
            <button
              className={`difficulty-start ${item.difficulty}`}
              disabled={!item.count}
              key={item.difficulty}
              onClick={() => onDifficultyStart(item.difficulty)}
              type="button"
            >
              <span>{difficultyLabels[item.difficulty]}</span>
              <b>{item.count} preguntas</b>
            </button>
          ))}
        </div>
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
