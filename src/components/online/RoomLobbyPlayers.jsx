import { Section } from "../common/Section";
import { hasPresence } from "../../utils/gameUtils";

export function RoomLobbyPlayers({ room, roomCode }) {
  if (!room || room.started) return null;

  const ids = (Array.isArray(room.playersOrder) ? room.playersOrder : Object.keys(room.players || {}))
    .filter((id) => room.players?.[id]);

  return (
    <Section title={`Spelers in room ${roomCode}`}>
      <div className="lobby-player-summary">
        <span className="badge">👥 {ids.length} {ids.length === 1 ? "speler" : "spelers"}</span>
        <span className="muted">De lijst wordt automatisch bijgewerkt wanneer iemand joint of weggaat.</span>
      </div>

      <div className="lobby-player-list">
        {ids.map((id) => {
          const name = room.participants?.[id]?.name || room.players?.[id]?.name || "Speler";
          const online = hasPresence(room, id);
          return (
            <div key={id} className="lobby-player-chip">
              <span>{online ? "🟢" : "⚫"}</span>
              <b>{name}</b>
              {room.hostId === id ? <span className="badge">Host</span> : null}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
