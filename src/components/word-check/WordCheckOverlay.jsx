import { Button } from "../common/Button";
import { Row } from "../common/Row";
import { styles } from "../../styles/styles";
import { WORDCHECK_AI_ENDPOINT } from "../../config/constants";
import { getGoogleMeaningUrl, normalizeWordForCheck } from "../../utils/wordCheck";
import { normalizeLetter } from "../../utils/gameUtils";

export function WordCheckOverlay({
  open,
  word,
  onWordChange,
  busy,
  error,
  result,
  preferAi,
  onPreferAiChange,
  requiredLetter,
  online,
  onRun,
  onClose,
}) {
  if (!open) return null;

  const firstChar = normalizeLetter((normalizeWordForCheck(word) || "")[0] || "");
  const hasRequiredLetter = requiredLetter && requiredLetter !== "?";
  const startsOk = hasRequiredLetter && firstChar && firstChar === requiredLetter;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>Check woord</h2>

        <p className="muted" style={{ marginTop: 0 }}>
          Controleert of een woord bestaat via NL Wiktionary (gratis).
          {WORDCHECK_AI_ENDPOINT ? " Optioneel: AI-check beschikbaar." : " (AI-check vereist een serverless endpoint.)"}
        </p>

        {hasRequiredLetter && (
          <div className="mini-hud" style={{ margin: "10px 0" }}>
            <span className="badge">Huidige letter: <b>{requiredLetter}</b></span>
            {word.trim() && (
              <span className="badge">
                Startletter: <b>{firstChar || "?"}</b> — {startsOk ? "✅ ok" : "❌ niet ok"}
              </span>
            )}
          </div>
        )}

        <input
          style={{ ...styles.input, width: "min(520px, 100%)" }}
          placeholder="Typ een woord…"
          value={word}
          onChange={(event) => onWordChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onRun();
            if (event.key === "Escape") onClose();
          }}
          autoFocus
        />

        <Row>
          <Button onClick={onRun} disabled={busy || !online}>
            {busy ? "Bezig…" : "Check"}
          </Button>

          <Button
            variant="alt"
            onClick={() => window.open(getGoogleMeaningUrl(word), "_blank", "noopener,noreferrer")}
            disabled={!normalizeWordForCheck(word)}
            title="Zoek betekenis op Google"
          >
            Zoek op Google
          </Button>

          {WORDCHECK_AI_ENDPOINT && (
            <label className="badge" style={{ cursor: "pointer", userSelect: "none" }} title="Eerst AI proberen (valt terug op Wiktionary)">
              <input
                type="checkbox"
                checked={preferAi}
                onChange={(event) => onPreferAiChange(event.target.checked)}
                style={{ marginRight: 8 }}
              />
              AI eerst
            </label>
          )}

          <Button variant="stop" onClick={onClose}>Sluiten</Button>
        </Row>

        {error && (
          <div className="badge" style={{ marginTop: 10, background: "rgba(239,68,68,0.18)", borderColor: "rgba(239,68,68,0.35)" }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 12, textAlign: "left" }}>
            <div style={{
              background: result.exists ? "rgba(22,163,74,0.18)" : "rgba(239,68,68,0.18)",
              borderColor: result.exists ? "rgba(22,163,74,0.35)" : "rgba(239,68,68,0.35)",
            }} className="badge">
              {result.exists ? "Bestaat (gevonden)" : "Niet gevonden"}
              <span className="muted" style={{ marginLeft: 10 }}>bron: {result.source}</span>
            </div>

            {result.note && (
              <div className="muted" style={{ marginTop: 8 }}>{result.note}</div>
            )}

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="alt" onClick={() => window.open(result.url, "_blank", "noopener,noreferrer")}>
                Open Wiktionary
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
