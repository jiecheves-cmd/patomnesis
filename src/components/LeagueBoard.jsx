import React from "react";
import { getCurrentWeekRange } from "../lib/progressSystem.js";

function LeagueBoard({ currentUser, onRefresh, rows, status }) {
  const weekRange = getCurrentWeekRange();
  const rankedRows = rows
    .filter((row) => row.total_answers > 0)
    .sort((a, b) => b.pato_xp - a.pato_xp || b.correct_answers - a.correct_answers || b.total_answers - a.total_answers);

  return (
    <section className="league-board">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Liga semanal</p>
          <h2>
            Semana del {weekRange.startLabel} al {weekRange.endLabel}
          </h2>
          <span className="table-note">
            Se reinicia en {weekRange.daysRemaining} {weekRange.daysRemaining === 1 ? "día" : "días"}
          </span>
        </div>
        <button className="ghost compact" onClick={onRefresh} type="button">
          Actualizar
        </button>
      </div>

      <article className="panel league-panel">
        <div className="section-heading">
          <h3>Clasificación de esta semana</h3>
          <span className="table-note">{status}</span>
        </div>

        {rankedRows.length ? (
          <ol className="league-rows">
            {rankedRows.map((row, index) => {
              const isCurrentUser = row.profile_id === currentUser.id;
              const displayName = row.full_name || row.email;
              const initials = (row.full_name || row.email || "US").slice(0, 2).toUpperCase();
              const position = index + 1;

              return (
                <li className={`league-row ${isCurrentUser ? "self" : ""}`} key={row.profile_id}>
                  <span className={`league-position rank-${position <= 3 ? position : "other"}`}>{position}</span>
                  <span className="user-cell">
                    <span className="avatar small">{initials}</span>
                    <b>{displayName}</b>
                    {isCurrentUser && <span className="self-user-note">Tú</span>}
                  </span>
                  <span className="league-stat">{row.correct_answers}/{row.total_answers} correctas</span>
                  <span className="league-xp">{row.pato_xp} XP</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="radar-empty">Todavía nadie ha respondido preguntas esta semana. ¡Sé el primero!</p>
        )}
      </article>
    </section>
  );
}

export default LeagueBoard;
