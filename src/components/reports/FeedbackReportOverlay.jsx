import { Button } from "../common/Button";
import { TextArea } from "../common/TextArea";
import { styles } from "../../styles/styles";

export function FeedbackReportOverlay({
  open,
  type,
  title,
  message,
  busy = false,
  onTypeChange,
  onTitleChange,
  onMessageChange,
  onSubmit,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <h2 style={{ margin: 0 }}>Bug melden of feedback geven</h2>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              Beschrijf wat er gebeurde of wat er volgens jou beter kan.
            </p>
          </div>
          <Button variant="alt" onClick={onClose} disabled={busy}>Sluiten</Button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16, textAlign: "left" }}>
          <label>
            <span className="muted">Soort inzending</span>
            <select
              style={{ ...styles.select, width: "100%", marginTop: 6 }}
              value={type}
              onChange={(event) => onTypeChange(event.target.value)}
            >
              <option value="bug">Bugreport</option>
              <option value="feedback">Feedback / idee</option>
            </select>
          </label>

          <label>
            <span className="muted">Korte titel</span>
            <input
              style={{ ...styles.input, width: "100%", boxSizing: "border-box", marginTop: 6 }}
              maxLength={100}
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={type === "bug" ? "Bijvoorbeeld: knop reageert niet" : "Bijvoorbeeld: extra speloptie"}
            />
          </label>

          <label>
            <span className="muted">Beschrijving</span>
            <div style={{ marginTop: 6 }}>
              <TextArea
                value={message}
                onChange={onMessageChange}
                placeholder={type === "bug"
                  ? "Wat deed je, wat verwachtte je en wat gebeurde er?"
                  : "Beschrijf je idee of feedback zo duidelijk mogelijk."}
              />
            </div>
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <Button variant="alt" onClick={onClose} disabled={busy}>Annuleren</Button>
          <Button onClick={onSubmit} disabled={busy}>
            {busy ? "Versturen…" : "Versturen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
