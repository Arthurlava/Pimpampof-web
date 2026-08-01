import { Button } from "../common/Button";

export function CooldownSetting({ value, onChange }) {
  const seconds = Number.isFinite(Number(value)) ? Number(value) : 5;

  return (
    <div className="cooldown-setting">
      <div className="cooldown-setting-header">
        <div>
          <b>Cooldown tussen beurten</b>
          <div className="muted">Tijd om het apparaat door te geven of klaar te gaan zitten.</div>
        </div>
        <span className="badge"><b>{seconds}s</b></span>
      </div>

      <input
        className="cooldown-slider"
        type="range"
        min={0}
        max={20}
        step={1}
        value={seconds}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Cooldown tussen beurten"
      />

      <div className="cooldown-scale muted">
        <span>Geen</span>
        <span>20 seconden</span>
      </div>
    </div>
  );
}

export function GameSettingsOverlay({ open, cooldownSeconds, onCooldownChange, onClose }) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <h2 style={{ margin: 0 }}>Spelinstellingen</h2>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              Deze instellingen worden onthouden en automatisch gebruikt wanneer dit apparaat de host is.
            </p>
          </div>
          <Button variant="alt" onClick={onClose}>Sluiten</Button>
        </div>

        <div className="settings-section" style={{ marginTop: 16 }}>
          <CooldownSetting value={cooldownSeconds} onChange={onCooldownChange} />
        </div>
      </div>
    </div>
  );
}
