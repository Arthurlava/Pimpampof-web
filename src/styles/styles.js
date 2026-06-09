export const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 20, textAlign: "center", alignItems: "center" },
  header: { display: "flex", flexDirection: "column", gap: 12, alignItems: "center" },
  h1: { fontSize: 28, fontWeight: 800, margin: 0 },
  row: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "center" },
  section: { width: "100%", padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 22px rgba(0,0,0,0.3)", boxSizing: "border-box" },
  sectionTitle: { margin: "0 0 8px 0", fontSize: 18, fontWeight: 700 },
  btn: { padding: "10px 16px", borderRadius: 12, border: "none", background: "#16a34a", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnAlt: { background: "#065f46" },
  btnStop: { background: "#475569" },
  btnDanger: { padding: "6px 10px", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontSize: 13, cursor: "pointer" },
  input: { padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none" },
  textarea: { width: "100%", minHeight: 120, resize: "vertical", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none", boxSizing: "border-box" },
  list: { listStyle: "none", padding: 0, margin: 0 },
  li: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.1)" },
  liText: { lineHeight: 1.4, textAlign: "left" },
  letterInput: { marginTop: 8, width: 200, textAlign: "center", padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none", fontSize: 16, boxSizing: "border-box" },
  foot: { fontSize: 12, color: "rgba(255,255,255,0.6)" }
};
