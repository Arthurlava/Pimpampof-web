import { Button } from "../common/Button";
import { ordinal } from "../../utils/gameUtils";

export function LeaderboardOverlay({ open, data, onClose }) {
  if (!open || !data) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>🏆 Leaderboard</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Speler</th>
              <th>Punten</th>
              <th>Gem. tijd / vraag</th>
              <th>Jilla</th>
              <th>Dubble pof</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row.id}>
                <td>{ordinal(index + 1)}</td>
                <td>{row.name}</td>
                <td>{row.score}</td>
                <td>{row.avgMs == null ? "—" : `${(row.avgMs / 1000).toFixed(1)}s`}</td>
                <td>{row.jilla}</td>
                <td>{row.dpf}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <Button variant="alt" onClick={onClose}>Sluiten</Button>
        </div>
      </div>
    </div>
  );
}
