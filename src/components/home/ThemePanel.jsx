import { Button } from "../common/Button";
import { Row } from "../common/Row";
import { Section } from "../common/Section";
import { styles } from "../../styles/styles";

const THEMES = [
  { id: "green", label: "Groen" },
  { id: "blue", label: "Blauw" },
  { id: "darkred", label: "DarkRed" },
  { id: "purple", label: "Paars" },
];

export function ThemePanel({ theme, onThemeChange }) {
  return (
    <Section title="Thema">
      <Row>
        <span className="muted" style={{ maxWidth: 520, textAlign: "left" }}>
          Kies een kleurthema voor de app.
        </span>
        <select
          value={theme}
          onChange={(event) => onThemeChange(event.target.value)}
          style={styles.select}
        >
          {THEMES.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        <Button variant="alt" onClick={() => onThemeChange("green")}>Reset</Button>
      </Row>
    </Section>
  );
}
