import React, { useMemo, useState } from "react";
import { difficultyLabels } from "../data/questions.js";
import QuestionImage from "./QuestionImage.jsx";

function DraftPreview({ changeQuestionStatus, questions }) {
  const draftQuestions = useMemo(() => questions.filter((question) => question.status === "draft"), [questions]);

  const [sessionQuestions, setSessionQuestions] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [statusById, setStatusById] = useState({});
  const [pendingId, setPendingId] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const currentQuestion = sessionQuestions ? sessionQuestions[currentIndex] : null;
  const currentStatus = currentQuestion ? statusById[currentQuestion.id] : null;
  const correctOption = currentQuestion?.options.find((option) => option.isCorrect);

  function startSession() {
    setSessionQuestions(draftQuestions);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setCorrectCount(0);
    setStatusById({});
    setActionMessage("");
  }

  function exitSession() {
    setSessionQuestions(null);
    setSelectedOptionId(null);
  }

  function selectOption(option) {
    if (selectedOptionId) return;
    setSelectedOptionId(option.id);
    if (option.isCorrect) setCorrectCount((count) => count + 1);
  }

  function goToQuestion(nextIndex) {
    setCurrentIndex(nextIndex);
    setSelectedOptionId(null);
  }

  async function applyStatus(nextStatus) {
    if (!currentQuestion || !changeQuestionStatus) return;
    setPendingId(currentQuestion.id);
    try {
      await changeQuestionStatus(currentQuestion.id, nextStatus);
      setStatusById((current) => ({ ...current, [currentQuestion.id]: nextStatus }));
      setActionMessage(nextStatus === "published" ? "Pregunta publicada." : "Pregunta archivada.");
    } catch (error) {
      setActionMessage(`No se pudo actualizar: ${error.message || "inténtalo de nuevo."}`);
    } finally {
      setPendingId("");
    }
  }

  if (!draftQuestions.length && !sessionQuestions) {
    return (
      <section className="draft-preview">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Probar pendientes</p>
            <h2>No hay preguntas pendientes</h2>
            <span className="table-note">Todo el banco está publicado o archivado ahora mismo.</span>
          </div>
        </div>
      </section>
    );
  }

  if (!sessionQuestions) {
    return (
      <section className="draft-preview">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Probar pendientes</p>
            <h2>{draftQuestions.length} preguntas esperando revisión</h2>
            <span className="table-note">
              Contéstalas como lo haría un alumno para comprobar que están bien hechas. Nada de esto se guarda en
              estadísticas, PatoXP ni historial — es solo una prueba.
            </span>
          </div>
          <button onClick={startSession} type="button">
            Empezar prueba
          </button>
        </div>
      </section>
    );
  }

  if (!currentQuestion) {
    const publishedCount = Object.values(statusById).filter((status) => status === "published").length;
    const archivedCount = Object.values(statusById).filter((status) => status === "archived").length;

    return (
      <section className="panel empty-state">
        <h2>Prueba terminada</h2>
        <p>
          Resultado: {correctCount} de {sessionQuestions.length} correctas.
        </p>
        {(publishedCount > 0 || archivedCount > 0) && (
          <p>
            {publishedCount > 0 && <>Publicadas: {publishedCount}. </>}
            {archivedCount > 0 && <>Archivadas: {archivedCount}.</>}
          </p>
        )}
        <button onClick={exitSession} type="button">
          Volver a la lista
        </button>
      </section>
    );
  }

  return (
    <section className="grid">
      <aside className="panel metrics">
        <p className="eyebrow">Modo prueba (no se guarda)</p>
        <div className="stats-grid compact">
          <span>
            Pregunta {currentIndex + 1}/{sessionQuestions.length}
          </span>
          <span>Aciertos: {correctCount}</span>
        </div>
        <div className="draft-preview-nav">
          {sessionQuestions.map((question, index) => (
            <button
              className={`draft-preview-dot ${index === currentIndex ? "current" : ""} ${
                statusById[question.id] || ""
              }`}
              key={question.id}
              onClick={() => goToQuestion(index)}
              title={`Pregunta ${index + 1}`}
              type="button"
            >
              {index + 1}
            </button>
          ))}
        </div>
        <button className="secondary wide-action" onClick={exitSession} type="button">
          Salir de la prueba
        </button>
      </aside>

      <article className="panel quiz-card">
        <div className="question-meta">
          <span className="tag">{currentQuestion.category}</span>
          <span className={`difficulty ${currentQuestion.difficulty}`}>
            {difficultyLabels[currentQuestion.difficulty]}
          </span>
          {currentStatus === "published" && <span className="precision-pill good">Publicada</span>}
          {currentStatus === "archived" && <span className="precision-pill low">Archivada</span>}
        </div>
        <h2>{currentQuestion.stem}</h2>
        <QuestionImage value={currentQuestion.imageUrl} />
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
              <button
                className={className}
                disabled={shouldReveal}
                key={option.id}
                onClick={() => selectOption(option)}
                type="button"
              >
                <span className="answer-letter">{letter}</span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>
        {selectedOptionId && (
          <div className="feedback">
            <strong>
              {currentQuestion.options.find((option) => option.id === selectedOptionId)?.isCorrect
                ? "Correcto."
                : "Incorrecto."}
            </strong>
            <p>{currentQuestion.explanation}</p>
            <p>
              <b>Respuesta:</b> {correctOption?.text}
            </p>
            <p>
              <b>Idea clave:</b> {currentQuestion.keyPoint}
            </p>

            {actionMessage && <p className="draft-preview-action-message">{actionMessage}</p>}

            <div className="draft-preview-actions">
              <button
                disabled={pendingId === currentQuestion.id || currentStatus === "published"}
                onClick={() => applyStatus("published")}
                type="button"
              >
                {currentStatus === "published" ? "Ya publicada" : "Publicar esta pregunta"}
              </button>
              <button
                className="secondary"
                disabled={pendingId === currentQuestion.id || currentStatus === "archived"}
                onClick={() => applyStatus("archived")}
                type="button"
              >
                Archivar
              </button>
              {currentIndex < sessionQuestions.length - 1 ? (
                <button className="secondary" onClick={() => goToQuestion(currentIndex + 1)} type="button">
                  Siguiente pregunta
                </button>
              ) : (
                <button className="secondary" onClick={() => goToQuestion(currentIndex + 1)} type="button">
                  Terminar prueba
                </button>
              )}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

export default DraftPreview;
