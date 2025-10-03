// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import {
    getDatabase, ref, onValue, set, update, get, runTransaction, serverTimestamp,
    onDisconnect, remove
} from "firebase/database";

const STORAGE_KEY = "ppp.vragen";

/* --- GLOBALE CSS --- */
const GlobalStyle = () => (
    <style>{`
    html, body, #root { height: 100%; }
    body {
      margin: 0;
      background: linear-gradient(180deg, #171717 0%, #262626 100%);
      color: #fff;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    }
    #root {
      width: min(100%, 720px) !important;
      margin-left: auto !important;
      margin-right: auto !important;
      padding: 24px 16px;
      box-sizing: border-box;
      display: block !important;
      float: none !important;
    }
    input, button, textarea { font-family: inherit; }
    .badge {
      display:inline-flex; align-items:center; gap:8px;
      padding:6px 10px; border-radius:999px;
      background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15);
      font-size: 12px;
    }
    .muted { color: rgba(255,255,255,0.7); font-size:12px; }
  `}</style>
);

/* ---------- standaard vragen ---------- */
const DEFAULT_VRAGEN = [
    "Noem iets dat je in de koelkast vindt.", "Zeg iets dat leeft in de zee.", "Noem een dier met vier poten.",
    "Zeg iets dat je in een supermarkt kunt kopen.", "Zeg iets wat je in een rugzak stopt.", "Noem een sport.",
    "Noem iets wat je op je hoofd kunt dragen.", "Zeg iets dat je buiten kunt vinden.", "Noem een fruit.",
    "Noem iets wat je in een slaapkamer ziet.", "Zeg een vervoermiddel.", "Noem iets wat kinderen leuk vinden.",
    "Zeg iets wat je in de badkamer gebruikt.", "Zeg iets dat koud kan zijn.", "Noem een muziekinstrument.",
    "Zeg iets dat je op school vindt.", "Noem een snoepje of snack.", "Zeg iets wat je met water associeert.",
    "Noem iets dat kan vliegen.", "Zeg iets dat je op een verjaardag ziet.", "Noem iets dat je op een pizza kunt doen.",
    "Zeg een lichaamsdeel.", "Noem iets wat je in de tuin vindt.", "Zeg iets wat je met je handen doet.",
    "Noem een dier.", "Zeg iets dat je kunt eten.", "Noem een land buiten Europa.", "Zeg iets dat je kunt horen.",
    "Noem iets wat je in een klaslokaal vindt.", "Noem een spel.", "Noem een dier dat kleiner is dan een kat.",
    "Noem iets dat rond is.", "Noem een keukengerei.", "Zeg iets dat je op een broodje doet.",
    "Noem een voertuig op wielen.", "Noem een ijsjessmaak.", "Noem iets met vleugels.", "Noem een soort snoep.",
    "Zeg iets dat zacht is.", "Noem een groente.", "Noem iets wat plakt.", "Zeg iets wat je op vakantie meeneemt.",
    "Zeg iets dat je vaak in films ziet.", "Noem iets wat je in een ziekenhuis tegenkomt.", "Zeg iets dat licht geeft.",
    "Noem iets wat lawaai maakt.", "Zeg iets wat met technologie te maken heeft.", "Noem een land in Europa.",
    "Zeg iets wat met ruimte of sterren te maken heeft.", "Zeg iets wat je kunt openen én sluiten.",
    "Noem een woord dat je doet denken aan vakantie.", "Zeg iets wat je in een bos vindt.",
    "Noem iets wat je op een camping ziet.", "Noem een machine.", "Noem iets wat stroom gebruikt.",
    "Zeg iets wat met reizen te maken heeft.", "Noem een gevaarlijk object.", "Zeg iets dat je zelf kunt maken.",
    "Noem een uitvinding van de laatste 100 jaar.", "Zeg iets wat je op een markt ziet.", "Noem iets wat veel mensen verzamelen.",
    "Zeg iets wat je niet in huis wilt hebben.", "Noem iets met meerdere onderdelen.",
    "Zeg iets dat zowel in het echt als in games voorkomt.", "Noem een object dat je met beide handen moet gebruiken.",
    "Zeg iets dat sneller is dan een mens.", "Zeg iets dat vroeger bestond maar nu zeldzaam is.",
    "Noem iets wat echt klinkt maar niet bestaat.", "Noem een insect.", "Zeg iets dat je met een mes kunt snijden.",
    "Zeg iets wat je op een rommelmarkt kunt kopen.", "Noem iets wat je in een theater ziet.",
    "Noem iets dat je in een dierentuin vindt.", "Zeg iets dat je in een park kunt doen.", "Noem iets dat lekker ruikt.",
    "Noem iets wat je in een handtas stopt.", "Noem iets dat met een bal te maken heeft.", "Noem iets wat in een rugzak past.",
    "Noem iets dat snel beweegt.", "Noem iets wat je in een kast bewaart.", "Zeg iets dat gemaakt is van plastic.",
    "Zeg iets wat je in een bibliotheek vindt.", "Noem iets wat je op een festival ziet.", "Zeg iets dat uit een blikje komt.",
    "Zeg iets wat je onder een bed vindt.", "Noem iets dat kan springen.", "Zeg iets dat snel en gevaarlijk is.",
    "Noem iets wat in de natuur groeit.", "Zeg iets dat je drinkt.", "Noem iets dat je in je zak stopt.",
    "Noem iets dat zwaar is.", "Zeg iets dat in een doos past.", "Zeg iets wat je alleen buiten ziet.",
    "Noem iets dat je met muziek associeert.", "Noem iets wat in een winkelcentrum is.",
    "Noem iets wat je bij een concert vind.", "Zeg iets wat je niet aan een kind geeft.",
    "Noem iets dat je op een bord legt.", "Noem iets wat je op een feest kan vinden.", "Noem iets dat je op een kaart vindt."
];

/* ---------- styles ---------- */
const styles = {
    wrap: { display: "flex", flexDirection: "column", gap: 20, textAlign: "center", alignItems: "center" },
    header: { display: "flex", flexDirection: "column", gap: 12, alignItems: "center" },
    h1: { fontSize: 28, fontWeight: 800, margin: 0 },
    row: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "center" },
    section: {
        width: "100%", padding: 16, borderRadius: 16,
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 22px rgba(0,0,0,0.3)", boxSizing: "border-box",
    },
    sectionTitle: { margin: "0 0 8px 0", fontSize: 18, fontWeight: 700 },
    btn: { padding: "10px 16px", borderRadius: 12, border: "none", background: "#16a34a", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" },
    btnAlt: { background: "#065f46" }, btnStop: { background: "#475569" },
    btnDanger: { padding: "6px 10px", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontSize: 13, cursor: "pointer" },
    input: { padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none" },
    textarea: { width: "100%", minHeight: 120, resize: "vertical", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none", boxSizing: "border-box" },
    list: { listStyle: "none", padding: 0, margin: 0 },
    li: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.1)" },
    liText: { lineHeight: 1.4, textAlign: "left" },
    letterInput: { marginTop: 8, width: 200, textAlign: "center", padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", outline: "none", fontSize: 16, boxSizing: "border-box" },
    foot: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
};

/* ---------- localStorage helpers ---------- */
function seedDefaults() { return DEFAULT_VRAGEN.map((tekst) => ({ id: crypto.randomUUID(), tekst })); }
function loadVragen() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) { const seeded = seedDefaults(); localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded)); return seeded; }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) { const seeded = seedDefaults(); localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded)); return seeded; }
        return parsed.map((v) => ({ id: v.id ?? crypto.randomUUID(), tekst: String(v.tekst ?? "") }));
    } catch { const seeded = seedDefaults(); localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded)); return seeded; }
}
function saveVragen(vragen) { localStorage.setItem(STORAGE_KEY, JSON.stringify(vragen)); }
function splitInput(invoer) { return invoer.split(/[\n,]/g).map((s) => s.trim()).filter((s) => s.length > 0); }
function shuffle(array) { const a = array.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- persistente speler-id + (optioneel) naam ---------- */
const PID_KEY = "ppp.playerId";
function getOrCreatePlayerId() {
    try {
        const existing = localStorage.getItem(PID_KEY);
        if (existing) return existing;
        const id = crypto.randomUUID();
        localStorage.setItem(PID_KEY, id);
        return id;
    } catch {
        return crypto.randomUUID();
    }
}
const NAME_KEY = "ppp.playerName";

/* ---------- kleine UI helpers ---------- */
function Section({ title, children }) { return (<div style={styles.section}>{title && <h2 style={styles.sectionTitle}>{title}</h2>}{children}</div>); }
function Row({ children }) { return <div style={styles.row}>{children}</div>; }
function Button({ children, onClick, variant }) { let s = { ...styles.btn }; if (variant === "alt") s = { ...s, ...styles.btnAlt }; if (variant === "stop") s = { ...s, ...styles.btnStop }; return <button onClick={onClick} style={s}>{children}</button>; }
function DangerButton({ children, onClick }) { return <button onClick={onClick} style={styles.btnDanger}>{children}</button>; }
function TextArea({ value, onChange, placeholder }) { return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={styles.textarea} />; }

/* ---------- FIREBASE INIT ---------- */
const firebaseConfig = {
    apiKey: "AIzaSyDuYvtJbjj0wQbSwIBtyHuPeF71poPIBUg",
    authDomain: "pimpampof-aec32.firebaseapp.com",
    databaseURL: "https://pimpampof-aec32-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pimpampof-aec32",
    storageBucket: "pimpampof-aec32.firebasestorage.app",
    messagingSenderId: "872484746189",
    appId: "1:872484746189:web:a76c7345c4f2ebb6790a84"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

/* ---------- utils: room code ---------- */
const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function makeRoomCode(len = 5) { let s = ""; for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }

/* ---------- self-heal helper (presence moet bestaan én leeg zijn) ---------- */
function computeHealInfo(data) {
    const players = data.players ? Object.keys(data.players) : [];
    const presence = (data.presence && typeof data.presence === "object") ? data.presence : {};
    const offline = players.filter(pid => {
        const conns = presence[pid];
        return conns && typeof conns === "object" && Object.keys(conns).length === 0;
    });

    const order = Array.isArray(data.playersOrder) ? data.playersOrder : players;
    const orderFiltered = order.filter(id => players.includes(id));
    const hostOk = data.hostId && players.includes(data.hostId);
    const turnOk = data.turn && players.includes(data.turn);

    const mustHeal =
        offline.length > 0 ||
        orderFiltered.length !== order.length ||
        !hostOk || !turnOk ||
        players.length === 0;

    return { players, offline, orderFiltered, mustHeal };
}

export default function PimPamPofWeb() {
    const [vragen, setVragen] = useState(() => loadVragen());
    const [invoer, setInvoer] = useState("");

    const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || "");
    useEffect(() => { localStorage.setItem(NAME_KEY, playerName || ""); }, [playerName]);

    const [playerId] = useState(() => getOrCreatePlayerId());

    const [roomCodeInput, setRoomCodeInput] = useState("");
    const [roomCode, setRoomCode] = useState("");
    const [room, setRoom] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const roomRef = useRef(null);

    const letterRef = useRef(null);
    const connIdRef = useRef(null); // presence-connection id

    useEffect(() => { saveVragen(vragen); }, [vragen]);

    /* --------- presence per room ---------- */
    useEffect(() => {
        if (!roomCode) return;
        const connectedRef = ref(db, ".info/connected");
        const unsub = onValue(connectedRef, snap => {
            if (snap.val() === true) {
                const connId = crypto.randomUUID();
                connIdRef.current = connId;
                const myConnRef = ref(db, `rooms/${roomCode}/presence/${playerId}/${connId}`);
                set(myConnRef, serverTimestamp());
                onDisconnect(myConnRef).remove();
            }
        });
        return () => {
            if (connIdRef.current) {
                const myConnRef = ref(db, `rooms/${roomCode}/presence/${playerId}/${connIdRef.current}`);
                remove(myConnRef).catch(() => { });
                connIdRef.current = null;
            }
            if (unsub) unsub();
        };
    }, [roomCode, playerId]);

    /* --------- room listeners + self-heal ---------- */
    function attachRoomListener(code) {
        if (roomRef.current) roomRef.current = null;
        const r = ref(db, `rooms/${code}`);
        roomRef.current = r;
        onValue(r, (snap) => {
            const data = snap.val() ?? null;
            setRoom(data);

            setIsHost(!!data && data.hostId === playerId);

            if (!data) return;

            const { offline, mustHeal } = computeHealInfo(data);
            if (!mustHeal) return;

            runTransaction(ref(db, `rooms/${code}`), (d) => {
                if (!d) return d;

                if (d.players && d.presence) {
                    for (const id of offline) { delete d.players[id]; }
                }

                const ids = d.players ? Object.keys(d.players) : [];
                if (ids.length === 0) return null;

                d.playersOrder = (Array.isArray(d.playersOrder) ? d.playersOrder : ids)
                    .filter(id => ids.includes(id));
                if (d.playersOrder.length === 0) d.playersOrder = ids;

                if (!d.hostId || !ids.includes(d.hostId)) d.hostId = d.playersOrder[0] || ids[0];
                if (!d.turn || !ids.includes(d.turn)) d.turn = d.playersOrder[0] || d.hostId;

                return d;
            });
        });
    }


    function getSeedQuestions() { return (vragen.length > 0 ? vragen.map(v => v.tekst) : DEFAULT_VRAGEN); }

    async function createRoom({ autoStart = false } = {}) {
        const code = makeRoomCode();
        const qs = getSeedQuestions();
        const order = shuffle([...Array(qs.length).keys()]);
        const playersOrder = [playerId];
        const obj = {
            createdAt: serverTimestamp(),
            hostId: playerId,
            players: { [playerId]: { name: playerName || "Host", joinedAt: serverTimestamp() } },
            playersOrder,
            questions: qs,
            order,
            currentIndex: 0,
            lastLetter: "?",
            turn: playerId,
            started: false,
            version: 1
        };
        await set(ref(db, `rooms/${code}`), obj);
        setIsHost(true);
        setRoomCode(code);
        attachRoomListener(code);

        if (autoStart) {
            await update(ref(db, `rooms/${code}`), {
                started: true,
                currentIndex: 0,
                lastLetter: "?",
                turn: playersOrder[0]
            });
            setTimeout(() => letterRef.current?.focus(), 0);
        }
    }

    async function joinRoom() {
        const code = (roomCodeInput || "").trim().toUpperCase();
        if (!code) { alert("Voer een room code in."); return; }
        const r = ref(db, `rooms/${code}`);
        const snap = await get(r);
        if (!snap.exists()) { alert("Room niet gevonden."); return; }

        await runTransaction(r, (data) => {
            if (!data) return data;
            if (!data.players) data.players = {};
            data.players[playerId] = { name: playerName || "Speler", joinedAt: serverTimestamp() };
            if (!data.playersOrder) data.playersOrder = [];
            if (!data.playersOrder.includes(playerId)) data.playersOrder.push(playerId);
            if (!data.turn || !data.players[data.turn]) data.turn = data.playersOrder[0] || playerId;
            if (!data.hostId || !data.players[data.hostId]) data.hostId = data.playersOrder[0] || playerId;
            return data;
        });

        setIsHost(false);
        setRoomCode(code);
        attachRoomListener(code);
    }

    async function startSpelOnline() {
        if (!room || !isHost) { return; }
        await update(ref(db, `rooms/${roomCode}`), {
            started: true,
            currentIndex: 0,
            lastLetter: "?",
            turn: room.playersOrder?.[0] || room.hostId
        });
        setTimeout(() => letterRef.current?.focus(), 0);
    }

    async function submitLetterOnline(letter) {
        if (!room) return;
        const r = ref(db, `rooms/${roomCode}`);
        await runTransaction(r, (data) => {
            if (!data) return data;

            if (!data.players || !data.players[data.turn]) {
                const ids = data.players ? Object.keys(data.players) : [];
                if (ids.length === 0) return null;
                data.playersOrder = (Array.isArray(data.playersOrder) ? data.playersOrder : ids).filter(id => ids.includes(id));
                data.turn = data.playersOrder[0] || ids[0];
            }

            if (data.turn !== playerId) return;
            const listLen = (data.order?.length ?? 0);
            if (listLen === 0) return data;

            data.lastLetter = letter;
            data.currentIndex = (data.currentIndex + 1) % listLen;

            if (Array.isArray(data.playersOrder) && data.playersOrder.length > 0) {
                data.playersOrder = data.playersOrder.filter(id => data.players && data.players[id]);
                const i = data.playersOrder.indexOf(data.turn);
                const next = (i >= 0 ? (i + 1) % data.playersOrder.length : 0);
                data.turn = data.playersOrder[next];
            }
            return data;
        });
    }

    /* ---------- Kick een speler ---------- */
    async function kickPlayer(targetId) {
        if (!roomCode || !targetId) return;
        if (!confirm("Speler verwijderen?")) return;

        const r = ref(db, `rooms/${roomCode}`);
        await runTransaction(r, (data) => {
            if (!data) return data;
            if (!data.players || !data.players[targetId]) return data;

            delete data.players[targetId];

            if (Array.isArray(data.playersOrder)) {
                data.playersOrder = data.playersOrder.filter(id => id !== targetId && data.players && data.players[id]);
            }

            const ids = data.players ? Object.keys(data.players) : [];
            if (ids.length === 0) return null;

            if (!data.hostId || data.hostId === targetId || !data.players[data.hostId]) {
                data.hostId = data.playersOrder?.[0] || ids[0];
            }

            if (!data.turn || data.turn === targetId || !data.players[data.turn]) {
                data.turn = data.playersOrder?.[0] || data.hostId || ids[0];
            }

            return data;
        });

        // presence best-effort opruimen
        try { await remove(ref(db, `rooms/${roomCode}/presence/${targetId}`)); } catch { }
    }

    async function leaveRoom() {
        if (!roomCode) { setRoom(null); setRoomCode(""); setIsHost(false); return; }
        const r = ref(db, `rooms/${roomCode}`);
        await runTransaction(r, (data) => {
            if (!data) return data;

            if (data.players && data.players[playerId]) delete data.players[playerId];
            if (Array.isArray(data.playersOrder)) {
                data.playersOrder = data.playersOrder.filter(id => id !== playerId && data.players && data.players[id]);
            }

            const ids = data.players ? Object.keys(data.players) : [];
            if (ids.length === 0) return null;

            if (!data.hostId || !data.players[data.hostId]) data.hostId = data.playersOrder?.[0] || ids[0];
            if (!data.turn || !data.players[data.turn] || data.turn === playerId) {
                data.turn = data.playersOrder?.[0] || data.hostId || ids[0];
            }

            return data;
        });

        if (connIdRef.current) {
            const myConnRef = ref(db, `rooms/${roomCode}/presence/${playerId}/${connIdRef.current}`);
            remove(myConnRef).catch(() => { });
            connIdRef.current = null;
        }

        setRoom(null);
        setRoomCode("");
        setIsHost(false);
    }

    /* ---------- UI helpers ---------- */
    const isOnline = !!roomCode;
    const isMyTurn = isOnline && room?.turn === playerId;
    const onlineQuestion = isOnline && room
        ? room.questions?.[room.order?.[room.currentIndex ?? 0] ?? 0] ?? "Vraag komt hier..."
        : null;

    function onLetterChanged(e) {
        const val = (e.target.value ?? "").trim().toUpperCase();
        if (val.length === 1) {
            if (isOnline && isMyTurn) submitLetterOnline(val);
            e.target.value = "";
        }
    }

    function copyRoomCode() {
        if (!roomCode) return;
        navigator.clipboard.writeText(roomCode).then(() => alert("Room code gekopieerd."));
    }

    function voegVragenToe() {
        const items = splitInput(invoer);
        if (items.length === 0) return;
        setVragen((prev) => [...prev, ...items.map((tekst) => ({ id: crypto.randomUUID(), tekst }))]);
        setInvoer("");
    }
    function verwijderVraag(id) { setVragen((prev) => prev.filter((v) => v.id !== id)); }
    async function kopieerAlle() {
        const tekst = vragen.map((v) => v.tekst).join(",\n");
        try { await navigator.clipboard.writeText(tekst); alert("Alle vragen zijn gekopieerd."); }
        catch {
            const ta = document.createElement("textarea"); ta.value = tekst; document.body.appendChild(ta);
            ta.select(); document.execCommand("copy"); document.body.removeChild(ta); alert("Alle vragen zijn gekopieerd.");
        }
    }

    return (
        <>
            <GlobalStyle />
            <div style={styles.wrap}>
                <header style={styles.header}>
                    <h1 style={styles.h1}>PimPamPof</h1>

                    {/* bovenste controls */}
                    <Row>
                        {/* Naamveld alleen vóór start */}
                        {!room?.started && (
                            <input
                                style={styles.input}
                                placeholder="Jouw naam"
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                            />
                        )}

                        {!isOnline ? (
                            <>
                                <Button onClick={() => createRoom({ autoStart: true })}>Solo starten</Button>
                                <Button variant="alt" onClick={() => createRoom({ autoStart: false })}>Room aanmaken</Button>
                                <input style={styles.input} placeholder="Room code (bv. 82631)" value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} />
                                <Button variant="alt" onClick={joinRoom}>Join</Button>
                            </>
                        ) : (
                            <>
                                {!room?.started && (
                                    <span className="badge">Room: <b>{roomCode}</b>
                                        <button onClick={copyRoomCode} style={{ ...styles.btn, padding: "4px 10px" }}>Kopieer</button>
                                    </span>
                                )}
                                <Button variant="alt" onClick={leaveRoom}>Leave</Button>
                            </>
                        )}
                    </Row>

                    {/* start/ status */}
                    <Row>
                        {isOnline && isHost && !room?.started && (
                            <Button onClick={startSpelOnline}>Start spel (online)</Button>
                        )}
                        {isOnline && !isHost && !room?.started && (
                            <span className="muted">Wachten op host…</span>
                        )}
                        {isOnline && room?.started && (
                            <span className="muted">Spel gestart — room code blijft zichtbaar voor joiners.</span>
                        )}
                    </Row>
                </header>

                {/* beheer vragen op beginscherm */}
                {(!isOnline || (isOnline && isHost && !room?.started)) && (
                    <>
                        <Section title="Nieuwe vragen (gescheiden met , of enter)">
                            <TextArea
                                value={invoer}
                                onChange={setInvoer}
                                placeholder={"Bijv: Wat is je lievelingsdier?,\nWat eet je graag?"}
                            />
                            <div style={{ marginTop: 12 }}>
                                <Row>
                                    <Button onClick={voegVragenToe}>Voeg vragen toe</Button>
                                    <Button variant="alt" onClick={kopieerAlle}>Kopieer alle vragen</Button>
                                </Row>
                            </div>
                        </Section>

                        <Section title="Huidige vragen">
                            {vragen.length === 0 ? (
                                <p style={{ opacity: 0.7 }}>Nog geen vragen toegevoegd.</p>
                            ) : (
                                <ul style={styles.list}>
                                    {vragen.map((v) => (
                                        <li key={v.id} style={styles.li}>
                                            <div style={styles.liText}>{v.tekst}</div>
                                            <DangerButton onClick={() => verwijderVraag(v.id)}>❌</DangerButton>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>
                    </>
                )}

                {/* speelveld */}
                {isOnline && room?.started && (
                    <Section>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                            <div className="badge">Room: <b>{roomCode}</b>
                                <button onClick={copyRoomCode} style={{ ...styles.btn, padding: "4px 10px", marginLeft: 8 }}>Kopieer</button>
                            </div>
                            <div style={{ fontSize: 18 }}>
                                Laatste letter: <span style={{ fontWeight: 700 }}>{room?.lastLetter ?? "?"}</span>
                            </div>
                            <div style={{ fontSize: 22, minHeight: "3rem" }}>
                                {onlineQuestion ?? "Vraag komt hier..."}
                            </div>
                            <input
                                ref={letterRef}
                                type="text"
                                inputMode="text"
                                maxLength={1}
                                onChange={onLetterChanged}
                                placeholder={isMyTurn ? "Jouw beurt, typ een letter..." : "Niet jouw beurt"}
                                disabled={!isMyTurn}
                                style={{ ...styles.letterInput, opacity: isMyTurn ? 1 : 0.5 }}
                            />
                            {!isMyTurn && <div className="muted">Wachten op je beurt…</div>}
                        </div>
                    </Section>
                )}

                {/* spelers onder speelveld (met Kick) */}
                {isOnline && room?.players && (
                    <Section title="Spelers">
                        <ul style={styles.list}>
                            {(
                                Array.isArray(room.playersOrder)
                                    ? room.playersOrder
                                    : Object.keys(room.players)
                            )
                                .filter((id) => !!room.players[id])
                                .map((id, idx) => {
                                    const p = room.players[id];
                                    const active = room.turn === id;
                                    const showKick = id !== playerId; // 👉 altijd kickbaar behalve jezelf

                                    return (
                                        <li
                                            key={id}
                                            style={{
                                                ...styles.li,
                                                ...(active ? { background: "rgba(22,163,74,0.18)" } : {})
                                            }}
                                        >
                                            <div style={styles.liText}>
                                                {idx + 1}. {p?.name || "Speler"}
                                                {room.hostId === id && " (host)"}
                                            </div>

                                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                {active ? <div>🟢 beurt</div> : <div style={{ opacity: 0.6 }}>—</div>}
                                                {showKick && (
                                                    <DangerButton onClick={() => kickPlayer(id)}>Kick</DangerButton>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                        </ul>
                    </Section>
                )}


                <footer style={styles.foot}>
                    {isOnline ? "Online modus via Firebase Realtime Database (presence + self-heal). Spelers kunnen kicken." : "Maak een room aan of kies Solo starten."}
                </footer>
            </div>
        </>
    );
}
