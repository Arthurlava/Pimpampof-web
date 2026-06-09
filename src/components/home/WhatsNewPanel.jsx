import { useState } from "react";
import { Button } from "../common/Button";
import { Row } from "../common/Row";
import { Section } from "../common/Section";

export function WhatsNewPanel({ whatsNew, isOpen, onToggle }) {
  const [showOlderUpdates, setShowOlderUpdates] = useState(false);

  const updates = whatsNew?.updates ?? [];
  const latestCount = whatsNew?.latestCount ?? 1;

  const visibleUpdates = showOlderUpdates
    ? updates
    : updates.slice(0, latestCount);

  const latestUpdate = updates[0];
  const hasOlderUpdates = updates.length > latestCount;

  return (
    <Section title={`Recente Updates! ${latestUpdate ? ` (${latestUpdate.updatedAtLabel})` : ""}`}>
      <Row>
        <span className="muted" style={{ maxWidth: 520, textAlign: "left" }}>
          Updates en veranderingen in de game.
        </span>

        <Button variant="alt" onClick={onToggle}>
          {isOpen ? "Verberg" : "Toon"}
        </Button>
      </Row>

      {isOpen && (
        <>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
            {visibleUpdates.map((update) => (
              <div key={update.updatedAtLabel}>
                <h3 style={{ margin: "0 0 6px 0", fontSize: 15 }}>
                  {update.updatedAtLabel}
                </h3>

                <ul style={{ margin: "0 0 0 18px", textAlign: "left", lineHeight: 1.55 }}>
                  {update.items.map((text, index) => (
                    <li key={`${update.updatedAtLabel}-${index}`} style={{ marginBottom: 6 }}>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {hasOlderUpdates && (
            <div style={{ marginTop: 12 }}>
              <Button
                variant="alt"
                onClick={() => setShowOlderUpdates((show) => !show)}
              >
                {showOlderUpdates ? "Minder zien" : "Meer zien"}
              </Button>
            </div>
          )}
        </>
      )}
    </Section>
  );
}