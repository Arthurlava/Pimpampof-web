import { Button } from "../common/Button";

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

function getBackupLabel(action) {
  if (action === "approve") return "Goedkeuring";
  if (action === "reject") return "Afwijzing";
  if (action === "remove-active") return "Verwijdering";
  return action || "Actie";
}

export function ImpossibleReportsReviewOverlay({
  open,
  reports,
  activeCombos = [],
  backups = [],
  onApprove,
  onReject,
  onRemoveActive,
  onRollback,
  onClose,
}) {
  if (!open) return null;

  const visibleBackups = backups.slice(0, 20);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0 }}>Rapportages</h2>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              Goedgekeurde combinaties worden voor iedereen zichtbaar gemarkeerd. Beheeracties krijgen automatisch een backup.
            </p>
          </div>
          <Button variant="alt" onClick={onClose}>Sluiten</Button>
        </div>

        <section style={{ marginTop: 18 }}>
          <h3 style={{ margin: "0 0 8px 0", textAlign: "left" }}>Open rapportages</h3>

          {reports.length === 0 ? (
            <p className="muted" style={{ marginTop: 8, textAlign: "left" }}>Geen open rapportages.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reports.map((report) => (
                <div
                  key={report.key}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span className="badge">Letter: <b>{report.letter}</b></span>
                    <span className="badge">Meldingen: <b>{report.count || 1}</b></span>
                  </div>

                  <div style={{ marginTop: 10, lineHeight: 1.45 }}>{report.question}</div>

                  {report.reportedByName && (
                    <div className="muted" style={{ marginTop: 8 }}>
                      Laatst gemeld door: {report.reportedByName}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                    <Button variant="stop" onClick={() => onReject(report)}>Afwijzen</Button>
                    <Button onClick={() => onApprove(report)}>Goedkeuren</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginTop: 22 }}>
          <h3 style={{ margin: "0 0 8px 0", textAlign: "left" }}>Actieve onmogelijke combinaties</h3>

          {activeCombos.length === 0 ? (
            <p className="muted" style={{ marginTop: 8, textAlign: "left" }}>Er zijn nog geen actieve combinaties.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeCombos.map((combo) => (
                <div
                  key={combo.key}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(251,146,60,0.28)",
                    background: "rgba(251,146,60,0.08)",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span className="badge">Letter: <b>{combo.letter}</b></span>
                    <span className="muted">Goedgekeurd: {formatDate(combo.approvedAt)}</span>
                  </div>
                  <div style={{ marginTop: 10, lineHeight: 1.45 }}>{combo.question}</div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                    <Button variant="stop" onClick={() => onRemoveActive(combo)}>Verwijderen</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginTop: 22 }}>
          <h3 style={{ margin: "0 0 8px 0", textAlign: "left" }}>Backups / terugdraaien</h3>
          <p className="muted" style={{ margin: "0 0 10px 0", textAlign: "left" }}>
            Laatste 20 beheeracties. Gebruik terugdraaien als er per ongeluk iets is goedgekeurd of verwijderd.
          </p>

          {visibleBackups.length === 0 ? (
            <p className="muted" style={{ marginTop: 8, textAlign: "left" }}>Nog geen backups.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visibleBackups.map((backup) => (
                <div
                  key={backup.key}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: backup.rolledBackAt ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <b>{getBackupLabel(backup.action)}</b>
                      <div className="muted">{formatDate(backup.createdAt)} door {backup.createdBy || "Admin"}</div>
                    </div>

                    {backup.rolledBackAt ? (
                      <span className="badge">Teruggedraaid</span>
                    ) : (
                      <Button variant="alt" onClick={() => onRollback(backup)}>Terugdraaien</Button>
                    )}
                  </div>

                  <div className="muted" style={{ marginTop: 6 }}>
                    Letter: {backup.reportBefore?.letter || backup.comboBefore?.letter || "?"}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    {backup.reportBefore?.question || backup.comboBefore?.question || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
