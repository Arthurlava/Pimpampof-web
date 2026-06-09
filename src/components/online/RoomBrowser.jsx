import { Button } from "../common/Button";

export function RoomBrowser({ open, onClose, onRefresh, loading, rooms, onJoinRoom }) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card" onClick={(event) => event.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>🔎 Beschikbare rooms</h2>
        <p className="muted" style={{ marginTop: 0 }}>Klik op een room om direct mee te doen.</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Button onClick={onRefresh} disabled={loading}>🔄 Vernieuwen</Button>
          <Button variant="alt" onClick={onClose}>Sluiten</Button>
        </div>

        {loading ? (
          <div className="muted">Bezig met laden…</div>
        ) : rooms.length === 0 ? (
          <div className="muted">Geen actieve rooms gevonden.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Status</th>
                <th>Spelers</th>
                <th>Online</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.code}>
                  <td>
                    <b>{room.code}</b>
                    <div className="muted">Host: {room.hostName}</div>
                  </td>
                  <td>{room.started ? "Bezig" : "In lobby"}</td>
                  <td>{room.playerCount}</td>
                  <td>{room.onlineNames?.length ? room.onlineNames.join(", ") : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <Button onClick={() => onJoinRoom(room.code)}>Join</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
