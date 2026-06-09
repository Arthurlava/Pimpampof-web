import { Button } from "../common/Button";
import { Row } from "../common/Row";
import { Section } from "../common/Section";
import { styles } from "../../styles/styles";

function MenuCard({ title, text, children }) {
  return (
    <div className="mode-card">
      <h3 style={{ margin: "0 0 6px 0" }}>{title}</h3>
      <p className="muted" style={{ margin: "0 0 12px 0" }}>{text}</p>
      {children}
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
    <Section title="Kies spelmodus">
      <div className="mode-grid">
        <MenuCard title="Solo" text="Speel alleen met timer, punten, Jilla en Dubble pof.">
          <Button onClick={onStartSolo}>Start solo</Button>
        </MenuCard>

        <MenuCard title="Offline multiplayer" text="Meerdere spelers op één apparaat met doorgeef-cooldown.">
          <Button onClick={onStartOfflineMulti} disabled={!online && false}>Start offline multiplayer</Button>
        </MenuCard>

        <MenuCard title="Online room" text={online ? "Maak een room of join met een roomcode." : "Online rooms werken niet als je offline bent."}>
          {online ? (
            <>
              <Row>
                <Button variant="alt" onClick={onCreateRoom}>Room aanmaken</Button>
                <Button variant="alt" onClick={onBrowseRooms}>Rooms bekijken</Button>
              </Row>
              <Row>
                <input
                  style={styles.input}
                  placeholder="Room code"
                  value={roomCodeInput}
                  onChange={(event) => onRoomCodeInputChange(event.target.value.toUpperCase())}
                />
                <Button variant="alt" onClick={onJoinRoom}>Join</Button>
              </Row>
            </>
          ) : (
            <span className="badge">Offline</span>
          )}
        </MenuCard>

        <MenuCard title="Dierenspel" text="Open het andere spel.">
          <Button onClick={onOpenDieren}>Naar Dierenspel</Button>
        </MenuCard>
      </div>
    </Section>
  );
}
