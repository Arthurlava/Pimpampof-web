// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import {
    getDatabase, ref, onValue, set, update, get, runTransaction, serverTimestamp,
    onDisconnect, remove
} from "firebase/database";

/* ---- GAME CONSTANTS (multiplayer) ---- */
const MAX_TIME_MS = 120000;    // 2 minuten -> 0 punten
const MAX_POINTS = 200;        // max punten bij direct antwoord
const DOUBLE_POF_BONUS = 100;  // bonus voor Dubble pof!
const JILLA_PENALTY = 25;      // minpunten bij Jilla
const COOLDOWN_MS = 5000;      // 5s wacht na elk antwoord
const URL_DIEREN = import.meta.env.VITE_DIERENSPEL_URL || "https://dierenspel-mtul.vercel.app/";
// Highscore tuning (Bayesiaans, tegen korte lucky runs)
const PRIOR_MEAN = 80;        // verwachte punten per vraag
const PRIOR_WEIGHT = 10;      // virtuele vragen
const MIN_ANS_FOR_BEST = 5;   // potjes met <5 antwoorden tellen niet mee voor 'beste'

function calcPoints(ms) {
    const p = Math.floor(MAX_POINTS * (1 - ms / MAX_TIME_MS));
    return Math.max(0, p);
}

/* --- GLOBALE CSS + Animaties --- */
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

    @keyframes pofPop {
      0%   { transform: scale(0.6); opacity: 0; }
      20%  { transform: scale(1.12); opacity: 1; }
      50%  { transform: scale(1.0); }
      100% { transform: scale(0.9); opacity: 0; }
    }
    .pof-toast { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 9999; }
    .pof-bubble {
      background: radial-gradient(circle at 30% 30%, rgba(34,197,94,0.96), rgba(16,185,129,0.92));
      padding: 18px 26px; border-radius: 999px; font-size: 28px; font-weight: 800;
      box-shadow: 0 12px 40px rgba(0,0,0,.35); animation: pofPop 1200ms ease-out forwards; letter-spacing: .5px;
    }

    @keyframes jillaPulse {
      0%, 100% { transform: translateY(0); box-shadow: 0 8px 24px rgba(251, 146, 60, .25); }
      50% { transform: translateY(-2px); box-shadow: 0 12px 34px rgba(251, 146, 60, .35); }
    }
    .jilla-banner {
      display:inline-flex; align-items:center; gap:10px;
      background: linear-gradient(90deg, #f97316, #fb923c);
      color:#111; font-weight:800; padding:10px 14px; border-radius:999px;
      border:1px solid rgba(255,255,255,.3); animation: jillaPulse 1.3s ease-in-out infinite;
    }

    @keyframes jillaPop {
      0% { transform: translateY(6px); opacity: 0; }
      15% { transform: translateY(0); opacity: 1; }
      85% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-6px); opacity: 0; }
    }
    .jilla-toast { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 9999; pointer-events: none; }
    .jilla-bubble { background: linear-gradient(90deg, #fb923c, #f97316); color:#111; font-weight: 800;
      padding: 10px 14px; border-radius: 999px; box-shadow: 0 12px 28px rgba(0,0,0,.35); animation: jillaPop 1800ms ease-out forwards; }

    @keyframes scoreToast {
      0%   { transform: translateY(8px); opacity: 0; }
      15%  { transform: translateY(0);   opacity: 1; }
      85%  { transform: translateY(0);   opacity: 1; }
      100% { transform: translateY(-6px); opacity: 0; }
    }
    .score-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 9999; pointer-events: none; animation: scoreToast 1400ms ease-out forwards; }
    .score-bubble { padding: 10px 14px; border-radius: 999px; font-weight: 800; box-shadow: 0 12px 28px rgba(0,0,0,.35); font-size: 16px; }
    .score-plus  { background: linear-gradient(90deg, #22c55e, #16a34a); color: #041507; }
    .score-minus { background: linear-gradient(90deg, #ef4444, #dc2626); color: #180404; }

    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 9998; }
    .card {
      width: min(92vw, 720px);
      max-height: 88vh;
      overflow: auto;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 16px; padding: 16px; backdrop-filter: blur(6px); box-shadow: 0 20px 60px rgba(0,0,0,.35);
    }
    .table { width:100%; border-collapse: collapse; }
    .table th, .table td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.12); text-align: left; }
    .table th { font-weight: 700; }
    .hot-jilla { outline: 2px solid #fb923c; border-radius: 12px; }
  `}</style>
);

/* ---------- standaard vragen ---------- */
const DEFAULT_VRAGEN = [/* ... (ongewijzigd, laat jouw lijst hier staan) ... */];

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

// ---- STORAGE ----
const STORAGE_VERSION = 4;
const STORAGE_KEY = `ppp.vragen.v${STORAGE_VERSION}`;
const OLD_KEYS = ["ppp.vragen", "ppp.vragen.v2", "ppp.vragen.v3"];

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

function seedDefaults() { return DEFAULT_VRAGEN.map((tekst) => ({ id: crypto.randomUUID(), tekst: String(tekst) })); }
function writeSeeded() { const seeded = seedDefaults(); localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded)); return seeded; }
function loadVragen() {
    try {
        OLD_KEYS.forEach((k) => localStorage.removeItem(k));
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return writeSeeded();
        let parsed;
        try { parsed = JSON.parse(raw); } catch { return writeSeeded(); }
        if (!Array.isArray(parsed) || parsed.length === 0) return writeSeeded();
        return parsed.map((v) => ({ id: v?.id || crypto.randomUUID(), tekst: String(v?.tekst ?? "") }));
    } catch { return writeSeeded(); }
}
function saveVragen(v) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch { /* ignore */ } }

/* ---------- persistente speler-id + naam ---------- */
const PID_KEY = "ppp.playerId";
function getOrCreatePlayerId() {
    try {
        const existing = localStorage.getItem(PID_KEY);
        if (existing) return existing;
        const id = crypto.randomUUID();
        localStorage.setItem(PID_KEY, id);
        return id;
    } catch { return crypto.randomUUID(); }
}
const NAME_KEY = "ppp.playerName";

/* ---------- helpers ---------- */
function Section({ title, children }) { return (<div style={styles.section}>{title && <h2 style={styles.sectionTitle}>{title}</h2>}{children}</div>); }
function Row({ children }) { return <div style={styles.row}>{children}</div>; }
function Button({ children, onClick, variant, disabled, title }) {
    let s = { ...styles.btn }; if (variant === "alt") s = { ...s, ...styles.btnAlt }; if (variant === "stop") s = { ...s, ...styles.btnStop };
    return <button onClick={onClick} title={title} style={{ ...s, opacity: disabled ? .6 : 1, cursor: disabled ? "not-allowed" : "pointer" }} disabled={disabled}>{children}</button>;
}
function DangerButton({ children, onClick }) { return <button onClick={onClick} style={styles.btnDanger}>{children}</button>; }
function TextArea({ value, onChange, placeholder }) { return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={styles.textarea} />; }

function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function splitInput(text) { return String(text || "").split(/[\n,]+/).map(s => s.trim()).filter(Boolean); }
const START_CONSONANTS = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "V", "W"];
function randomStartConsonant() { return START_CONSONANTS[Math.floor(Math.random() * START_CONSONANTS.length)]; }
function normalizeLetter(ch) { return (ch ?? "").toString().trim().toUpperCase(); }

// nette tijdnotatie (mm:ss) voor looptijd van potje
function formatMs(ms) {
    if (!ms || ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PimPamPofWeb() {
    const [vragen, setVragen] = useState(() => loadVragen());
    const [invoer, setInvoer] = useState("");

    const [playerName] = useState(() => localStorage.getItem(NAME_KEY) || "");
    useEffect(() => { localStorage.setItem(NAME_KEY, playerName || ""); }, [playerName]);

    const [playerId] = useState(() => getOrCreatePlayerId());

    // --- ONLINE room state ---
    const [roomCode, setRoomCode] = useState("");
    const [room, setRoom] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const roomRef = useRef(null);

    const letterRef = useRef(null);
    const connIdRef = useRef(null);

    // Dubble pof! UI
    const [pofShow, setPofShow] = useState(false);
    const [pofText, setPofText] = useState("Dubble pof!");
    function triggerPof(text = "Dubble pof!") { setPofText(text); setPofShow(true); setTimeout(() => setPofShow(false), 1200); }

    // Score toast UI
    const [scoreToast, setScoreToast] = useState({ show: false, text: "", type: "plus" });
    function triggerScoreToast(text, type = "plus") {
        setScoreToast({ show: true, text, type });
        setTimeout(() => setScoreToast(s => ({ ...s, show: false })), 1400);
    }

    // Timer tick
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => { const id = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(id); }, []);

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

    function attachRoomListener(code) {
        if (roomRef.current) roomRef.current = null;
        const r = ref(db, `rooms/${code}`);
        roomRef.current = r;
        onValue(r, (snap) => {
            const data = snap.val() ?? null;
            setRoom(data);
            setIsHost(!!data && data.hostId === playerId);

            // backfill als potje al liep zonder gameStartedAt
            if (data && data.started && !data.gameStartedAt) {
                update(ref(db, `rooms/${code}`), {
                    gameStartedAt: Date.now(),
                    round: data.round || 1
                }).catch(() => { });
            }

            if (!data) return;

            const { offline, mustHeal } = computeHealInfo(data);
            if (!mustHeal) return;

            runTransaction(ref(db, `rooms/${code}`), (d) => {
                if (!d) return d;

                // Offline spelers verwijderen alleen als leaven is toegestaan
                if (d.players && d.presence) {
                    for (const id of offline) {
                        if (canLeaveRoom(d)) {
                            delete d.players[id];
                            if (d.jail && d.jail[id] != null) delete d.jail[id];
                        }
                    }
                }

                const ids = d.players ? Object.keys(d.players) : [];
                if (ids.length === 0) return null;

                d.playersOrder = (Array.isArray(d.playersOrder) ? d.playersOrder : ids).filter(id => ids.includes(id));
                if (d.playersOrder.length === 0) d.playersOrder = ids;

                if (!d.hostId || !ids.includes(d.hostId)) d.hostId = d.playersOrder[0] || ids[0];
                if (!d.turn || !ids.includes(d.turn)) d.turn = d.playersOrder[0] || d.hostId;

                if (d.jail) for (const jid of Object.keys(d.jail)) if (!d.players[jid]) delete d.jail[jid];
                return d;
            });
        });
    }

    function getSeedQuestions() { return (vragen.length > 0 ? vragen.map(v => v.tekst) : DEFAULT_VRAGEN); }

    async function createRoom({ autoStart = false, solo = false } = {}) {
        if (!navigator.onLine && !solo) { alert("Je bent offline — multiplayer kan niet."); return; }
        const code = makeRoomCode();
        const qs = getSeedQuestions();
        const order = shuffle([...Array(qs.length).keys()]);
        const playersOrder = [playerId];
        const obj = {
            createdAt: serverTimestamp(),
            hostId: playerId,
            players: { [playerId]: { name: playerName || "Host", joinedAt: serverTimestamp() } },
            participants: { [playerId]: { name: playerName || "Host", firstJoinedAt: serverTimestamp() } },
            playersOrder,
            questions: qs,
            order,
            currentIndex: 0,
            lastLetter: randomStartConsonant(),
            turn: playerId,
            started: false,
            finished: false,
            solo,
            jail: {},
            scores: {},
            stats: {},
            usedLetters: {},
            paused: false,
            pausedAt: null,
            phase: solo ? "answer" : "answer",
            turnStartAt: solo ? null : Date.now(),
            cooldownEndAt: null,
            gameStartedAt: null,
            round: 1,
            version: 5
        };
        await set(ref(db, `rooms/${code}`), obj);
        setIsHost(true);
        setRoomCode(code);
        attachRoomListener(code);

        if (autoStart) {
            await update(ref(db, `rooms/${code}`), { started: true, gameStartedAt: Date.now(), round: 1 });
            setTimeout(() => letterRef.current?.focus(), 0);
        }
    }

    const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    function makeRoomCode(len = 5) { let s = ""; for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }

    // let joinRoom via console: ppp.joinRoom("ABCDE")
    async function joinRoom(codeParam) {
        if (!navigator.onLine) { alert("Je bent offline — joinen kan niet."); return; }
        const code = (codeParam || "").trim().toUpperCase();
        if (!code) { alert("Voer een room code in."); return; }
        const r = ref(db, `rooms/${code}`);
        const snap = await get(r);
        if (!snap.exists()) { alert("Room niet gevonden."); return; }

        await runTransaction(r, (data) => {
            if (!data) return data;

            if (!data.players) data.players = {};
            data.players[playerId] = { name: playerName || "Speler", joinedAt: serverTimestamp() };

            if (!data.participants) data.participants = {};
            data.participants[playerId] = data.participants[playerId] || { name: playerName || "Speler", firstJoinedAt: serverTimestamp() };
            data.participants[playerId].name = playerName || data.participants[playerId].name;

            if (!data.playersOrder) data.playersOrder = [];
            if (!data.playersOrder.includes(playerId)) data.playersOrder.push(playerId);

            if (!data.jail) data.jail = {};
            if (!data.scores) data.scores = {};
            if (!data.stats) data.stats = {};
            if (data.paused == null) { data.paused = false; data.pausedAt = null; }
            if (data.finished == null) data.finished = false;

            const playerCount = Object.keys(data.players).length;
            if (playerCount >= 2 && data.solo) data.solo = false;

            if (!data.turn || !data.players[data.turn]) data.turn = data.playersOrder[0] || playerId;
            if (!data.hostId || !data.players[data.hostId]) data.hostId = data.playersOrder[0] || playerId;
            if (!data.phase) { data.phase = "answer"; data.turnStartAt = data.solo ? null : Date.now(); data.cooldownEndAt = null; }

            if (!data.lastLetter || data.lastLetter === "?") {
                data.lastLetter = randomStartConsonant();
            }
            if (data.started && !data.gameStartedAt) data.gameStartedAt = Date.now();
            if (data.round == null) data.round = 1;

            return data;
        });

        setIsHost(false);
        setRoomCode(code);
        attachRoomListener(code);
    }

    async function startSpelOnline() {
        if (!navigator.onLine) { alert("Je bent offline — kan niet starten."); return; }
        if (!room || !isHost) { return; }
        const nextStartLetter = (!room.lastLetter || room.lastLetter === "?") ? randomStartConsonant() : room.lastLetter;

        await update(ref(db, `rooms/${roomCode}`), {
            started: true,
            finished: false,
            currentIndex: 0,
            lastLetter: nextStartLetter,
            turn: room.playersOrder?.[0] || room.hostId,
            phase: "answer",
            turnStartAt: room.solo ? null : Date.now(),
            cooldownEndAt: null,
            gameStartedAt: Date.now(),
            round: 1
        });
        setTimeout(() => letterRef.current?.focus(), 0);
    }

    function canLeaveRoom(data) {
        if (!data) return true;
        if (data.solo) return true;
        if (!data.started) return true;
        if (data.finished) return true;
        return data.turn === playerId; // host/aan-de-beurt mag leaven zonder het spel te breken
    }

    function advanceTurnWithJail(data) {
        if (!data.playersOrder) return;
        const ids = data.playersOrder;
        if (!ids || ids.length === 0) return;
        let idx = ids.indexOf(data.turn);
        if (idx === -1) idx = 0;
        for (let i = 0; i < ids.length; i++) {
            idx = (idx + 1) % ids.length;
            const next = ids[idx];
            const j = (data.jail && data.jail[next]) || 0;
            if (j > 0) {
                data.jail[next] = j - 1;
                continue;
            }
            data.turn = next;
            return;
        }
    }

    async function leaveRoom() {
        if (!roomCode) return;
        const code = roomCode;
        const r = ref(db, `rooms/${code}`);

        // Poets presence entry van deze client weg
        if (connIdRef.current) {
            const myConnRef = ref(db, `rooms/${code}/presence/${playerId}/${connIdRef.current}`);
            try { await remove(myConnRef); } catch { /* ignore */ }
            connIdRef.current = null;
        }

        await runTransaction(r, (d) => {
            if (!d) return d;

            // Als leaven niet mag en het spel in kritieke fase zit: markeer alleen afwezig (presence regelt dit)
            if (!canLeaveRoom(d)) {
                // niets aan spelstaat veranderen
                return d;
            }

            if (d.players) delete d.players[playerId];
            if (Array.isArray(d.playersOrder)) d.playersOrder = d.playersOrder.filter(id => id !== playerId);
            if (d.jail && d.jail[playerId] != null) delete d.jail[playerId];
            if (d.scores && d.scores[playerId] != null) delete d.scores[playerId];
            if (d.stats && d.stats[playerId] != null) delete d.stats[playerId];
            if (d.participants && d.participants[playerId]) {
                // laat participants bestaan (historie), maar mag ook blijven staan
            }

            const ids = d.players ? Object.keys(d.players) : [];
            if (ids.length === 0) return null; // laatste verlaat → hele room opruimen

            // host/turn herstellen indien nodig
            if (!d.hostId || !ids.includes(d.hostId)) d.hostId = ids[0];
            if (!d.turn || !ids.includes(d.turn)) d.turn = d.hostId;

            // als huidige beurt net van vertrekkende speler was, schuif door
            if (d.turn === playerId) advanceTurnWithJail(d);

            return d;
        });

        setRoomCode("");
        setRoom(null);
    }

    async function submitLetterOnline(letter) {
        if (!room) return;
        if (room.paused) return;

        const isMP = !!room && !room.solo;
        const elapsed = Math.max(0, Date.now() - (room?.turnStartAt ?? Date.now()));
        const basePoints = isMP ? calcPoints(elapsed) : 0;

        const required = normalizeLetter(room?.lastLetter);
        const isDouble = required && required !== "?" && normalizeLetter(letter) === required;
        const bonus = isMP && isDouble ? DOUBLE_POF_BONUS : 0;
        const totalGain = basePoints + bonus;

        const r = ref(db, `rooms/${roomCode}`);
        await runTransaction(r, (data) => {
            if (!data) return data;
            if (data.paused) return data;

            if (!data.players || !data.players[data.turn]) return data;
            if (data.turn !== playerId) return data;
            if (data.phase !== "answer") return data;
            const listLen = (data.order?.length ?? 0);
            if (listLen === 0) return data;

            if (isMP) {
                if (!data.scores) data.scores = {};
                data.scores[playerId] = (data.scores[playerId] || 0) + (basePoints + bonus);

                if (!data.stats) data.stats = {};
                const s = data.stats[playerId] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
                s.totalTimeMs += elapsed;
                s.answeredCount += 1;
                if (isDouble) s.doubleCount += 1;
                data.stats[playerId] = s;
            }

            data.lastRequired = required || null;
            data.lastAnswerBy = playerId;
            data.lastAnswerWasDouble = !!isDouble;
            data.lastLetter = letter;

            // vraag door
            data.currentIndex = (data.currentIndex + 1) % listLen;
            data.round = (data.round || 1) + 1;

            // volgende beurt
            advanceTurnWithJail(data);

            if (isMP) {
                data.phase = "cooldown";
                data.cooldownEndAt = Date.now() + COOLDOWN_MS;
                data.turnStartAt = null;
            } else {
                data.phase = "answer";
                data.turnStartAt = null;
                data.cooldownEndAt = null;
            }
            return data;
        });

        if (isDouble) triggerPof(`Dubble pof! +${DOUBLE_POF_BONUS}`);
        if (isMP && totalGain > 0) triggerScoreToast(`+${totalGain} punten`, "plus");
    }

    async function useJilla() {
        if (!room) return;
        if (room.paused) return;
        const isMP = !!room && !room.solo;

        const r = ref(db, `rooms/${roomCode}`);
        await runTransaction(r, (data) => {
            if (!data) return data;
            if (data.paused) return data;

            if (!data.players || !data.players[data.turn]) return data;
            if (data.turn !== playerId) return data;
            if (data.phase !== "answer") return data;

            const listLen = (data.order?.length ?? 0);
            if (listLen > 0) data.currentIndex = (data.currentIndex + 1) % listLen;
            data.round = (data.round || 1) + 1;

            if (!data.jail) data.jail = {};
            data.jail[playerId] = (data.jail[playerId] || 0) + 1;

            if (isMP) {
                if (!data.scores) data.scores = {};
                data.scores[playerId] = (data.scores[playerId] || 0) - JILLA_PENALTY;
            }
            advanceTurnWithJail(data);
            return data;
        });

        if (isMP) triggerScoreToast(`-${JILLA_PENALTY} punten (Jilla)`, "minus");
    }

    // ------------- UI afgeleide waarden -------------
    const isOnlineRoom = !!roomCode;
    const isMyTurn = isOnlineRoom && room?.turn === playerId;
    const myJailCount = isOnlineRoom && room?.jail ? (room.jail[playerId] || 0) : 0;
    const onlineQuestion = isOnlineRoom && room
        ? room.questions?.[room.order?.[room.currentIndex ?? 0] ?? 0] ?? "Vraag komt hier..."
        : null;

    const inCooldown = room?.phase === "cooldown" && !room?.solo;
    const effectiveNow = room?.paused ? (room?.pausedAt || now) : now;
    const cooldownLeftMs = Math.max(0, (room?.cooldownEndAt || 0) - effectiveNow); // nu echt gebruikt in UI
    const answerElapsedMs = (!room?.solo && room?.phase === "answer" && room?.turnStartAt)
        ? Math.max(0, effectiveNow - room.turnStartAt) : 0;
    const potentialPoints = !room?.solo ? calcPoints(answerElapsedMs) : 0;

    function onLetterChanged(e) {
        const val = normalizeLetter(e.target.value);
        if (val.length === 1) {
            if (room?.paused) { e.target.value = ""; return; }
            if (isOnlineRoom && isMyTurn && myJailCount === 0 && !inCooldown) submitLetterOnline(val);
            e.target.value = "";
        }
    }

    // Expose debug helpers zodat ESLint ze als “gebruikt” ziet zonder UI te veranderen
    useEffect(() => {
        window.ppp = { createRoom, joinRoom, startSpelOnline, leaveRoom };
    }, []);

    return (
    <>
            <GlobalStyle />
            <div style={styles.wrap}>
                <header style={styles.header}>
                    <h1 style={styles.h1}>PimPamPof</h1>
                    <Row>
                        {isOnlineRoom && (
                            <>
                                <Button variant="alt" onClick={() => leaveRoom()}>Leave</Button>
                                {isHost && !room?.started && <Button onClick={startSpelOnline}>Start spel</Button>}
                            </>
                        )}
                    </Row>
                </header>
                {isOnlineRoom && room?.started && (
                    <Section>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                            <div style={{ fontSize: 18 }}>
                                Laatste letter: <span style={{ fontWeight: 700 }}>{room?.lastLetter ?? "?"}</span>
                            </div>
                            <div style={{ fontSize: 22 }}>
                                {onlineQuestion ?? "Vraag komt hier..."}
                            </div>

                            <Row>
                                <span className="badge">
                                    🕒 Potje: <b>{formatMs((room?.gameStartedAt ? effectiveNow - room.gameStartedAt : 0))}</b>
                                </span>
                                <span className="badge">
                                    🔁 Ronde: <b>{(room?.currentIndex ?? 0) + 1} / {room?.order?.length ?? 0}</b>
                                </span>
                                {inCooldown && (
                                    <span className="badge">
                                        ⏳ Cooldown: <b>{Math.ceil(cooldownLeftMs / 1000)}s</b>
                                    </span>
                                )}
                            </Row>

                            {!room.solo && !inCooldown && (
                                <Row>
                                    <span className="badge">⏱️ Tijd: {Math.floor(answerElapsedMs / 1000)}s</span>
                                    <span className="badge">🏅 Punten nu: {potentialPoints}</span>
                                </Row>
                            )}

                            <input
                                ref={letterRef}
                                type="text"
                                maxLength={1}
                                onChange={onLetterChanged}
                                placeholder="Typ de laatste letter…"
                                disabled={!isMyTurn || myJailCount > 0 || inCooldown || room?.paused}
                                style={styles.letterInput}
                            />
                            {isMyTurn && <Button variant="stop" onClick={useJilla}>Jilla</Button>}
                        </div>
                    </Section>
                )}

                {!roomCode && (
                    <Section title="Nieuwe vragen (gescheiden met , of enter)">
                        <TextArea
                            value={invoer}
                            onChange={setInvoer}
                            placeholder={`Bijv: Wat is je lievelingsdier?,\nWat eet je graag?`}
                        />
                        <Row>
                            <Button onClick={() => {
                                const items = splitInput(invoer);
                                if (items.length === 0) return;
                                setVragen((prev) => [
                                    ...prev,
                                    ...items.map((tekst) => ({ id: crypto.randomUUID(), tekst }))
                                ]);
                                setInvoer("");
                            }}>
                                Voeg vragen toe
                            </Button>
                        </Row>
                    </Section>
                )}
            </div>

            {pofShow && (
                <div className="pof-toast">
                    <div className="pof-bubble">{pofText}</div>
                </div>
            )}

            {scoreToast.show && (
                <div className="score-toast">
                    <div className={`score-bubble ${scoreToast.type === "minus" ? "score-minus" : "score-plus"}`}>
                        {scoreToast.text}
                    </div>
                </div>
            )}
        </>
    );
}
