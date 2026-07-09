import React from "react";
import { difficultyLabels } from "../data/questions.js";
import Metric from "./Metric.jsx";

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

export default QuizPlayer;
