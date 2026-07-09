import React from "react";
import { difficultyLabels } from "../data/questions.js";
import Metric from "./Metric.jsx";

function TeacherStats({ questions, stats }) {
  const maxThemeCount = Math.max(1, ...stats.byTheme.map((item) => item.count));
  const total = Math.max(1, questions.length);

  return (
    <section className="teacher-stats">
      <div className="stats-grid">
        <Metric label="Preguntas en banco" value={questions.length} />
        <Metric label="Con imagen" value={stats.withImages} />
        <Metric label="Con explicación" value={stats.withExplanation} />
        <Metric label="Avanzadas" value={stats.advanced} />
      </div>

      <div className="stats-panels">
        <article className="panel stat-panel">
          <h3>Dificultad</h3>
          <div className="stat-bars">
            {stats.byDifficulty.map((item) => (
              <div className="stat-row" key={item.difficulty}>
                <span>{difficultyLabels[item.difficulty]}</span>
                <div className="stat-track">
                  <i style={{ width: `${(item.count / total) * 100}%` }} />
                </div>
                <b>{item.count}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="panel stat-panel">
          <h3>Temas con preguntas</h3>
          <div className="stat-bars">
            {stats.byTheme.length ? (
              stats.byTheme.map((item) => (
                <div className="stat-row" key={item.theme}>
                  <span>{item.theme}</span>
                  <div className="stat-track">
                    <i style={{ width: `${(item.count / maxThemeCount) * 100}%` }} />
                  </div>
                  <b>{item.count}</b>
                </div>
              ))
            ) : (
              <p className="empty-stat">Todavía no hay preguntas clasificadas por tema.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

export default TeacherStats;
