export function BottomScoreBar({ room }) {
  if (!room?.started || room?.solo || !room?.players) return null;

  const playerIds = (Array.isArray(room.playersOrder) ? room.playersOrder : Object.keys(room.players))
    .filter((id) => room.players && room.players[id]);

  if (!playerIds.length) return null;

  return (
    <div className="scorebar">
      {playerIds.map((id) => {
        const name = room.participants?.[id]?.name || room.players?.[id]?.name || "Speler";
        const score = room.scores?.[id] ?? 0;
        const jail = room.jail?.[id] ?? 0;
        const active = room.turn === id;

        return (
          <div
            key={id}
            className={`scorechip${active ? " scorechip-active" : ""}`}
            title={jail > 0 ? `Jilla: ${jail}x` : ""}
          >
            <b>{name}</b>
            <span>{score}</span>
            {jail > 0 ? <span>🔒x{jail}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
