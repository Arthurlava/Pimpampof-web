import { Button } from "../common/Button";
import { OFFLINE_MULTI_MAX_PLAYERS } from "../../config/constants";
import { clampInt } from "../../utils/gameUtils";
import { styles } from "../../styles/styles";

export function OfflineMultiSetup({ open, playerCount, names, onPlayerCountChange, onNamesChange, onStart, onClose }) {
  if (!open) return null;

  const count = clampInt(playerCount, 2, OFFLINE_MULTI_MAX_PLAYERS);

  function updatePlayerCount(value) {
    const parsed = parseInt(value, 10);
    const next = clampInt(parsed, 2, OFFLINE_MULTI_MAX_PLAYERS);
    onPlayerCountChange(next);
    onNamesChange(Array.from({ length: next }, (_, index) => String(names?.[index] ?? "")));
  }

  function updateName(index, value) {
    const next = Array.from({ length: count }, (_, ix) => String(names?.[ix] ?? ""));
    next[index] = value;
    onNamesChange(next);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>Offline multiplayer</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Cooldown tussen beurten is het doorgeef-moment.
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          <span className="badge">Spelers</span>
          <input
            type="number"
            min={2}
            max={OFFLINE_MULTI_MAX_PLAYERS}
            step={1}
            value={count}
            onChange={(event) => updatePlayerCount(event.target.value)}
            style={{ ...styles.input, width: 120 }}
          />
          <span className="muted">min 2, max {OFFLINE_MULTI_MAX_PLAYERS}</span>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: count }, (_, index) => (
            <input
              key={index}
              style={styles.input}
              placeholder={`Naam speler ${index + 1}`}
              value={names?.[index] ?? ""}
              onChange={(event) => updateName(index, event.target.value)}
            />
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <Button variant="alt" onClick={onClose}>Annuleren</Button>
          <Button onClick={onStart}>Start offline multiplayer</Button>
        </div>
      </div>
    </div>
  );
}
