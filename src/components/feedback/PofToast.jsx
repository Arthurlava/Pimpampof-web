export function PofToast({ show, text }) {
  if (!show) return null;

  return (
    <div className="pof-toast">
      <div className="pof-bubble">{text}</div>
    </div>
  );
}
