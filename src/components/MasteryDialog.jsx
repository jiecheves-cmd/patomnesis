import React, { useMemo, useState } from "react";
import CategoryMasteryRadar, { getRadarItems } from "./CategoryMasteryRadar.jsx";

function MasteryDialog({ items, onClose }) {
  const chartItems = useMemo(() => getRadarItems(items, 12), [items]);
  const [activeItem, setActiveItem] = useState(() => chartItems.find((item) => item.attempts > 0) || chartItems[0]);

  return (
    <div className="profile-overlay" role="presentation">
      <section className="profile-dialog mastery-dialog" aria-modal="true" role="dialog" aria-labelledby="mastery-title">
        <div className="mastery-dialog-heading">
          <div>
            <h2 id="mastery-title">Tu mapa de dominio</h2>
            <p>Todas las categorías del banco de preguntas</p>
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
        </div>
      </section>
    </div>
  );
}

export default MasteryDialog;
