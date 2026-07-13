import React, { useMemo, useRef, useState } from "react";
import { difficultyLabels, questionThemes } from "../data/questions.js";
import { normalizeText } from "../lib/importQuestions.js";
import QuestionImage from "./QuestionImage.jsx";
import TeacherStats from "./TeacherStats.jsx";

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
                  <input
                    placeholder="URL directa, enlace de Drive/Dropbox o ruta de Supabase Storage"
                    value={editorQuestion.imageUrl}
                    onChange={(event) => updateEditorField("imageUrl", event.target.value)}
                  />
                </label>
                {editorQuestion.imageUrl && (
                  <div className="wide image-preview">
                    <span>Vista previa</span>
                    <QuestionImage preview value={editorQuestion.imageUrl} />
                  </div>
                )}
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
                        <QuestionImage className="question-image bank-question-image" value={question.imageUrl} />
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

export default TeacherBank;
