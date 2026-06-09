import { Button } from "../common/Button";

const THEMES = [
  { id: "green", label: "Groen" },
  { id: "blue", label: "Blauw" },
  { id: "orange", label: "Oranje" },
  { id: "purple", label: "Paars" },
];

export function SettingsOverlay({ open, theme, reportCount = 0, onThemeChange, onOpenReports, onClose }) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card settings-card" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <h2 style={{ margin: 0 }}>Instellingen</h2>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              Pas de uitstraling van de game aan.
            </p>
          </div>
          <Button variant="alt" onClick={onClose}>Sluiten</Button>
        </div>

        <div className="settings-section">
          <h3 style={{ margin: "0 0 10px 0" }}>Rapportages</h3>
          <p className="muted" style={{ margin: "0 0 10px 0" }}>
            Bekijk vraag + letter combinaties die spelers als onmogelijk hebben gemeld.
          </p>
          <Button variant="alt" onClick={onOpenReports}>
            Bekijk rapportages{reportCount > 0 ? ` (${reportCount})` : ""}
          </Button>
        </div>

        <div className="settings-section">
          <h3 style={{ margin: "0 0 10px 0" }}>Thema</h3>
          <div className="theme-options">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`theme-option theme-option-${item.id}${theme === item.id ? " theme-option-active" : ""}`}
                onClick={() => onThemeChange(item.id)}
              >
                <span className="theme-preview" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
