import { Button } from "../common/Button";
import { Row } from "../common/Row";
import { Section } from "../common/Section";

export function WhatsNewPanel({ whatsNew, isOpen, onToggle }) {
  return (
    <Section title={`Wat is nieuw (${whatsNew.updatedAtLabel})`}>
      <Row>
        <span className="muted" style={{ maxWidth: 520, textAlign: "left" }}>
          Updates en veranderingen in de game.
        </span>
        <Button variant="alt" onClick={onToggle}>
          {isOpen ? "Verberg" : "Toon"}
        </Button>
      </Row>

      {isOpen && (
        <ul style={{ margin: "10px 0 0 18px", textAlign: "left", lineHeight: 1.55 }}>
          {whatsNew.items.map((text, index) => (
            <li key={index} style={{ marginBottom: 6 }}>{text}</li>
          ))}
        </ul>
      )}
    </Section>
  );
}
