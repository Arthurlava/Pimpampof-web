import { styles } from "../../styles/styles";

export function Row({ children, className, style }) {
  return <div className={className} style={{ ...styles.row, ...(style || {}) }}>{children}</div>;
}
