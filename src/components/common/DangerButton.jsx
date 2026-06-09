import { styles } from "../../styles/styles";

export function DangerButton({ children, onClick }) {
  return <button onClick={onClick} style={styles.btnDanger}>{children}</button>;
}
