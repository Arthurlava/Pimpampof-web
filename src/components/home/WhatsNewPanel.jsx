import { useState } from "react";
import { Button } from "../common/Button";
import { Row } from "../common/Row";
import { Section } from "../common/Section";

const DEFAULT_VISIBLE_UPDATE_ITEMS = 6;

function getVisibleUpdateGroups(updates, showAll) {
  if (showAll) return updates;

  let remaining = DEFAULT_VISIBLE_UPDATE_ITEMS;
  const result = [];

  for (const update of updates) {
    if (remaining <= 0) break;

    const visibleItems = update.items.slice(0, remaining);

    if (visibleItems.length > 0) {
      result.push({
        ...update,
        items: visibleItems,
      });

      remaining -= visibleItems.length;
    }
  }

  return result;
}

export function WhatsNewPanel({ whatsNew, isOpen, onToggle }) {
  const [showAllUpdates, setShowAllUpdates] = useState(false);

  const updates = whatsNew?.updates ?? [];
  const latestUpdate = updates[0];

  const visibleUpdates = getVisibleUpdateGroups(updates, showAllUpdates);

  const totalItemCount = updates.reduce(
    (total, update) => total + update.items.length,
    0
  );

  const hasMoreItems = totalItemCount > DEFAULT_VISIBLE_UPDATE_ITEMS;

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

          {hasMoreItems && (
            <div style={{ marginTop: 12 }}>
              <Button
                variant="alt"
                onClick={() => setShowAllUpdates((show) => !show)}
              >
                {showAllUpdates ? "Minder zien" : "Meer zien"}
              </Button>
            </div>
          )}
        </>
      )}
    </Section>
  );
} 
