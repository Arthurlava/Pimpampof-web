import { Button } from "../common/Button";

export function ImpossibleReportsReviewOverlay({ open, reports, onApprove, onReject, onClose }) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0 }}>Rapportages</h2>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              Goedgekeurde combinaties worden voor iedereen zichtbaar gemarkeerd.
            </p>
          </div>
          <Button variant="alt" onClick={onClose}>Sluiten</Button>
        </div>

        {reports.length === 0 ? (
          <p className="muted" style={{ marginTop: 16 }}>Geen open rapportages.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
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
      </div>
    </div>
  );
}
