import React from "react";

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 220;
const PADDING_LEFT = 34;
const PADDING_RIGHT = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 30;

function ProgressEvolutionChart({ weeks }) {
  if (!weeks.length) {
    return <p className="radar-empty">Todavía no hay respuestas suficientes para mostrar una evolución.</p>;
  }

  const plotWidth = VIEW_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const maxAnswered = Math.max(1, ...weeks.map((week) => week.answered));
  const stepX = weeks.length > 1 ? plotWidth / (weeks.length - 1) : 0;
  const barWidth = Math.min(28, plotWidth / weeks.length - 8);

  function xFor(index) {
    return PADDING_LEFT + (weeks.length > 1 ? index * stepX : plotWidth / 2);
  }

  function yForAccuracy(accuracy) {
    return PADDING_TOP + plotHeight * (1 - accuracy / 100);
  }

  function yForAnswered(answered) {
    return PADDING_TOP + plotHeight * (1 - answered / maxAnswered);
  }

  const accuracyWeeks = weeks.filter((week) => week.accuracy !== null);
  const linePoints = accuracyWeeks
    .map((week) => `${xFor(weeks.indexOf(week))},${yForAccuracy(week.accuracy)}`)
    .join(" ");

  const gridLevels = [0, 25, 50, 75, 100];

  return (
    <div className="evolution-chart">
      <svg aria-label="Evolución semanal de respuestas y precisión" role="img" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
        {gridLevels.map((level) => (
          <g key={level}>
            <line
              className="evolution-grid"
              x1={PADDING_LEFT}
              x2={VIEW_WIDTH - PADDING_RIGHT}
              y1={yForAccuracy(level)}
              y2={yForAccuracy(level)}
            />
            <text className="evolution-tick" textAnchor="end" x={PADDING_LEFT - 8} y={yForAccuracy(level) + 4}>
              {level}%
            </text>
          </g>
        ))}

        {weeks.map((week, index) => (
          <rect
            className="evolution-bar"
            height={Math.max(0, PADDING_TOP + plotHeight - yForAnswered(week.answered))}
            key={`bar-${week.weekStart}`}
            rx="3"
            width={Math.max(4, barWidth)}
            x={xFor(index) - barWidth / 2}
            y={yForAnswered(week.answered)}
          >
            <title>{`Semana del ${week.label}: ${week.answered} respuestas`}</title>
          </rect>
        ))}

        {linePoints && <polyline className="evolution-line" points={linePoints} />}
        {accuracyWeeks.map((week) => (
          <circle
            className="evolution-dot"
            cx={xFor(weeks.indexOf(week))}
            cy={yForAccuracy(week.accuracy)}
            key={`dot-${week.weekStart}`}
            r="4"
          >
            <title>{`Semana del ${week.label}: ${week.accuracy}% de acierto (${week.answered} respuestas)`}</title>
          </circle>
        ))}

        {weeks.map((week, index) => (
          <text className="evolution-label" key={`label-${week.weekStart}`} textAnchor="middle" x={xFor(index)} y={VIEW_HEIGHT - 8}>
            {week.label}
          </text>
        ))}
      </svg>
      <div className="evolution-legend">
        <span>
          <i className="evolution-legend-dot line" /> Precisión semanal
        </span>
        <span>
          <i className="evolution-legend-dot bar" /> Respuestas por semana
        </span>
      </div>
    </div>
  );
}

export default ProgressEvolutionChart;
