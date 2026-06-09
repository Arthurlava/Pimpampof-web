import { Button } from "../common/Button";
import { ordinal } from "../../utils/gameUtils";

function formatTimestamp(timestamp) {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "—";
  }
}

export function ProfileOverlay({ open, profile, onClose }) {
  if (!open) return null;

  const matches = profile?.matches ? Object.values(profile.matches) : [];
  matches.sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));

  const highscore = profile?.localHighscore || null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>📜 Profiel</h2>

        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: "8px 0" }}>🏅 Highscore</h3>
          {highscore ? (
            <div className="badge" style={{ display: "inline-flex", gap: 10 }}>
              <span><b>Adjusted:</b> {Number(highscore.bestAdjusted || 0).toFixed(2)}</span>
              <span><b>Raw:</b> {highscore.bestRaw}</span>
              {highscore.bestGame && (
                <>
                  <span><b>Datum:</b> {formatTimestamp(highscore.bestGame.endedAt)}</span>
                  {highscore.bestGame.placement && (
                    <span>
                      <b>Resultaat:</b> {highscore.bestGame.placement === 1 ? "Gewonnen" : `${highscore.bestGame.placement}e`}
                    </span>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="muted">Nog geen highscore opgeslagen.</div>
          )}
        </div>

        <h3 style={{ margin: "8px 0" }}>📅 Match history</h3>
        {matches.length === 0 ? (
          <div className="muted">Nog geen gespeelde potjes opgeslagen.</div>
        ) : (
          <div style={{ maxHeight: "60vh", overflow: "auto", borderRadius: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Resultaat</th>
                  <th>Punten</th>
                  <th>Gem. tijd / vraag</th>
                  <th>Jilla</th>
                  <th>Dubble pof</th>
                  <th>Deelnemers</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => {
                  const you = match.you || { score: 0, answered: 0, avgMs: null, jilla: 0, dpf: 0 };
                  const result = match.placement === 1
                    ? "Gewonnen"
                    : (match.placement ? ordinal(match.placement) : "—");
                  const avgSecs = you.avgMs == null ? "—" : `${(you.avgMs / 1000).toFixed(1)}s`;
                  const names = Array.isArray(match.players) ? match.players.map((player) => player.name).join(", ") : "—";

                  return (
                    <tr key={`${match.roomCode || "room"}-${match.endedAt || names}`}>
                      <td>{formatTimestamp(match.endedAt)}</td>
                      <td>{result}</td>
                      <td>{you.score}{you.answered ? ` / ${you.answered}` : ""}</td>
                      <td>{avgSecs}</td>
                      <td>{you.jilla ?? 0}</td>
                      <td>{you.dpf ?? 0}</td>
                      <td>{names}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <Button variant="alt" onClick={onClose}>Sluiten</Button>
        </div>
      </div>
    </div>
  );
}
