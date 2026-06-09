export function ScoreToast({ toast }) {
  if (!toast.show) return null;

  return (
    <div className="score-toast">
      <div className={`score-bubble ${toast.type === "minus" ? "score-minus" : "score-plus"}`}>
        {toast.text}
      </div>
    </div>
  );
}
