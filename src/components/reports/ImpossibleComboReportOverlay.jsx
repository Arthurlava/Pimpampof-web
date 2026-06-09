import { Button } from "../common/Button";

export function ImpossibleComboReportOverlay({ open, report, alreadyApproved, busy = false, onConfirm, onClose }) {
  if (!open || !report) return null;

  function confirmReport(event) {
    event.stopPropagation();
    onConfirm();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>Combinatie rapporteren</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Rapporteer deze combinatie als de vraag bijna onmogelijk is met deze startletter.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", marginTop: 12 }}>
          <div className="badge" style={{ justifyContent: "flex-start" }}>
            Letter: <b>{report.letter}</b>
          </div>
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
            {report.question}
          </div>
        </div>

        {alreadyApproved && (
          <div className="badge" style={{ marginTop: 12, background: "rgba(251,146,60,0.18)", borderColor: "rgba(251,146,60,0.35)" }}>
            Deze combinatie is al goedgekeurd als onmogelijk.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <Button variant="alt" onClick={onClose} disabled={busy}>Annuleren</Button>
          <Button onClick={confirmReport} disabled={alreadyApproved || busy}>
            {busy ? "Opslaan…" : "Ja, rapporteren"}
          </Button>
        </div>
      </div>
    </div>
  );
}
