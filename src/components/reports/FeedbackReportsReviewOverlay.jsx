import { Button } from "../common/Button";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

function typeLabel(type) {
  return type === "bug" ? "Bugreport" : "Feedback";
}

export function FeedbackReportsReviewOverlay({ open, reports, onResolve, onDelete, onClose }) {
  if (!open) return null;

  const openReports = reports.filter((report) => report.status !== "resolved");
  const resolvedReports = reports.filter((report) => report.status === "resolved").slice(0, 20);

  function renderReport(report, resolved = false) {
    return (
      <div key={report.key} className="feedback-review-item">
        <div className="feedback-review-heading">
          <div>
            <span className="badge">{typeLabel(report.type)}</span>
            {resolved ? <span className="badge" style={{ marginLeft: 6 }}>Afgehandeld</span> : null}
          </div>
          <span className="muted">{formatDate(report.createdAt)}</span>
        </div>

        <h4 style={{ margin: "10px 0 6px 0" }}>{report.title || "Zonder titel"}</h4>
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{report.message}</div>
        <div className="muted" style={{ marginTop: 8 }}>
          Ingestuurd door {report.reportedByName || "Anoniem"}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          {!resolved ? <Button onClick={() => onResolve(report)}>Markeer afgehandeld</Button> : null}
          <Button variant="stop" onClick={() => onDelete(report)}>Verwijderen</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <h2 style={{ margin: 0 }}>Bugreports en feedback</h2>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              Nieuwe inzendingen en recent afgehandelde meldingen.
            </p>
          </div>
          <Button variant="alt" onClick={onClose}>Sluiten</Button>
        </div>

        <section style={{ marginTop: 18, textAlign: "left" }}>
          <h3 style={{ marginBottom: 10 }}>Open ({openReports.length})</h3>
          {openReports.length === 0
            ? <p className="muted">Geen open inzendingen.</p>
            : <div className="feedback-review-list">{openReports.map((report) => renderReport(report))}</div>}
        </section>

        <section style={{ marginTop: 22, textAlign: "left" }}>
          <h3 style={{ marginBottom: 10 }}>Recent afgehandeld</h3>
          {resolvedReports.length === 0
            ? <p className="muted">Nog niets afgehandeld.</p>
            : <div className="feedback-review-list">{resolvedReports.map((report) => renderReport(report, true))}</div>}
        </section>
      </div>
    </div>
  );
}
