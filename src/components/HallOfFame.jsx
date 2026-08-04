import React from "react";
import { formatWeekRangeLabel } from "../lib/progressSystem.js";

function HallOfFame({ currentUser, onRefresh, rows, status }) {
  return (
    <section className="hall-of-fame">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Hall of Fame</p>
          <h2>Campeones semanales</h2>
          <span className="table-note">Últimas {rows.length || 20} semanas con actividad</span>
        </div>
        <button className="ghost compact" onClick={onRefresh} type="button">
          Actualizar
        </button>
      </div>

      <article className="panel hall-of-fame-panel">
        <div className="section-heading">
          <h3>Ganadores por semana</h3>
          <span className="table-note">{status}</span>
        </div>

        {rows.length ? (
          <ol className="hall-of-fame-rows">
            {rows.map((row) => {
              const isCurrentUser = row.profile_id === currentUser.id;
              const displayName = row.full_name || row.email;
              const initials = (row.full_name || row.email || "US").slice(0, 2).toUpperCase();

              return (
                <li className={`hall-of-fame-row ${isCurrentUser ? "self" : ""}`} key={row.week_start}>
                  <span className="hall-of-fame-week">{formatWeekRangeLabel(row.week_start)}</span>
                  <span className="user-cell">
                    <span aria-hidden="true" className="trophy-icon">🏆</span>
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
          <p className="radar-empty">Todavía no hay semanas completas con actividad registrada.</p>
        )}
      </article>
    </section>
  );
}

export default HallOfFame;
