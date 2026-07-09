import React from "react";

export function getRadarItems(items) {
  return items
    .filter((item) => item.questionCount > 0 || item.attempts > 0)
    .sort((a, b) => Number(b.attempts > 0) - Number(a.attempts > 0) || b.attempts - a.attempts)
    .slice(0, 8);
}

function getRadarPoint(center, radius, angle) {
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle)
  };
}

function CategoryMasteryRadar({ activeCategory, items, onActiveCategoryChange, size = "compact" }) {
  const chartItems = getRadarItems(items);
  const center = 132;
  const maxRadius = 82;
  const pointCount = Math.max(chartItems.length, 3);
  const polygonPoints = chartItems
    .map((item, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / pointCount;
      const radius = maxRadius * (item.attempts ? item.precision / 100 : 0);
      const point = getRadarPoint(center, radius, angle);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  const gridLevels = [0.33, 0.66, 1];
  const hasAnswers = chartItems.some((item) => item.attempts > 0);
  const canDrawPolygon = hasAnswers && chartItems.length >= 3;

  if (!chartItems.length) {
    return <p className="radar-empty">Todavía no hay preguntas clasificadas para construir el mapa.</p>;
  }

  return (
    <div className={`mastery-radar ${size}`}>
      <svg aria-label="Mapa de dominio por categoría" role="img" viewBox="0 0 264 264">
        {gridLevels.map((level) => {
          const points = Array.from({ length: pointCount }, (_, index) => {
            const angle = -Math.PI / 2 + (index * 2 * Math.PI) / pointCount;
            const point = getRadarPoint(center, maxRadius * level, angle);
            return `${point.x},${point.y}`;
          }).join(" ");
          return <polygon className="radar-grid" key={level} points={points} />;
        })}
        {chartItems.map((item, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / pointCount;
          const axisEnd = getRadarPoint(center, maxRadius, angle);
          return (
            <g key={`axis-${item.category}`}>
              <line className="radar-axis" x1={center} x2={axisEnd.x} y1={center} y2={axisEnd.y} />
            </g>
          );
        })}
        {canDrawPolygon && <polygon className="radar-score" points={polygonPoints} />}
        {chartItems.map((item, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / pointCount;
          const point = getRadarPoint(center, maxRadius * (item.precision / 100), angle);
          const isActive = activeCategory === item.category;

          return (
            <g
              aria-label={`${item.category}: ${item.attempts ? `${item.precision}% de acierto` : "sin respuestas"}`}
              className="radar-dot-group"
              key={`dot-${item.category}`}
              onClick={() => onActiveCategoryChange?.(item)}
              onFocus={() => onActiveCategoryChange?.(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onActiveCategoryChange?.(item);
                }
              }}
              onMouseEnter={() => onActiveCategoryChange?.(item)}
              role="button"
              tabIndex={0}
            >
              <title>
                {item.attempts
                  ? `${item.category}: ${item.precision}% (${item.correct}/${item.attempts})`
                  : `${item.category}: sin respuestas todavía`}
              </title>
              <circle className="radar-dot-target" cx={point.x} cy={point.y} r="13" />
              <circle className={isActive ? "radar-dot selected" : "radar-dot"} cx={point.x} cy={point.y} r="4" />
            </g>
          );
        })}
      </svg>
      <p>
        {hasAnswers
          ? size === "large"
            ? "Selecciona un punto para ver el detalle."
            : "Radar por categorías contestadas."
          : "Contesta preguntas para empezar a dibujar tu dominio real."}
      </p>
    </div>
  );
}

export default CategoryMasteryRadar;
