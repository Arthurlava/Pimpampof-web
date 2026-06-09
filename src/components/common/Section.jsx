import { styles } from "../../styles/styles";

export function Section({ title, children }) {
  return (
    <div style={styles.section}>
      {title && <h2 style={styles.sectionTitle}>{title}</h2>}
      {children}
    </div>
  );
}
