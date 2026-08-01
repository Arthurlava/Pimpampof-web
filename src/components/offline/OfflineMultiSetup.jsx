import { useEffect, useState } from "react";
import { Button } from "../common/Button";
import { OFFLINE_MULTI_MAX_PLAYERS } from "../../config/constants";
import { clampInt } from "../../utils/gameUtils";
import { styles } from "../../styles/styles";
import { CooldownSetting } from "../settings/GameSettingsOverlay";

export function OfflineMultiSetup({
  open,
  playerCount,
  names,
  cooldownSeconds,
  onPlayerCountChange,
  onNamesChange,
  onCooldownChange,
  onStart,
  onClose,
}) {
  const [countInput, setCountInput] = useState(String(playerCount ?? 2));
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setCountInput(String(playerCount ?? 2));
      setSettingsVisible(false);
    }
  }, [open, playerCount]);

  if (!open) return null;

  const count = clampInt(playerCount, 2, OFFLINE_MULTI_MAX_PLAYERS);

  function applyPlayerCount(value) {
    const parsed = parseInt(value, 10);
    const next = clampInt(parsed, 2, OFFLINE_MULTI_MAX_PLAYERS);

    setCountInput(String(next));
    onPlayerCountChange(next);
    onNamesChange(Array.from({ length: next }, (_, index) => String(names?.[index] ?? "")));

    return next;
  }

  function updateName(index, value) {
    const next = Array.from({ length: count }, (_, ix) => String(names?.[ix] ?? ""));
    next[index] = value;
    onNamesChange(next);
  }

  function startGame() {
    const nextCount = applyPlayerCount(countInput);
    const nextNames = Array.from({ length: nextCount }, (_, index) => String(names?.[index] ?? ""));
    onStart({ playerCount: nextCount, names: nextNames });
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div style={{ textAlign: "left" }}>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>Offline multiplayer</h2>
            <p className="muted" style={{ margin: 0 }}>
              Vul de spelers in en kies eventueel de spelinstellingen.
            </p>
          </div>
          <Button variant="alt" onClick={() => setSettingsVisible((visible) => !visible)}>
            ⚙️ Spelinstellingen
          </Button>
        </div>

        {settingsVisible && (
          <div className="settings-section" style={{ marginTop: 14 }}>
            <CooldownSetting value={cooldownSeconds} onChange={onCooldownChange} />
            <div className="muted" style={{ marginTop: 10, textAlign: "left" }}>
              Deze keuze wordt onthouden voor volgende spellen waarbij dit apparaat de host is.
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
          <span className="badge">Spelers</span>
          <input
            type="number"
            min={2}
            max={OFFLINE_MULTI_MAX_PLAYERS}
            step={1}
            value={countInput}
            onChange={(event) => setCountInput(event.target.value)}
            onBlur={() => applyPlayerCount(countInput)}
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
          <Button onClick={startGame}>Start offline multiplayer</Button>
        </div>
      </div>
    </div>
  );
}
