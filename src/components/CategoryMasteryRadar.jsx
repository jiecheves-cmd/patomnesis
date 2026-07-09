import React from "react";

function getRadarPoint(center, radius, angle) {
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle)
  };
}

function CategoryMasteryRadar({ items }) {
  const activeItems = items.filter((item) => item.questionCount > 0 || item.attempts > 0);
  const chartItems = [...activeItems]
    .sort((a, b) => Number(b.attempts > 0) - Number(a.attempts > 0) || b.attempts - a.attempts)
    .slice(0, 8);
  const center = 132;
  const maxRadius = 82;
  const labelRadius = 112;
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
    <div className="mastery-radar">
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
          const labelPoint = getRadarPoint(center, labelRadius, angle);
          return (
            <g key={`axis-${item.category}`}>
              <line className="radar-axis" x1={center} x2={axisEnd.x} y1={center} y2={axisEnd.y} />
              <text
                className="radar-label"
                textAnchor={labelPoint.x < center - 12 ? "end" : labelPoint.x > center + 12 ? "start" : "middle"}
                x={labelPoint.x}
                y={labelPoint.y}
              >
                {item.category.replace("Patología ", "").replace(" y ", " / ")}
              </text>
            </g>
          );
        })}
        {canDrawPolygon && <polygon className="radar-score" points={polygonPoints} />}
        {chartItems.map((item, index) => {
          if (!item.attempts) return null;
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / pointCount;
          const point = getRadarPoint(center, maxRadius * (item.precision / 100), angle);
          return <circle className="radar-dot" cx={point.x} cy={point.y} key={`dot-${item.category}`} r="4" />;
        })}
      </svg>
      <p>
        {hasAnswers
          ? "El radar muestra % de acierto por categoría contestada."
          : "Contesta preguntas para empezar a dibujar tu dominio real."}
      </p>
    </div>
  );
}

export default CategoryMasteryRadar;
