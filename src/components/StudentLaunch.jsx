import React, { useState } from "react";
import { difficultyLabels } from "../data/questions.js";
import CategoryMasteryRadar from "./CategoryMasteryRadar.jsx";
import MasteryDialog from "./MasteryDialog.jsx";

function StudentLaunch({
  categories,
  categoryMastery,
  difficulty,
  filteredCount,
  hasMistakes,
  onQuickStart,
  onRetryMistakes,
  onStartExam,
  onStartFiltered,
  progress,
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
  const [masteryOpen, setMasteryOpen] = useState(false);
  const focusTopics = smartSession.weakTopics.length
    ? smartSession.weakTopics
    : categories.slice(0, 3);
  const dailyProgress = Math.min(stats.answered, 20);
  const allTopicsSelected = selectedCategories.length === 0;
  const rankingLabel = progress.rankingPosition ? `#${progress.rankingPosition}` : "-";
  const streakLabel =
    progress.streakDays === 1 ? "1 día seguido" : `${progress.streakDays} días seguidos`;
  const nextLevelText = progress.nextLevel
    ? `Siguiente: Nivel ${progress.nextLevel.level} · ${progress.nextLevel.name}`
    : "Nivel máximo alcanzado";
  const nextRequirementText = progress.nextLevel
    ? `${progress.xpToNext} XP y ${progress.accuracyToNext}% de precisión para subir`
    : "Has completado los 10 niveles.";

  return (
    <section className="student-dashboard">
      <article className="student-main-card">
        <div className="smart-card">
          <div>
            <p className="smart-label">Sesión inteligente</p>
            <h2>Hasta 10 preguntas adaptadas a ti</h2>
            <p>{smartSession.hasActivityToday ? "Tus puntos más débiles de hoy:" : "Tu punto de partida:"}</p>
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
          <div className="streak">Racha diaria: {streakLabel}</div>
          <strong>{rankingLabel}</strong>
          <p>
            posición en el ranking global
            {progress.leaderboardSize > 1 ? ` de ${progress.leaderboardSize}` : ""}
          </p>
          <div className="xp-line">
            <b>{progress.patoXp} PatoXP acumulados</b>
            <span><i style={{ width: `${progress.progressToNext}%` }} /></span>
          </div>
          <p>Nivel {progress.level}</p>
          <h3>{progress.levelName}</h3>
          <small>Cobertura: {progress.coverageAnswered} / {progress.coverageTotal} preguntas</small>
          <small>{nextLevelText}</small>
          <small>{nextRequirementText}</small>
        </section>

        <section className="map-card">
          <div className="section-heading">
            <h3>Tu mapa de dominio</h3>
            <button className="tiny-pill" onClick={() => setMasteryOpen(true)} type="button">Ampliar</button>
          </div>
          <CategoryMasteryRadar items={categoryMastery} />
          <button className="secondary retry-full" disabled={!hasMistakes} onClick={onRetryMistakes} type="button">
            Repasar fallos
          </button>
        </section>
      </aside>

      {masteryOpen && (
        <MasteryDialog items={categoryMastery} onClose={() => setMasteryOpen(false)} />
      )}
    </section>
  );
}

export default StudentLaunch;
