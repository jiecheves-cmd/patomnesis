import React from "react";

function GlobalRanking({ currentUser, onRefresh, rows, status }) {
  const rankedRows = rows
    .filter((row) => row.role === "student" && row.total_answers > 0)
    .sort((a, b) => b.pato_xp - a.pato_xp || b.correct_answers - a.correct_answers || b.total_answers - a.total_answers);

  return (
    <section className="league-board">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ranking global</p>
          <h2>Clasificación de todo el tiempo</h2>
          <span className="table-note">PatoXP acumulado desde que empezaste a usar Patomnesis</span>
        </div>
        <button className="ghost compact" onClick={onRefresh} type="button">
          Actualizar
        </button>
      </div>

      <article className="panel league-panel">
        <div className="section-heading">
          <h3>Todos los alumnos</h3>
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
                  <span className="league-stat">
                    {row.correct_answers}/{row.total_answers} correctas
                  </span>
                  <span className="league-xp">{row.pato_xp} XP</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="radar-empty">Todavía no hay respuestas registradas.</p>
        )}
      </article>
    </section>
  );
}

export default GlobalRanking;
