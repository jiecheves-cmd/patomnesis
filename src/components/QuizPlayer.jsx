import React, { useState } from "react";
import { difficultyLabels } from "../data/questions.js";
import Metric from "./Metric.jsx";
import QuestionImage from "./QuestionImage.jsx";

function FlagQuestionControl({ onFlagQuestion, questionId }) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("idle");

  if (!onFlagQuestion) return null;

  if (status === "sent") {
    return <p className="flag-question-sent">Gracias, hemos avisado al profesorado para que la revise.</p>;
  }

  if (!open) {
    return (
      <button className="flag-question-trigger" onClick={() => setOpen(true)} type="button">
        ⚑ Reportar un error en esta pregunta
      </button>
    );
  }

  async function submitFlag() {
    if (!comment.trim()) return;
    setStatus("sending");
    try {
      await onFlagQuestion({ comment, questionId });
      setStatus("sent");
    } catch (error) {
      setStatus("error");
    }
  }

  return (
    <div className="flag-question-form">
      <label htmlFor="flag-comment">
        Describe el error que has detectado en el enunciado, las opciones o la explicación, para que el
        profesorado pueda corregirlo:
      </label>
      <textarea
        id="flag-comment"
        onChange={(event) => setComment(event.target.value)}
        placeholder="Ej: la respuesta correcta no coincide con la explicación..."
        rows={3}
        value={comment}
      />
      {status === "error" && <p className="flag-question-error">No se pudo enviar, inténtalo de nuevo.</p>}
      <div className="flag-question-actions">
        <button disabled={!comment.trim() || status === "sending"} onClick={submitFlag} type="button">
          {status === "sending" ? "Enviando..." : "Enviar"}
        </button>
        <button className="secondary" onClick={() => setOpen(false)} type="button">
          Cancelar
        </button>
      </div>
    </div>
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
  onFlagQuestion,
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
        <QuestionImage value={currentQuestion.imageUrl} />
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
            <FlagQuestionControl key={currentQuestion.id} onFlagQuestion={onFlagQuestion} questionId={currentQuestion.id} />
            <button onClick={nextQuestion} type="button">
              Siguiente
            </button>
          </div>
        )}
      </article>
    </section>
  );
}

export default QuizPlayer;
