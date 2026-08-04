import React, { useMemo, useState } from "react";
import { buildCategoryMastery } from "../lib/quizEngine.js";
import { buildProgressSummary, buildWeeklyProgress } from "../lib/progressSystem.js";
import CategoryMasteryRadar from "./CategoryMasteryRadar.jsx";
import ProgressEvolutionChart from "./ProgressEvolutionChart.jsx";
import Metric from "./Metric.jsx";

function StudentInsightsDialog({ allAnswers, categories, onClose, profile, questions }) {
  const [activeCategory, setActiveCategory] = useState(null);

  const studentHistory = useMemo(
    () => allAnswers.filter((answer) => answer.userId === profile.id),
    [allAnswers, profile.id]
  );

  const summary = useMemo(
    () =>
      buildProgressSummary({
        allHistory: allAnswers,
        currentUser: { id: profile.id },
        ownHistory: studentHistory,
        questions
      }),
    [allAnswers, profile.id, questions, studentHistory]
  );

  const categoryMastery = useMemo(
    () => buildCategoryMastery(studentHistory, questions, categories),
    [categories, questions, studentHistory]
  );

  const weeklyProgress = useMemo(() => buildWeeklyProgress(studentHistory), [studentHistory]);

  const displayName = profile.full_name || profile.email;
  const initials = (profile.full_name || profile.email || "US").slice(0, 2).toUpperCase();

  return (
    <div className="profile-overlay" role="presentation">
      <section
        aria-labelledby="student-insights-title"
        aria-modal="true"
        className="profile-dialog mastery-dialog student-insights-dialog"
        role="dialog"
      >
        <div className="mastery-dialog-heading">
          <div className="user-cell">
            <span className="avatar small">{initials}</span>
            <div>
              <h2 id="student-insights-title">{displayName}</h2>
              <p>Progresión y desempeño en Patomnesis</p>
            </div>
          </div>
          <button className="ghost compact" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>

        <div className="stats-grid">
          <Metric label="PatoXP" value={summary.patoXp} />
          <Metric label="Nivel" value={`${summary.level}. ${summary.levelName}`} />
          <Metric label="Precisión global" value={`${summary.accuracy}%`} />
          <Metric label="Racha" value={`${summary.streakDays} días`} />
        </div>

        <article className="panel student-insights-panel">
          <div className="section-heading">
            <h3>Dominio por categoría</h3>
            <span className="table-note">
              {studentHistory.length ? `${studentHistory.length} respuestas registradas` : "Sin respuestas todavía"}
            </span>
          </div>
          <div className="mastery-expanded-view compact">
            <CategoryMasteryRadar
              activeCategory={activeCategory?.category}
              items={categoryMastery}
              onActiveCategoryChange={setActiveCategory}
              size="large"
            />
          </div>
        </article>

        <article className="panel student-insights-panel">
          <div className="section-heading">
            <h3>Evolución temporal</h3>
            <span className="table-note">Últimas semanas con actividad</span>
          </div>
          <ProgressEvolutionChart weeks={weeklyProgress} />
        </article>
      </section>
    </div>
  );
}

export default StudentInsightsDialog;
