import { Button } from "../common/Button";
import { Row } from "../common/Row";
import { ordinal } from "../../utils/gameUtils";

function formatAvg(totalTimeMs, answeredCount) {
  if (!answeredCount) return "—";
  return `${(totalTimeMs / answeredCount / 1000).toFixed(1)}s`;
}

export function OfflineResultOverlay({ result, onClose }) {
  if (!result) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>🏁 Offline eindstand</h2>

        {result.type === "solo" ? (
          <>
            <Row>
              <span className="badge">🏅 Punten: <b>{result.score}</b></span>
              <span className="badge">✅ Antwoorden: <b>{result.answered}</b></span>
              <span className="badge">⏱️ Gemiddeld: <b>{formatAvg(result.totalTimeMs, result.answered)}</b></span>
              <span className="badge">🔒 Jilla: <b>{result.jilla}</b></span>
              <span className="badge">✨ Dubble pof: <b>{result.doublePof}</b></span>
            </Row>
          </>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Rang</th>
                <th>Speler</th>
                <th>Punten</th>
                <th>Antwoorden</th>
                <th>Gem. tijd</th>
                <th>Jilla</th>
                <th>Dubble pof</th>
              </tr>
            </thead>
            <tbody>
              {result.players.map((player, index) => (
                <tr key={player.id}>
                  <td>{ordinal(index + 1)}</td>
                  <td>{player.name}</td>
                  <td>{player.score}</td>
                  <td>{player.answered}</td>
                  <td>{formatAvg(player.totalTimeMs, player.answered)}</td>
                  <td>{player.jilla}</td>
                  <td>{player.doublePof}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <Button variant="alt" onClick={onClose}>Sluiten</Button>
        </div>
      </div>
    </div>
  );
}
