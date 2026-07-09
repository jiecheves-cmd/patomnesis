import React from "react";
import CategoryMasteryRadar from "./CategoryMasteryRadar.jsx";

function MasteryDialog({ items, onClose }) {
  return (
    <div className="profile-overlay" role="presentation">
      <section className="profile-dialog mastery-dialog" aria-modal="true" role="dialog" aria-labelledby="mastery-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mapa de dominio</p>
            <h2 id="mastery-title">Rendimiento por categoría</h2>
          </div>
          <button className="ghost compact" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
        <CategoryMasteryRadar items={items} />
        <div className="mastery-list expanded">
          {items.map((item) => (
            <div className="mastery-row" key={item.category}>
              <div>
                <strong>{item.category}</strong>
                <span>
                  {item.attempts
                    ? `${item.attempts} contestadas · ${item.correct} aciertos · ${item.wrong} fallos`
                    : `${item.questionCount} preguntas disponibles · todavía sin respuestas`}
                </span>
              </div>
              <b>{item.attempts ? `${item.precision}%` : "Sin datos"}</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default MasteryDialog;
