import React, { useMemo, useState } from "react";
import CategoryMasteryRadar, { getRadarItems } from "./CategoryMasteryRadar.jsx";

function MasteryDialog({ items, onClose }) {
  const chartItems = useMemo(() => getRadarItems(items), [items]);
  const [activeItem, setActiveItem] = useState(() => chartItems.find((item) => item.attempts > 0) || chartItems[0]);
  const precisionLabel = activeItem?.attempts ? `${activeItem.precision}%` : "Sin datos";

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
        <div className="mastery-expanded-view">
          <CategoryMasteryRadar
            activeCategory={activeItem?.category}
            items={items}
            onActiveCategoryChange={setActiveItem}
            size="large"
          />
          <aside className="mastery-inspector">
            {activeItem ? (
              <>
                <span className="eyebrow">Categoría seleccionada</span>
                <h3>{activeItem.category}</h3>
                <strong>{precisionLabel}</strong>
                <p>
                  {activeItem.attempts
                    ? `${activeItem.correct} aciertos y ${activeItem.wrong} fallos en ${activeItem.attempts} preguntas contestadas.`
                    : `${activeItem.questionCount} preguntas disponibles. Todavía no hay respuestas registradas.`}
                </p>
                <div className="mastery-mini-stats">
                  <span>
                    Contestadas
                    <b>{activeItem.attempts}</b>
                  </span>
                  <span>
                    Aciertos
                    <b>{activeItem.correct}</b>
                  </span>
                  <span>
                    Fallos
                    <b>{activeItem.wrong}</b>
                  </span>
                </div>
              </>
            ) : (
              <p>Contesta preguntas para activar el mapa de dominio.</p>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

export default MasteryDialog;
