import React, { useMemo } from "react";

function groupBadges(badges) {
  const order = [];
  const groups = new Map();

  badges.forEach((badge) => {
    if (!groups.has(badge.group)) {
      groups.set(badge.group, []);
      order.push(badge.group);
    }
    groups.get(badge.group).push(badge);
  });

  return order.map((group) => ({ group, items: groups.get(group) }));
}

function BadgesBoard({ badges, compact = false, title = "Medallas" }) {
  const grouped = useMemo(() => groupBadges(badges), [badges]);
  const earnedCount = badges.filter((badge) => badge.earned).length;

  return (
    <section className="badges-board">
      {!compact && (
        <div className="section-heading">
          <div>
            <p className="eyebrow">{title}</p>
            <h2>Colección de medallas</h2>
            <span className="table-note">
              {earnedCount} de {badges.length} conseguidas
            </span>
          </div>
        </div>
      )}

      {compact && (
        <div className="section-heading">
          <h3>{title}</h3>
          <span className="table-note">
            {earnedCount} de {badges.length}
          </span>
        </div>
      )}

      <div className={`badges-groups ${compact ? "compact" : ""}`}>
        {grouped.map(({ group, items }) => (
          <article className="panel badges-group-panel" key={group}>
            <h3 className="badges-group-title">{group}</h3>
            <div className="badges-grid">
              {items.map((badge) => (
                <div
                  className={`badge-card ${badge.earned ? "earned" : "locked"}`}
                  key={badge.id}
                  title={badge.description}
                >
                  <span className="badge-icon" aria-hidden={!badge.image}>
                    {badge.image ? <img alt="" className="badge-icon-img" src={badge.image} /> : badge.icon}
                  </span>
                  <span className="badge-name">{badge.name}</span>
                  <span className="badge-description">{badge.description}</span>
                  {badge.earned ? (
                    <>
                      <span className="badge-status earned">
                        Conseguida{badge.repeatable && badge.timesEarned > 1 ? ` ×${badge.timesEarned}` : ""}
                      </span>
                      {badge.repeatable && (
                        <div className="badge-progress">
                          <div className="badge-progress-track">
                            <div
                              className="badge-progress-fill"
                              style={{ width: `${Math.round(badge.progress * 100)}%` }}
                            />
                          </div>
                          <span className="badge-progress-label">Próxima: {badge.progressLabel}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="badge-progress">
                      <div className="badge-progress-track">
                        <div
                          className="badge-progress-fill"
                          style={{ width: `${Math.round(badge.progress * 100)}%` }}
                        />
                      </div>
                      <span className="badge-progress-label">{badge.progressLabel}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default BadgesBoard;
