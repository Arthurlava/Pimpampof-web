import { Button } from "../common/Button";
import { styles } from "../../styles/styles";

function MenuCard({ title, text, badge, children, featured }) {
  return (
    <div className={`mode-card${featured ? " mode-card-featured" : ""}`}>
      <div className="mode-card-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">{text}</p>
        </div>
        {badge ? <span className="badge">{badge}</span> : null}
      </div>
      <div className="mode-card-actions">
        {children}
      </div>
    </div>
  );
}

export function MainMenuPanel({
  online,
  roomCodeInput,
  onRoomCodeInputChange,
  onCreateRoom,
  onBrowseRooms,
  onJoinRoom,
  onStartSolo,
  onStartOfflineMulti,
  onOpenDieren,
}) {
  return (
    <section className="menu-panel">
      <div className="menu-panel-header">
        <span className="badge">Spelmodus</span>
        <h2>Kies hoe je wilt spelen</h2>
        <p className="muted">
          Speel alleen, met spelers op één apparaat, of maak een online room.
        </p>
      </div>

      <div className="mode-grid">
        <MenuCard
          title="Solo"
          text="Speel alleen met timer, punten, Jilla en Dubble pof."
          badge="Snel starten"
          featured
        >
          <Button onClick={onStartSolo}>Start solo</Button>
        </MenuCard>

        <MenuCard
          title="Offline multiplayer"
          text="Meerdere spelers op één apparaat met doorgeef-cooldown."
          badge="Lokaal"
        >
          <Button onClick={onStartOfflineMulti}>Start offline multiplayer</Button>
        </MenuCard>

        <MenuCard
          title="Online room"
          text={online ? "Maak een room of join met een roomcode." : "Online rooms werken niet als je offline bent."}
          badge={online ? "Online" : "Offline"}
        >
          {online ? (
            <>
              <div className="mode-action-row">
                <Button variant="alt" onClick={onCreateRoom}>Room aanmaken</Button>
                <Button variant="alt" onClick={onBrowseRooms}>Rooms bekijken</Button>
              </div>
              <div className="room-code-row">
                <input
                  style={{ ...styles.input, flex: 1, minWidth: 0 }}
                  placeholder="Room code"
                  value={roomCodeInput}
                  onChange={(event) => onRoomCodeInputChange(event.target.value.toUpperCase())}
                />
                <Button variant="alt" onClick={onJoinRoom}>Join</Button>
              </div>
            </>
          ) : (
            <span className="muted">Verbind met internet om online te spelen.</span>
          )}
        </MenuCard>

        <MenuCard
          title="Dierenspel"
          text="Open het andere spel in dezelfde stijl."
          badge="Extra"
        >
          <Button onClick={onOpenDieren}>Naar Dierenspel</Button>
        </MenuCard>
      </div>
    </section>
  );
}
