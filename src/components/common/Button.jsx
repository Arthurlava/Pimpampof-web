import { styles } from "../../styles/styles";

export function Button({ children, onClick, variant, disabled, title }) {
  let buttonStyle = { ...styles.btn };

  if (variant === "alt") buttonStyle = { ...buttonStyle, ...styles.btnAlt };
  if (variant === "stop") buttonStyle = { ...buttonStyle, ...styles.btnStop };

  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        ...buttonStyle,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
