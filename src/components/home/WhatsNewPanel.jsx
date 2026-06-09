import { useState } from "react";
import { Button } from "../common/Button";
import { Row } from "../common/Row";
import { Section } from "../common/Section";

const DEFAULT_VISIBLE_UPDATE_ITEMS = 6;

export function WhatsNewPanel({ whatsNew, isOpen, onToggle }) {
  const [showAllUpdates, setShowAllUpdates] = useState(false);

  const updates = whatsNew?.updates ?? [];
  const latestUpdate = updates[0];

  const allItems = updates.flatMap((update) =>
    update.items.map((text) => ({
      text,
      updatedAtLabel: update.updatedAtLabel,
    }))
  );

  const visibleItems = showAllUpdates
    ? allItems
    : allItems.slice(0, DEFAULT_VISIBLE_UPDATE_ITEMS);

  const hasMoreItems = allItems.length > DEFAULT_VISIBLE_UPDATE_ITEMS;

  return (
    <Section title={`Recente updates${latestUpdate ? ` (${latestUpdate.updatedAtLabel})` : ""}`}>
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
          <ul style={{ margin: "10px 0 0 18px", textAlign: "left", lineHeight: 1.55 }}>
            {visibleItems.map((item, index) => (
              <li key={`${item.updatedAtLabel}-${index}`} style={{ marginBottom: 6 }}>
                {item.text}
              </li>
            ))}
          </ul>

          {hasMoreItems && (
            <div style={{ marginTop: 12 }}>
              <Button
                variant="alt"
                onClick={() => setShowAllUpdates((show) => !show)}
              >
                {showAllUpdates ? "Minder tonen" : "Meer tonen"}
              </Button>
            </div>
          )}
        </>
      )}
    </Section>
  );
}