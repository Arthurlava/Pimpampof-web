import { styles } from "../../styles/styles";

export function TextArea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={styles.textarea}
    />
  );
}
