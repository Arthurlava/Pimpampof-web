// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import {
    getDatabase, ref, onValue, set, update, get, runTransaction, serverTimestamp
} from "firebase/database";

/* ========== Styles (incl. 'Dubbel Pof!' flash) ========== */
const GlobalStyle = () => (
    <style>{`
    html, body, #root { height: 100%; }
    body { margin: 0; background: linear-gradient(180deg,#171717,#262626); color:#fff; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
    #root { width:min(100%, 820px); margin:0 auto; padding:24px 16px; box-sizing:border-box; }
    input, button, textarea { font-family: inherit; }
    .wrap { display:flex; flex-direction:column; gap:20px; align-items:center; text-align:center; }
    .row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; justify-content:center; }
    .stack { width:100%; display:flex; flex-direction:column; gap:12px; } /* <-- altijd onder elkaar */
    .section { width:100%; padding:16px; border-radius:16px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); box-shadow:0 8px 22px rgba(0,0,0,.3); box-sizing:border-box; }
    .section h2 { margin:0 0 8px 0; font-size:18px; font-weight:700; text-align:center; }
    .btn { padding:10px 16px; border-radius:12px; border:none; background:#16a34a; color:#fff; font-size:14px; font-weight:600; cursor:pointer; }
    .btn.alt { background:#065f46; }
    .btn.stop { background:#475569; }
    .btn.danger { background:#dc2626; padding:8px 12px; }
    .input { padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.05); color:#fff; outline:none; }
    .textarea { width:100%; min-height:120px; resize:vertical; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.05); color:#fff; outline:none; box-sizing:border-box; }
    .list { list-style:none; padding:0; margin:0; }
    .li { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px 0; border-top:1px solid rgba(255,255,255,.1); }
    .badge { display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); font-size:12px; }
    .muted { color: rgba(255,255,255,.7); font-size:12px; }
    .title { font-size:28px; font-weight:800; margin:0; }
    .letterInput { margin-top:8px; width:260px; text-align:center; padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.05); color:#fff; outline:none; font-size:16px; box-sizing:border-box; }
    .pill { padding:4px 8px; border-radius:999px; border:1px solid rgba(255,255,255,.15); font-size:12px; }

    /* Dubbel Pof flash */
    @keyframes popInOut {
      0% { transform: scale(.8); opacity: 0; }
      10% { transform: scale(1.08); opacity: 1; }
      60% { transform: scale(1); opacity: 1; }
      100% { transform: scale(.95); opacity: 0; }
    }
    .flash {
      position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
      background: #16a34a; color: #fff; padding: 10px 16px; border-radius: 999px;
      box-shadow: 0 8px 22px rgba(0,0,0,.3); font-weight: 800; letter-spacing: .3px;
      animation: popInOut 1200ms ease forwards;
      z-index: 9999;
    }
  `}</style>
);

/* ========== Dierenregister + helpers ========== */
const SMALL_LOCAL_ANIMALS = [
    "hond", "kat", "muis", "rat", "egel", "konijn", "haas", "cavia", "hamster", "eekhoorn", "vos", "das", "wolf", "beer", "leeuw", "tijger",
    "olifant", "giraf", "zebra", "koe", "schaap", "geit", "varken", "paard", "ezel", "kip", "haan", "kuiken", "eend", "gans", "zwaan",
    "uil", "havik", "valk", "arend", "papegaai", "parkiet", "pinguïn", "krokodil", "alligator", "slang", "adder", "kobra", "python",
    "kikker", "pad", "salamander", "schildpad", "hagedis", "zalm", "tonijn", "haring", "makreel", "sardine", "snoek", "baars", "karper",
    "haai", "rog", "krab", "kreeft", "garnaal", "kwal", "dolfijn", "orka", "walvis", "zeehond", "zeeleeuw", "walrus", "bij", "wesp", "mier",
    "kever", "vlinder", "libel", "mug", "vlieg", "sprinkhaan", "kakkerlak", "kangoeroe", "koala", "panda", "wasbeer", "ree", "everzwijn",
    "edelhert", "eland", "bizon", "lama", "alpaca"
];
function norm(s) { return (s ?? "").toLocaleLowerCase("nl-NL").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
function toBaseForm(s) { const t = norm(s); if (t.endsWith("en") && t.length > 3) return t.slice(0, -2); if (t.endsWith("s") && t.length > 3) return t.slice(0, -1); if (t.endsWith("e") && t.length > 3) return t.slice(0, -1); return t; }
function firstAlpha(s) { const m = norm(s).match(/[a-z]/); return m ? m[0] : ""; }
function lastAlpha(s) { const m = norm(s).match(/[a-z](?!.*[a-z])/); return m ? m[0] : ""; }
const LOCAL_ANIMAL_SET = new Set(SMALL_LOCAL_ANIMALS.map(toBaseForm));

async function gbifCheckAnimal(name, timeoutMs = 2000) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const url = `https://api.gbif.org/v1/species/match?verbose=true&name=${encodeURIComponent(name)}`;
        const res = await fetch(url, { signal: ctrl.signal }); if (!res.ok) return false;
        const j = await res.json();
        return j && ((j.kingdom && norm(j.kingdom) === "animalia") || typeof j.class === "string");
    } catch { return false; } finally { clearTimeout(t); }
}
async function isKnownAnimal(name) {
    const base = toBaseForm(name);
    if (LOCAL_ANIMAL_SET.has(base)) return true;
    return await gbifCheckAnimal(name, 2000); // korte online check
}

/* ========== Firebase ========== */
const firebaseConfig = {
    apiKey: "AIzaSyDuYvtJbjj0wQbSwIBtyHuPeF71poPIBUg",
    authDomain: "pimpampof-aec32.firebaseapp.com",
    databaseURL: "https://pimpampof-aec32-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pimpampof-aec32",
    storageBucket: "pimpampof-aec32.firebasestorage.app",
    messagingSenderId: "872484746189",
    appId: "1:872484746189:web:a76c7345c4f2ebb6790a84"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ========== Helpers ========== */
const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function makeRoomCode(len = 5) { let s = ""; for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }
function shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]]; } return r; }

/* ========== App ========== */
export default function App() {
    const [playerName, setPlayerName] = useState("");
    const [playerId] = useState(() => crypto.randomUUID());
    const [roomCode, setRoomCode] = useState("");
    const [roomInput, setRoomInput] = useState("");
    const [room, setRoom] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const roomRef = useRef(null);

    // classic
    const [vragen, setVragen] = useState(() => [
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
    ]);
    const [invoer, setInvoer] = useState("");

    // modus
    const [gameMode, setGameMode] = useState("classic"); // "classic" | "dieren"

    // dierenmodus ui
    const [animalInput, setAnimalInput] = useState("");
    const [animalChecked, setAnimalChecked] = useState(null);
    const [flash, setFlash] = useState(""); // "DUBBEL POF!"

    const letterRef = useRef(null);

    useEffect(() => {
        if (!roomCode) return;
        const r = ref(db, `rooms/${roomCode}`);
        const unsub = onValue(r, s => setRoom(s.val() ?? null));
        return () => unsub();
    }, [roomCode]);

    function attachRoomListener(code) {
        if (roomRef.current) roomRef.current = null;
        roomRef.current = ref(db, `rooms/${code}`);
        onValue(roomRef.current, snap => setRoom(snap.val() ?? null));
    }

    function getSeedQuestions() { return vragen.length ? vragen.map(v => String(v)) : ["Noem iets."]; }

    async function createRoom({ autoStart = false } = {}) {
        const code = makeRoomCode();
        const classicQs = getSeedQuestions();
        const obj = {
            createdAt: serverTimestamp(),
            hostId: playerId,
            players: { [playerId]: { name: playerName || "Host", joinedAt: serverTimestamp() } },
            playersOrder: [playerId],
            mode: gameMode,
            questions: gameMode === "classic" ? classicQs : ["Noem een dier"],
            order: gameMode === "classic" ? shuffle([...Array(classicQs.length).keys()]) : [0],
            currentIndex: 0,
            lastLetter: "?",
            turn: playerId,
            started: false,
            usedAnimals: {}, // baseform -> { by, at, original }
            version: 4
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
                turn: obj.playersOrder[0]
            });
            setTimeout(() => letterRef.current?.focus(), 0);
        }
    }

    async function joinRoom() {
        const code = (roomInput || "").trim().toUpperCase();
        if (!code) { alert("Voer een room code in."); return; }
        const r = ref(db, `rooms/${code}`); const snap = await get(r);
        if (!snap.exists()) { alert("Room niet gevonden."); return; }

        await runTransaction(r, (data) => {
            if (!data) return data;
            data.players = data.players || {};
            data.players[playerId] = { name: playerName || "Speler", joinedAt: Date.now() };
            data.playersOrder = data.playersOrder || [];
            if (!data.playersOrder.includes(playerId)) data.playersOrder.push(playerId);
            return data;
        });

        setIsHost(false); setRoomCode(code); attachRoomListener(code);
    }

    async function startOnline() {
        if (!room || !isHost) return;
        await update(ref(db, `rooms/${roomCode}`), {
            started: true,
            currentIndex: 0,
            lastLetter: "?",
            turn: room.playersOrder?.[0] || room.hostId
        });
        setTimeout(() => letterRef.current?.focus(), 0);
    }

    function leaveRoom() {
        setRoom(null); setRoomCode(""); setIsHost(false);
        setAnimalInput(""); setAnimalChecked(null);
    }

    // classic
    const isOnline = !!roomCode;
    const isMyTurn = isOnline && room?.turn === playerId;

    const classicQuestion = useMemo(() => {
        if (!room || room.mode !== "classic") return null;
        const idx = room.order?.[room.currentIndex ?? 0] ?? 0;
        return room.questions?.[idx] ?? "Vraag komt hier...";
    }, [room]);

    function voegVragenToe() {
        const items = (invoer || "").split(/[\n,]/g).map(s => s.trim()).filter(Boolean);
        if (!items.length) return;
        setVragen(prev => [...prev, ...items]);
        setInvoer("");
    }

    async function submitLetterClassic(letter) {
        if (!room || !isMyTurn) return;
        const r = ref(db, `rooms/${roomCode}`);
        await runTransaction(r, (data) => {
            if (!data) return data;
            if (data.turn !== playerId) return data;
            const len = data.order?.length ?? 0; if (!len) return data;
            data.lastLetter = letter;
            data.currentIndex = (data.currentIndex + 1) % len;
            if (Array.isArray(data.playersOrder) && data.playersOrder.length) {
                const i = data.playersOrder.indexOf(data.turn);
                const next = (i >= 0 ? (i + 1) % data.playersOrder.length : 0);
                data.turn = data.playersOrder[next];
            }
            return data;
        });
    }

    // dieren
    async function checkAnimalCurrentRoom(animal) {
        const base = toBaseForm(animal);
        const first = firstAlpha(animal);
        const last = lastAlpha(animal);
        const mustStart = (room?.lastLetter && room.lastLetter !== "?") ? room.lastLetter : null;
        const duplicate = !!room?.usedAnimals?.[base];
        const validLocalOrGbif = await isKnownAnimal(animal);
        const badStart = !!(mustStart && first && mustStart !== first); // <-- strikte beginletter
        return { base, first, last, duplicate, valid: validLocalOrGbif, badStart };
    }

    async function onAnimalSubmit(e) {
        e?.preventDefault?.();
        if (!isMyTurn || !room) return;
        const value = (animalInput || "").trim(); if (!value) return;
        const res = await checkAnimalCurrentRoom(value);
        setAnimalChecked(res);
    }

    async function onAnimalNext() {
        if (!isMyTurn || !room) return;
        const value = (animalInput || "").trim(); if (!value) return;

        const res = await checkAnimalCurrentRoom(value);
        setAnimalChecked(res);

        // Blokkades
        if (res.duplicate) { alert("Dit dier is al gebruikt in deze room. Kies een ander dier."); return; }
        if (res.badStart) { alert(`Je dier moet beginnen met letter: ${String(room.lastLetter || "?").toUpperCase()}`); return; }

        // Transactie
        const r = ref(db, `rooms/${roomCode}`);
        await runTransaction(r, (data) => {
            if (!data) return data;
            if (data.turn !== playerId) return data;

            const base = toBaseForm(value);
            data.usedAnimals = data.usedAnimals || {};
            if (data.usedAnimals[base]) { return data; } // race: net gebruikt

            data.usedAnimals[base] = { by: playerId, at: Date.now(), original: value };

            const last = lastAlpha(value);
            if (last) data.lastLetter = last;

            if (Array.isArray(data.playersOrder) && data.playersOrder.length) {
                const i = data.playersOrder.indexOf(data.turn);
                const next = (i >= 0 ? (i + 1) % data.playersOrder.length : 0);
                data.turn = data.playersOrder[next];
            }
            return data;
        });

        // Dubbel Pof! (zelfde begin/eind)
        const fa = firstAlpha(value), la = lastAlpha(value);
        if (fa && la && fa === la) {
            setFlash("DUBBEL POF!");
            setTimeout(() => setFlash(""), 1200);
        }

        // reset & focus
        setAnimalInput(""); setAnimalChecked(null);
        setTimeout(() => letterRef.current?.focus(), 0);
    }

    return (
        <>
            <GlobalStyle />
            {flash && <div className="flash">{flash}</div>}

            <div className="wrap">
                <header>
                    <h1 className="title">PimPamPof</h1>

                    {/* Modus selectie */}
                    {!room?.started && (
                        <div className="badge" style={{ gap: 10 }}>
                            <span>Modus:</span>
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <input type="radio" name="mode" value="classic"
                                    checked={gameMode === "classic"} onChange={() => setGameMode("classic")} />
                                Classic
                            </label>
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <input type="radio" name="mode" value="dieren"
                                    checked={gameMode === "dieren"} onChange={() => setGameMode("dieren")} />
                                Dieren
                            </label>
                        </div>
                    )}

                    {/* Bovenste controls */}
                    <div className="row" style={{ marginTop: 12 }}>
                        {!room?.started && (
                            <input className="input" placeholder="Jouw naam"
                                value={playerName} onChange={e => setPlayerName(e.target.value)} />
                        )}
                        {!isOnline ? (
                            <>
                                <button className="btn" onClick={() => createRoom({ autoStart: true })}>Solo starten</button>
                                <button className="btn alt" onClick={() => createRoom({ autoStart: false })}>Room aanmaken</button>
                                <input className="input" placeholder="Room code"
                                    value={roomInput} onChange={e => setRoomInput(e.target.value.toUpperCase())} />
                                <button className="btn alt" onClick={joinRoom}>Join</button>
                            </>
                        ) : (
                            <>
                                <span className="badge">Room: <b>{roomCode}</b></span>
                                <button className="btn alt" onClick={leaveRoom}>Leave</button>
                            </>
                        )}
                    </div>

                    {/* Start/status */}
                    <div className="row">
                        {isOnline && isHost && !room?.started && (
                            <button className="btn" onClick={startOnline}>Start spel</button>
                        )}
                        {isOnline && !isHost && !room?.started && (
                            <span className="muted">Wachten op host…</span>
                        )}
                        {isOnline && room?.started && (
                            <span className="muted">
                                Beurt van: <b>{room?.players?.[room?.turn || ""]?.name || "?"}</b> — Letter: <b>{room?.lastLetter || "?"}</b> — Modus: <b>{room?.mode}</b>
                            </span>
                        )}
                    </div>
                </header>

                {/* Beheer (startscherm): ALTIJD onder elkaar */}
                {(!isOnline || (isOnline && isHost && !room?.started)) && (
                    <div className="stack">
                        <div className="section">
                            <h2>Nieuwe vragen (classic)</h2>
                            <textarea
                                className="textarea"
                                value={invoer}
                                onChange={e => setInvoer(e.target.value)}
                                placeholder={"Bijv: Wat is je lievelingsdier?,\nWat eet je graag?"}
                            />
                            <div className="row" style={{ marginTop: 10 }}>
                                <button className="btn" onClick={voegVragenToe}>Voeg vragen toe</button>
                            </div>
                        </div>

                        <div className="section">
                            <h2>Huidige vragen</h2>
                            {vragen.length === 0 ? (
                                <p className="muted">Nog geen vragen toegevoegd.</p>
                            ) : (
                                <ul className="list">
                                    {vragen.map((v, i) => (
                                        <li key={i} className="li">
                                            <div style={{ textAlign: "left" }}>{v}</div>
                                            <button className="btn danger" onClick={() => setVragen(prev => prev.filter((_, j) => j !== i))}>❌</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {/* Speelveld */}
                {isOnline && room?.started && (
                    <div className="section">
                        <div className="row" style={{ marginBottom: 8 }}>
                            <span className="badge">Room: <b>{roomCode}</b></span>
                            <span className="badge">Letter: <b>{room?.lastLetter || "?"}</b></span>
                            <span className="badge">Modus: <b>{room?.mode}</b></span>
                        </div>

                        {/* Spelers */}
                        <div className="row" style={{ marginBottom: 8 }}>
                            {Object.entries(room?.players || {}).map(([id, p]) => (
                                <span key={id} className="pill" style={{ borderColor: id === room?.turn ? "#22c55e" : "rgba(255,255,255,.15)" }}>
                                    {p.name || "Speler"}{id === room?.turn ? " • aan de beurt" : ""}
                                </span>
                            ))}
                        </div>

                        {/* Classic */}
                        {room?.mode === "classic" && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                                <div>Laatste letter: <b>{room?.lastLetter ?? "?"}</b></div>
                                <div style={{ fontSize: 22, minHeight: "3rem" }}>{classicQuestion}</div>
                                <input
                                    ref={letterRef}
                                    type="text"
                                    maxLength={1}
                                    disabled={!isMyTurn}
                                    placeholder={isMyTurn ? "Jouw beurt: typ een letter" : "Niet jouw beurt"}
                                    className="letterInput"
                                    onChange={e => {
                                        const v = (e.target.value ?? "").trim().toUpperCase();
                                        if (v.length === 1) { e.target.value = ""; submitLetterClassic(v); }
                                    }}
                                />
                                {!isMyTurn && <div className="muted">Wachten op je beurt…</div>}
                            </div>
                        )}

                        {/* Dieren */}
                        {room?.mode === "dieren" && (
                            <form onSubmit={onAnimalSubmit} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                                <div style={{ fontSize: 22, minHeight: "2.5rem" }}>Noem een dier</div>
                                <input
                                    ref={letterRef}
                                    className="letterInput"
                                    type="text"
                                    value={animalInput}
                                    onChange={e => setAnimalInput(e.target.value)}
                                    disabled={!isMyTurn}
                                    placeholder={isMyTurn ? "Typ het hele dier (bv. 'olifant')" : "Niet jouw beurt"}
                                />
                                <div className="row">
                                    <button type="submit" className="btn alt" disabled={!isMyTurn || !animalInput.trim()}>
                                        Check dier
                                    </button>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={onAnimalNext}
                                        disabled={
                                            !isMyTurn ||
                                            !animalInput.trim() ||
                                            (animalChecked?.duplicate === true) ||
                                            (animalChecked?.badStart === true)
                                        }
                                    >
                                        Volgende
                                    </button>
                                </div>

                                {/* Feedback */}
                                {animalChecked && (
                                    <div>
                                        {animalChecked.badStart && (
                                            <div style={{ color: "#f87171" }}>
                                                Moet beginnen met letter: <b>{String(room?.lastLetter || "?").toUpperCase()}</b>
                                            </div>
                                        )}
                                        {animalChecked.duplicate ? (
                                            <div style={{ color: "#f87171" }}>Dit dier is al eerder gebruikt in deze room.</div>
                                        ) : (
                                            <>
                                                {animalChecked.valid ? (
                                                    <div style={{ color: "#22c55e" }}>Dier gevonden in dierenregister ✓</div>
                                                ) : (
                                                    <div style={{ color: "#facc15" }}>Niet gevonden in register — je mag wel doorgaan.</div>
                                                )}
                                            </>
                                        )}
                                        {animalChecked.first && animalChecked.last && (
                                            <div className="muted">
                                                Begint met: <b>{animalChecked.first.toUpperCase()}</b> — Eindigt met: <b>{animalChecked.last.toUpperCase()}</b>
                                                {animalChecked.first && animalChecked.last && animalChecked.first === animalChecked.last && (
                                                    <span style={{ marginLeft: 8, color: "#22c55e", fontWeight: 700 }}>• Dubbel Pof!</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                )}

                <footer className="muted">
                    {isOnline ? "Online modus via Firebase Realtime Database." : "Maak een room aan of kies Solo starten."}
                </footer>
            </div>
        </>
    );
}
