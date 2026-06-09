import { Button } from "../common/Button";

export function TutorialOverlay({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card tutorial-card" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <h2 style={{ margin: 0 }}>Hoe speel je PimPamPof?</h2>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              Een korte uitleg van de regels, punten en speciale acties.
            </p>
          </div>

          <Button variant="alt" onClick={onClose}>
            Sluiten
          </Button>
        </div>

        <div className="settings-section">
          <h3 style={{ margin: "0 0 8px 0" }}>Basisregels</h3>
          <ol style={{ margin: "0 0 0 20px", textAlign: "left", lineHeight: 1.6 }}>
            <li>Je krijgt een letter en een vraag te zien.</li>
            <li>Geef een antwoord dat begint met de huidige letter.</li>
            <li>Na je antwoord typ je de laatste letter van je antwoord in.</li>
            <li>Die letter wordt de nieuwe letter voor de volgende speler.</li>
            <li>Daarna krijgt de volgende speler een nieuwe vraag.</li>
          </ol>
        </div>

        <div className="settings-section">
          <h3 style={{ margin: "0 0 8px 0" }}>Voorbeeld</h3>
          <div style={{ textAlign: "left", lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 8px 0" }}>
              Stel de letter is <b>B</b> en de vraag is:
            </p>

            <div className="badge" style={{ marginBottom: 8 }}>
              Noem een dier.
            </div>

            <p style={{ margin: 0 }}>
              Dan kun je bijvoorbeeld <b>beer</b> zeggen. Het antwoord begint met <b>B</b>.
              De laatste letter van <b>beer</b> is <b>R</b>, dus de volgende speler speelt met letter <b>R</b>.
            </p>
          </div>
        </div>

        <div className="settings-section">
          <h3 style={{ margin: "0 0 8px 0" }}>Punten</h3>
          <ul style={{ margin: "0 0 0 18px", textAlign: "left", lineHeight: 1.6 }}>
            <li>Hoe sneller je antwoordt, hoe meer punten je krijgt.</li>
            <li>Je kunt maximaal 200 punten krijgen voor een snel antwoord.</li>
            <li>Hoe langer je wacht, hoe minder punten je antwoord waard wordt.</li>
            <li>Als de tijd bijna op is, krijg je weinig of geen punten.</li>
          </ul>
        </div>

        <div className="settings-section">
          <h3 style={{ margin: "0 0 8px 0" }}>Dubble pof</h3>
          <p style={{ margin: 0, textAlign: "left", lineHeight: 1.6 }}>
            Als de laatste letter van je antwoord hetzelfde is als de beginletter,
            krijg je een bonus. Bijvoorbeeld: letter <b>B</b>, antwoord <b>bob</b>.
            Het antwoord begint met <b>B</b> en eindigt ook op <b>B</b>.
          </p>
        </div>

        <div className="settings-section">
          <h3 style={{ margin: "0 0 8px 0" }}>Jilla</h3>
          <p style={{ margin: 0, textAlign: "left", lineHeight: 1.6 }}>
            Als je geen goed antwoord weet, kun je <b>Jilla</b> gebruiken.
            Je slaat dan de vraag over, maar je krijgt strafpunten.
            In multiplayer word je daarna ook een beurt overgeslagen.
          </p>
        </div>

        <div className="settings-section">
          <h3 style={{ margin: "0 0 8px 0" }}>Onmogelijke combinaties</h3>
          <p style={{ margin: 0, textAlign: "left", lineHeight: 1.6 }}>
            Soms lijkt een vraag met een bepaalde letter bijna onmogelijk.
            Dan kun je de combinatie rapporteren. Als de combinatie wordt goedgekeurd,
            krijgen spelers later een waarschuwing en kunnen ze direct een nieuwe vraag pakken.
          </p>
        </div>
      </div>
    </div>
  );
}