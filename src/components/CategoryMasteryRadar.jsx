import React from "react";

export function getRadarItems(items, limit = 8) {
  const sortedItems = items
    .filter((item) => item.questionCount > 0 || item.attempts > 0)
    .sort((a, b) => Number(b.attempts > 0) - Number(a.attempts > 0) || b.attempts - a.attempts);

  return sortedItems.slice(0, limit);
}

function getRadarPoint(center, radius, angle) {
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle)
  };
}

function getShortCategoryLabel(category) {
  return category
    .replace("Patología ", "")
    .replace("Lesión celular y muerte", "Lesión celular")
    .replace("Inflamación y reparación", "Inflamación")
    .replace("Trastornos hemodinámicos", "Hemodinámica")
    .replace("digestiva y hepatobiliar", "digestiva")
    .replace("ginecológica y mama", "ginecológica")
    .replace("infecciosa e inmunitaria", "infecciosa");
}

function CategoryMasteryRadar({ activeCategory, items, onActiveCategoryChange, size = "compact" }) {
  const isLarge = size === "large";
  const chartItems = getRadarItems(items, isLarge ? 12 : 8);
  const center = isLarge ? 260 : 132;
  const maxRadius = isLarge ? 168 : 82;
  const labelRadius = isLarge ? 224 : 0;
  const viewBoxSize = isLarge ? 520 : 264;
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
  const activeItem = chartItems.find((item) => item.category === activeCategory) || chartItems.find((item) => item.attempts > 0);
  const activeIndex = activeItem ? chartItems.findIndex((item) => item.category === activeItem.category) : -1;
  const activeAngle = activeIndex >= 0 ? -Math.PI / 2 + (activeIndex * 2 * Math.PI) / pointCount : 0;
  const activePoint =
    activeItem && activeIndex >= 0
      ? getRadarPoint(center, maxRadius * (activeItem.attempts ? activeItem.precision / 100 : 0), activeAngle)
      : null;

  if (!chartItems.length) {
    return <p className="radar-empty">Todavía no hay preguntas clasificadas para construir el mapa.</p>;
  }

  return (
    <div className={`mastery-radar ${size}`}>
      <svg aria-label="Mapa de dominio por categoría" role="img" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
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
          const textAnchor = labelPoint.x < center - 14 ? "end" : labelPoint.x > center + 14 ? "start" : "middle";
          return (
            <g key={`axis-${item.category}`}>
              <line className="radar-axis" x1={center} x2={axisEnd.x} y1={center} y2={axisEnd.y} />
              {isLarge && (
                <text className="radar-label" textAnchor={textAnchor} x={labelPoint.x} y={labelPoint.y + 4}>
                  {getShortCategoryLabel(item.category)}
                </text>
              )}
            </g>
          );
        })}
        {isLarge &&
          [25, 50, 100].map((tick) => (
            <text className="radar-tick" key={tick} textAnchor="middle" x={center} y={center - maxRadius * (tick / 100) + 4}>
              {tick}
            </text>
          ))}
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
        {isLarge && activeItem && activePoint && (
          <g
            className="radar-tooltip"
            transform={`translate(${Math.min(activePoint.x + 12, viewBoxSize - 146)} ${Math.max(activePoint.y - 48, 16)})`}
          >
            <rect height="46" rx="6" width="134" />
            <text x="10" y="17">
              {getShortCategoryLabel(activeItem.category)}
            </text>
            <circle cx="16" cy="32" r="5" />
            <text x="28" y="36">
              {activeItem.attempts ? `Tu nivel: ${activeItem.precision}` : "Sin respuestas"}
            </text>
          </g>
        )}
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
