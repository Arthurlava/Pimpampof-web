import { Button } from "../common/Button";

const THEMES = [
  { id: "green", label: "Groen" },
  { id: "blue", label: "Blauw" },
  { id: "darkred", label: "DarkRed" },
  { id: "purple", label: "Paars" },
];

export function SettingsOverlay({
  open,
  theme,
  reportCount = 0,
  feedbackCount = 0,
  notificationsSupported = false,
  notificationsEnabled = false,
  notificationPermission = "default",
  onThemeChange,
  onOpenReports,
  onOpenFeedbackForm,
  onOpenFeedbackReports,
  onToggleNotifications,
  onOpenTutorial,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card settings-card" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <h2 style={{ margin: 0 }}>Instellingen</h2>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              Pas de game aan en bekijk extra opties.
            </p>
          </div>

          <Button variant="alt" onClick={onClose}>
            Sluiten
          </Button>
        </div>

        <div className="settings-section">
          <h3 style={{ margin: "0 0 10px 0" }}>Tutorial</h3>
          <p className="muted" style={{ margin: "0 0 10px 0" }}>
            Bekijk kort hoe het spel werkt, inclusief punten, Jilla en Dubble pof.
          </p>

          <Button variant="alt" onClick={onOpenTutorial}>
            Bekijk tutorial
          </Button>
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
          <h3 style={{ margin: "0 0 10px 0" }}>Bug melden en feedback</h3>
          <p className="muted" style={{ margin: "0 0 10px 0" }}>
            Stuur een bugreport of idee in. Inzendingen worden net als combinatierapportages opgeslagen.
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={onOpenFeedbackForm}>Nieuwe inzending</Button>
            <Button variant="alt" onClick={onOpenFeedbackReports}>
              Bekijk inzendingen{feedbackCount > 0 ? ` (${feedbackCount})` : ""}
            </Button>
          </div>
        </div>

        <div className="settings-section">
          <h3 style={{ margin: "0 0 10px 0" }}>Beurtnotificaties</h3>
          <p className="muted" style={{ margin: "0 0 10px 0" }}>
            Toon een klikbare browsernotificatie wanneer je online weer aan de beurt bent en deze pagina niet zichtbaar is.
          </p>

          {!notificationsSupported ? (
            <span className="muted">Deze browser ondersteunt geen notificaties.</span>
          ) : notificationPermission === "denied" ? (
            <span className="muted">Notificaties zijn geblokkeerd. Sta ze toe via de site-instellingen van je browser.</span>
          ) : (
            <Button variant={notificationsEnabled ? "stop" : "alt"} onClick={onToggleNotifications}>
              {notificationsEnabled ? "Notificaties uitschakelen" : "Notificaties inschakelen"}
            </Button>
          )}
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