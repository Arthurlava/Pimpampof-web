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

function calcPoints(ms) {
    const p = Math.floor(MAX_POINTS * (1 - ms / MAX_TIME_MS));
    return Math.max(0, p);
}

/* ---- ELO / RANK ---- */
const ELO_DEFAULT = 1000;
const ELO_K_BASE = 32;               // basis K-factor
const PERF_CLAMP_MIN = 0.8;          // ondergrens performance multiplier
const PERF_CLAMP_MAX = 1.2;          // bovengrens performance multiplier
const REF_TIME_MS = Math.max(2000, Math.floor(MAX_TIME_MS / 3)); // referentie voor "snel"

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

    /* 🔔 Jilla announcement bubble (wie heeft zojuist Jilla gebruikt) */
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
      max-height: 88vh;      /* ✅ mobiel overschalen fix */
      overflow: auto;        /* ✅ binnen de card scrollen */
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 16px; padding: 16px; backdrop-filter: blur(6px); box-shadow: 0 20px 60px rgba(0,0,0,.35);
    }
    .table { width:100%; border-collapse: collapse; }
    .table th, .table td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.12); text-align: left; }
    .table th { font-weight: 700; }

    /* Highlight in spelerslijst voor recente Jilla-gebruiker */
    .hot-jilla {
      outline: 2px solid #fb923c;
      border-radius: 12px;
    }
  `}</style>
);

/* ---------- standaard vragen ---------- */
const DEFAULT_VRAGEN = ["Noem iets dat je in de koelkast vindt.", "Zeg iets dat leeft in de zee.", "Noem een dier met vier poten.",
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
    "Zeg iets wat met reizen te maken heeft.", "Noem een gevaarlijk object.", "Noem iets dat je zelf kunt maken.",
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

// ---- STORAGE (versioned + super-robust) ----
const STORAGE_VERSION = 4;                    // << bumpen als je iedereen opnieuw wilt seeden
const STORAGE_KEY = `ppp.vragen.v${STORAGE_VERSION}`;
const OLD_KEYS = ["ppp.vragen", "ppp.vragen.v2", "ppp.vragen.v3"]; // opruimen oude varianten

function seedDefaults() {
    // maak unieke ids zodat UI-lijsten stabiel zijn
    return DEFAULT_VRAGEN.map((tekst) => ({ id: crypto.randomUUID(), tekst: String(tekst) }));
}

function writeSeeded() {
    const seeded = seedDefaults();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
}

function loadVragen() {
    try {
        // oude rommel opruimen
        OLD_KEYS.forEach((k) => localStorage.removeItem(k));

        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return writeSeeded();

        let parsed;
        try { parsed = JSON.parse(raw); }
        catch { return writeSeeded(); }

        if (!Array.isArray(parsed) || parsed.length === 0) return writeSeeded();

        // normaliseren
        return parsed.map((v) => ({
            id: v?.id || crypto.randomUUID(),
            tekst: String(v?.tekst ?? "")
        }));
    } catch {
        return writeSeeded();
    }
}

function saveVragen(vragen) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(vragen)); } catch (e) { e/* ignore */ }
}

/* ---------- persistente speler-id + naam ---------- */
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
function Button({ children, onClick, variant, disabled }) {
    let s = { ...styles.btn }; if (variant === "alt") s = { ...s, ...styles.btnAlt }; if (variant === "stop") s = { ...s, ...styles.btnStop };
    return <button onClick={onClick} style={{ ...s, opacity: disabled ? .6 : 1, cursor: disabled ? "not-allowed" : "pointer" }} disabled={disabled}>{children}</button>;
}
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

/* ---------- utils ---------- */
const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function makeRoomCode(len = 5) { let s = ""; for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }
function normalizeLetter(ch) { return (ch ?? "").toString().trim().toUpperCase(); }
function ordinal(n) { return `${n}e`; }

/* ✅ toegevoegde helpers die ontbraken (fix voor 'Room aanmaken' crash) */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function splitInput(text) {
    return String(text || "")
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
}

/* ✅ startletter: medeklinker excl. Q, X, Y, Z */
const START_CONSONANTS = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "V", "W"];
function randomStartConsonant() {
    return START_CONSONANTS[Math.floor(Math.random() * START_CONSONANTS.length)];
}

/* ---------- self-heal helper ---------- */
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

/* ---------- online/offline hook ---------- */
function useOnline() {
    const [online, setOnline] = React.useState(typeof navigator !== "undefined" ? navigator.onLine : true);
    React.useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener("online", on);
        window.addEventListener("offline", off);
        return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
    }, []);
    return online;
}

/* ---------- Elo helpers ---------- */
function safeStats(d, pid) {
    const s = (d.stats && d.stats[pid]) || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
    return {
        totalTimeMs: Number(s.totalTimeMs || 0),
        answeredCount: Number(s.answeredCount || 0),
        jillaCount: Number(s.jillaCount || 0),
        doubleCount: Number(s.doubleCount || 0),
    };
}
function performanceMultiplierForPid(d, pid) {
    const s = safeStats(d, pid);
    if (s.answeredCount <= 0) return 1.0;
    const avgMs = s.totalTimeMs / s.answeredCount;

    let timeFactor = REF_TIME_MS / Math.max(800, avgMs);
    timeFactor = Math.pow(timeFactor, 0.35);

    const doubleRate = s.doubleCount / s.answeredCount;
    const jillaRate = s.jillaCount / s.answeredCount;

    let perf = 1.0 * Math.pow(timeFactor, 0.10);
    perf *= (1.0 + 0.20 * (doubleRate));
    perf *= (1.0 - 0.20 * (jillaRate));

    perf = Math.min(PERF_CLAMP_MAX, Math.max(PERF_CLAMP_MIN, perf));
    return perf;
}
function expectedScore(ra, rb) {
    return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}
function ensureRatings(d) {
    if (!d.ratings) d.ratings = {};
    return d.ratings;
}
function getRating(d, pid) {
    const ratings = ensureRatings(d);
    return Number(ratings[pid] ?? ELO_DEFAULT);
}

export default function PimPamPofWeb() {
    const [vragen, setVragen] = useState(() => loadVragen());
    const [invoer, setInvoer] = useState("");

    const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || "");
    useEffect(() => { localStorage.setItem(NAME_KEY, playerName || ""); }, [playerName]);

    const [playerId] = useState(() => getOrCreatePlayerId());
    const online = useOnline();

    // --- OFFLINE SOLO state (geen Firebase) ---
    const [offlineSolo, setOfflineSolo] = useState(false);
    const [offIndex, setOffIndex] = useState(-1);
    const [offLastLetter, setOffLastLetter] = useState("?");
    const [offOrder, setOffOrder] = useState([]);

    function startOffline() {
        const qs = getSeedQuestions();
        if (!qs || qs.length === 0) { alert("Geen vragen beschikbaar."); return; }
        setOfflineSolo(true);
        setOffOrder(shuffle([...Array(qs.length).keys()]));
        setOffIndex(0);
        setOffLastLetter(randomStartConsonant()); // ✅ random startletter
        setTimeout(() => letterRef.current?.focus(), 0);
    }
    function stopOffline() {
        setOfflineSolo(false);
        setOffIndex(-1);
        setOffLastLetter("?");
    }
    function onOfflineLetterChanged(e) {
        const val = normalizeLetter(e.target.value);
        if (val.length === 1) {
            setOffLastLetter(val);
            setOffIndex(i => (i + 1) % (offOrder.length || 1));
            e.target.value = '';
        }
    }

    // --- ONLINE room state ---
    const [roomCodeInput, setRoomCodeInput] = useState("");
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

    // Leaderboard overlay
    const [leaderOpen, setLeaderOpen] = useState(false);
    const [leaderData, setLeaderData] = useState(null);

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
            // ✅ start met random medeklinker (excl. Q/X/Y/Z)
            lastLetter: randomStartConsonant(),
            turn: playerId,
            started: false,
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
            version: 5
        };
        await set(ref(db, `rooms/${code}`), obj);
        setIsHost(true);
        setRoomCode(code);
        attachRoomListener(code);

        if (autoStart) {
            await update(ref(db, `rooms/${code}`), { started: true });
            setTimeout(() => letterRef.current?.focus(), 0);
        }
    }

    async function joinRoom() {
        if (!navigator.onLine) { alert("Je bent offline — joinen kan niet."); return; }
        const code = (roomCodeInput || "").trim().toUpperCase();
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

            const playerCount = Object.keys(data.players).length;
            if (playerCount >= 2 && data.solo) data.solo = false;

            if (!data.turn || !data.players[data.turn]) data.turn = data.playersOrder[0] || playerId;
            if (!data.hostId || !data.players[data.hostId]) data.hostId = data.playersOrder[0] || playerId;
            if (!data.phase) { data.phase = "answer"; data.turnStartAt = data.solo ? null : Date.now(); data.cooldownEndAt = null; }

            // defensief: als room ooit met "?" is aangemaakt, herstel met medeklinker
            if (!data.lastLetter || data.lastLetter === "?") {
                data.lastLetter = randomStartConsonant();
            }
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
            currentIndex: 0,
            lastLetter: nextStartLetter,
            turn: room.playersOrder?.[0] || room.hostId,
            phase: "answer",
            turnStartAt: room.solo ? null : Date.now(),
            cooldownEndAt: null
        });
        setTimeout(() => letterRef.current?.focus(), 0);
    }

    function advanceTurnWithJail(data) {
        const ids = (Array.isArray(data.playersOrder) ? data.playersOrder : Object.keys(data.players || {}))
            .filter((id) => data.players && data.players[id]);
        if (ids.length === 0) return null;

        if (!data.jail) data.jail = {};
        let idx = Math.max(0, ids.indexOf(data.turn));
        for (let tries = 0; tries < ids.length; tries++) {
            idx = (idx + 1) % ids.length;
            const cand = ids[idx];
            const j = data.jail[cand] || 0;
            if (j > 0) { data.jail[cand] = j - 1; continue; }
            data.turn = cand;
            return cand;
        }
        data.turn = ids[(ids.indexOf(data.turn) + 1) % ids.length];
        return data.turn;
    }

    // ⬇️ Pauze / Hervat
    async function pauseGame() {
        if (!roomCode || !room) return;
        await runTransaction(ref(db, `rooms/${roomCode}`), (d) => {
            if (!d || d.paused) return d;
            d.paused = true;
            d.pausedAt = Date.now();
            return d;
        });
    }
    async function resumeGame() {
        if (!roomCode || !room) return;
        await runTransaction(ref(db, `rooms/${roomCode}`), (d) => {
            if (!d || !d.paused) return d;
            const delta = Date.now() - (d.pausedAt || Date.now());
            if (d.cooldownEndAt) d.cooldownEndAt += delta;
            if (d.turnStartAt) d.turnStartAt += delta;
            d.paused = false;
            d.pausedAt = null;
            return d;
        });
    }

    // Antwoord indienen (alleen multiplayer geeft punten)
    // Antwoord indienen (alleen multiplayer geeft punten)
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

            if (!data.players || !data.players[data.turn]) {
                const ids = data.players ? Object.keys(data.players) : [];
                if (ids.length === 0) return null;
                data.playersOrder = (Array.isArray(data.playersOrder) ? data.playersOrder : ids).filter(id => ids.includes(id));
                data.turn = data.playersOrder[0] || ids[0];
            }

            if (data.turn !== playerId) return data;
            if (data.phase !== "answer") return data;
            const listLen = (data.order?.length ?? 0);
            if (listLen === 0) return data;

            const isMP2 = !!data && !data.solo;
            if (isMP2) {
                if (!data.scores) data.scores = {};
                data.scores[playerId] = (data.scores[playerId] || 0) + totalGain;

                if (!data.stats) data.stats = {};
                const s = data.stats[playerId] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
                s.totalTimeMs += elapsed;
                s.answeredCount += 1;
                if (isDouble) s.doubleCount += 1;
                data.stats[playerId] = s;
            }

            // ⚠️ Belangrijk: sla info op zodat we later een correctie kunnen toekennen
            data.lastRequired = required || null;           // welke letter was vereist vóór deze zet
            data.lastAnswerBy = playerId;                   // wie heeft net geantwoord
            data.lastAnswerWasDouble = !!isDouble;          // had je al Dubble pof?

            data.lastLetter = letter;                       // de nieuwe 'laatste letter' (voor volgende speler)
            data.currentIndex = (data.currentIndex + 1) % listLen;

            advanceTurnWithJail(data);

            if (isMP2) {
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
        if (isMP && totalGain > 0) {
            triggerScoreToast(`+${totalGain} punten${isDouble ? ` (incl. +${DOUBLE_POF_BONUS} bonus)` : ""}`, "plus");
        }
    }
    async function changeLastLetter() {
        if (!roomCode || !room || !room.started) return;

        // simpele prompt; je kunt dit later vervangen door een mooiere modal
        const raw = window.prompt("Nieuwe laatste letter (A–Z):", "");
        const val = normalizeLetter(raw);
        if (val.length !== 1) return;

        // Toon de toast lokaal na afloop indien er een bonus bijkomt
        const couldTriggerDouble =
            !room.solo &&
            !room.lastAnswerWasDouble &&
            normalizeLetter(room.lastRequired) === val &&
            (room.lastAnswerBy === playerId || room.hostId === playerId);

        const r = ref(db, `rooms/${roomCode}`);
        await runTransaction(r, (d) => {
            if (!d || !d.started) return d;

            // Alleen host of de speler die net antwoordde
            const isAllowed = (d.hostId === playerId) || (d.lastAnswerBy === playerId);
            if (!isAllowed) return d;

            // wijzig alléén de laatste letter
            d.lastLetter = val;

            // Achteraf Dubble pof bonus toekennen (idempotent)
            const required = normalizeLetter(d.lastRequired);
            const nowDouble = required && required === val;
            if (!d.solo && nowDouble && !d.lastAnswerWasDouble) {
                if (!d.scores) d.scores = {};
                d.scores[d.lastAnswerBy] = (d.scores[d.lastAnswerBy] || 0) + DOUBLE_POF_BONUS;

                if (!d.stats) d.stats = {};
                const s = d.stats[d.lastAnswerBy] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
                s.doubleCount += 1;
                d.stats[d.lastAnswerBy] = s;

                d.lastAnswerWasDouble = true; // markeer als afgehandeld
                d.lastEvent = { type: "double_pof_correction", by: d.lastAnswerBy, at: Date.now(), letter: val };
            }

            return d;
        });

        // UI feedback (optioneel, niet kritisch voor state)
        if (couldTriggerDouble) {
            triggerPof(`Dubble pof (correctie)! +${DOUBLE_POF_BONUS}`);
            triggerScoreToast(`+${DOUBLE_POF_BONUS} punten (Dubble pof correctie)`, "plus");
        }
    }


    // Jilla
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

            if (!data.jail) data.jail = {};
            data.jail[playerId] = (data.jail[playerId] || 0) + 1;

            // 🔔 Onmiddellijk aankondigen wie Jilla gebruikt heeft (voor iedereen zichtbaar, kort)
            if (!data.participants) data.participants = {};
            const whoName = (data.participants[playerId]?.name) || (data.players?.[playerId]?.name) || "Speler";
            data.jillaLast = { pid: playerId, name: whoName, at: Date.now() };

            if (isMP) {
                if (!data.scores) data.scores = {};
                data.scores[playerId] = (data.scores[playerId] || 0) - JILLA_PENALTY;

                if (!data.stats) data.stats = {};
                const s = data.stats[playerId] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
                s.jillaCount += 1;
                data.stats[playerId] = s;

                data.phase = "cooldown";
                data.cooldownEndAt = Date.now() + COOLDOWN_MS;
                data.turnStartAt = null;
            } else {
                data.phase = "answer";
                data.turnStartAt = null;
                data.cooldownEndAt = null;
            }

            advanceTurnWithJail(data);
            return data;
        });

        if (isMP) triggerScoreToast(`-${JILLA_PENALTY} punten (Jilla)`, "minus");
    }

    async function kickPlayer(targetId) {
        if (!roomCode || !targetId) return;
        if (!confirm("Speler verwijderen?")) return;

        const r = ref(db, `rooms/${roomCode}`);
        await runTransaction(r, (data) => {
            if (!data) return data;
            if (!data.players || !data.players[targetId]) return data;

            delete data.players[targetId];
            if (data.jail && data.jail[targetId] != null) delete data.jail[targetId];

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

        try { await remove(ref(db, `rooms/${roomCode}/presence/${targetId}`)); } catch (e) { e/* ignore */ }
    }

    function buildLeaderboardSnapshot(rm) {
        const par = rm.participants ? Object.keys(rm.participants) : [];
        const arr = par.map(id => {
            const name = rm.participants[id]?.name || rm.players?.[id]?.name || "Speler";
            const score = (rm.scores && rm.scores[id]) || 0;
            const st = (rm.stats && rm.stats[id]) || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
            const avg = st.answeredCount > 0 ? (st.totalTimeMs / st.answeredCount) : null;
            return { id, name, score, avgMs: avg, answered: st.answeredCount || 0, jilla: st.jillaCount || 0, dpf: st.doubleCount || 0 };
        });
        arr.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        return arr;
    }

    // 👉 Elo toepassen wanneer iemand "Leave" doet (leaver verliest, leider wint)
    async function applyEloOnLeave(leaverId) {
        if (!roomCode) return;
        const r = ref(db, `rooms/${roomCode}`);
        await runTransaction(r, (data) => {
            if (!data || !data.players || !data.scores) return data;
            if (!data.started || data.solo) return data;

            const others = Object.keys(data.players).filter(id => id !== leaverId);
            if (others.length === 0) return data;

            let winnerId = others[0];
            let bestScore = Number((data.scores && data.scores[winnerId]) || 0);
            for (const id of others) {
                const sc = Number((data.scores && data.scores[id]) || 0);
                if (sc > bestScore) { bestScore = sc; winnerId = id; }
            }

            const ratings = ensureRatings(data);
            const ra = getRating(data, leaverId);
            const rb = getRating(data, winnerId);

            const ea = expectedScore(ra, rb);
            const eb = 1 - ea;

            const Ka = ELO_K_BASE * performanceMultiplierForPid(data, leaverId);
            const Kb = ELO_K_BASE * performanceMultiplierForPid(data, winnerId);

            const Sa = 0; // leaver verliest
            const Sb = 1; // leider wint

            const deltaA = Math.round(Ka * (Sa - ea));
            const deltaB = Math.round(Kb * (Sb - eb));

            ratings[leaverId] = ra + deltaA;
            ratings[winnerId] = rb + deltaB;

            if (!data.lastRatingDelta) data.lastRatingDelta = {};
            data.lastRatingDelta[leaverId] = (data.lastRatingDelta[leaverId] || 0) + deltaA;
            data.lastRatingDelta[winnerId] = (data.lastRatingDelta[winnerId] || 0) + deltaB;

            data.lastEvent = { type: "elo_on_leave", by: leaverId, to: winnerId, at: Date.now(), delta: { [leaverId]: deltaA, [winnerId]: deltaB } };

            return data;
        });
    }

    async function leaveRoom() {
        if (!roomCode) { setRoom(null); setRoomCode(""); setIsHost(false); return; }
        const r = ref(db, `rooms/${roomCode}`);
        await runTransaction(r, (data) => {
            if (!data) return data;

            if (data.players && data.players[playerId]) delete data.players[playerId];
            if (data.jail && data.jail[playerId] != null) delete data.jail[playerId];

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

    async function onLeaveClick() {
        if (room && room.started && !room.solo && (room.participants || room.players)) {
            const snap = buildLeaderboardSnapshot(room);
            setLeaderData(snap);
            setLeaderOpen(true);
        }
        // Elo toepassen vóór de speler echt vertrekt
        if (room && room.started && !room.solo) {
            try { await applyEloOnLeave(playerId); } catch (e) { console.warn("ELO apply failed:", e); }
        }
        await leaveRoom();
    }

    /* ---------- cooldown -> answer overgang (alleen multiplayer) ---------- */
    useEffect(() => {
        if (!roomCode || !room) return;
        if (room.solo) return;
        if (room.paused) return;
        if (room.phase === "cooldown" && room.cooldownEndAt && now >= room.cooldownEndAt) {
            runTransaction(ref(db, `rooms/${roomCode}`), (data) => {
                if (!data) return data;
                if (data.solo || data.paused) return data;
                if (data.phase !== "cooldown") return data;
                if (!data.cooldownEndAt || Date.now() < data.cooldownEndAt) return data;
                data.phase = "answer";
                data.turnStartAt = Date.now();
                return data;
            });
        }
    }, [roomCode, room?.phase, room?.cooldownEndAt, room?.paused, now, room]);

    /* ---------- UI helpers ---------- */
    const isOnlineRoom = !!roomCode;
    const isMyTurn = isOnlineRoom && room?.turn === playerId;
    const myJailCount = isOnlineRoom && room?.jail ? (room.jail[playerId] || 0) : 0;
    const onlineQuestion = isOnlineRoom && room
        ? room.questions?.[room.order?.[room.currentIndex ?? 0] ?? 0] ?? "Vraag komt hier..."
        : null;

    // timers bevriezen tijdens pauze
    const inCooldown = room?.phase === "cooldown" && !room?.solo;
    const effectiveNow = room?.paused ? (room?.pausedAt || now) : now;
    const cooldownLeftMs = Math.max(0, (room?.cooldownEndAt || 0) - effectiveNow);
    const answerElapsedMs = (!room?.solo && room?.phase === "answer" && room?.turnStartAt)
        ? Math.max(0, effectiveNow - room.turnStartAt) : 0;
    const potentialPoints = !room?.solo ? calcPoints(answerElapsedMs) : 0;

    function onLetterChanged(e) {
        const val = normalizeLetter(e.target.value);
        if (val.length === 1) {
            if (room?.paused) { e.target.value = ""; return; }
            if (isOnlineRoom && isMyTurn && myJailCount === 0 && !inCooldown) {
                const required = normalizeLetter(room?.lastLetter);
                if (required && required !== "?" && val === required) {
                    triggerPof(`Dubble pof! +${DOUBLE_POF_BONUS}`);
                }
                submitLetterOnline(val);
            }
            e.target.value = "";
        }
    }

    useEffect(() => {
        if (isOnlineRoom && room?.started && isMyTurn && myJailCount === 0 && !inCooldown && !room?.paused) {
            const t = setTimeout(() => letterRef.current?.focus(), 0);
            return () => clearTimeout(t);
        }
    }, [isOnlineRoom, room?.started, isMyTurn, myJailCount, inCooldown, room?.paused]);

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
    function resetStandaardVragen() {
        const seeded = seedDefaults();
        saveVragen(seeded);
        setVragen(seeded);
        alert("Standaard vragen opnieuw geladen.");
    }

    // ⏱️ jilla announcement zichtbaar houden (bv. 2s)
    const jillaAnnounceActive = (() => {
        if (!room?.jillaLast) return false;
        const at = room.jillaLast.at || 0;
        return now - at < 2000;
    })();

    return (
        <>
            <GlobalStyle />
            <div style={styles.wrap}>
                <header style={styles.header}>
                    <h1 style={styles.h1}>PimPamPof</h1>

                    {/* Bovenste controls met offline/online logica */}
                    <Row>
                        {!room?.started && !offlineSolo && (
                            <input
                                style={styles.input}
                                placeholder="Jouw naam"
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                            />
                        )}

                        {/* Niet in room en niet in offline solo */}
                        {!isOnlineRoom && !offlineSolo && (
                            <>
                                {!online ? (
                                    <>
                                        <span className="badge">alleen solo</span>
                                        <Button onClick={startOffline}>Solo Mode</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="alt" onClick={() => createRoom({ autoStart: false, solo: false })}>Room aanmaken</Button>
                                        <input style={styles.input} placeholder="Room code" value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} />
                                        <Button variant="alt" onClick={joinRoom}>Join</Button>
                                        <Button onClick={startOffline}>Solo (offline)</Button>
                                        <Button onClick={() => (window.location.href = URL_DIEREN)} title="Ga naar Dierenspel">↔️ Naar Dierenspel</Button>
                                    </>
                                )}
                            </>
                        )}

                        {/* Offline solo actief */}
                        {offlineSolo && (
                            <Button variant="stop" onClick={stopOffline}>Stop solo</Button>
                        )}

                        {/* In online room */}
                        {isOnlineRoom && (
                            <>
                                {!room?.started && (
                                    <span className="badge">Room: <b>{roomCode}</b>
                                        <button onClick={copyRoomCode} style={{ ...styles.btn, padding: "4px 10px" }}>Kopieer</button>
                                    </span>
                                )}
                                <Button variant="alt" onClick={onLeaveClick}>Leave</Button>
                            </>
                        )}
                    </Row>

                    {/* Statusbalk */}
                    <Row>
                        {isOnlineRoom && online && isHost && !room?.started && (
                            <Button onClick={startSpelOnline}>Start spel (online)</Button>
                        )}
                        {isOnlineRoom && online && !isHost && !room?.started && (
                            <span className="muted">Wachten op host…</span>
                        )}
                        {isOnlineRoom && room?.started && (
                            <>
                                <span className="muted">
                                    {room.solo ? "Solo modus." : "Multiplayer — timer & punten actief (5s cooldown)."}
                                </span>
                                {room.paused
                                    ? <Button onClick={resumeGame}>▶️ Hervatten</Button>
                                    : <Button variant="alt" onClick={pauseGame}>⏸️ Pauzeer (iedereen)</Button>}

                                {/* 🔤 Verander letter (host of laatste beantwoorder kan hem gebruiken) */}
                                <Button onClick={changeLastLetter}>🔤 Verander letter</Button>

                                {room.paused && <span className="badge">⏸️ Gepauzeerd</span>}
                            </>
                        )}

                        {!online && !offlineSolo && <span className="muted">start Solo</span>}
                    </Row>
                </header>

                {/* beheer vragen */}
                {(!isOnlineRoom || (isOnlineRoom && isHost && !room?.started)) && !offlineSolo && (
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
                                    <Button variant="stop" onClick={() => resetStandaardVragen(setVragen)}>
                                        Reset naar standaard
                                    </Button>

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

                {/* OFFLINE SOLO speelveld */}
                {offlineSolo && (
                    <Section>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                            <div className="badge">Solo</div>

                            <div style={{ fontSize: 18 }}>
                                Laatste letter: <span style={{ fontWeight: 700 }}>{offLastLetter}</span>
                            </div>
                            <div style={{ fontSize: 22, minHeight: "3rem" }}>
                                {(() => {
                                    const qs = getSeedQuestions();
                                    const qIdx = offOrder[offIndex] ?? 0;
                                    return qs[qIdx] ?? "Vraag komt hier...";
                                })()}
                            </div>

                            <input
                                ref={letterRef}
                                type="text"
                                inputMode="text"
                                maxLength={1}
                                onChange={onOfflineLetterChanged}
                                placeholder="Typ de laatste letter…"
                                style={styles.letterInput}
                            />
                        </div>
                    </Section>
                )}

                {/* ONLINE speelveld */}
                {isOnlineRoom && room?.started && (
                    <Section>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                            <div className="badge">Room: <b>{roomCode}</b>
                                <button onClick={copyRoomCode} style={{ ...styles.btn, padding: "4px 10px", marginLeft: 8 }}>Kopieer</button>
                            </div>

                            {/* 🔔 Jilla announcement (voor iedereen zichtbaar, kort) */}
                            {jillaAnnounceActive && room?.jillaLast?.name && (
                                <div className="jilla-toast">
                                    <div className="jilla-bubble">🔒 {room.jillaLast.name} gebruikte Jilla!</div>
                                </div>
                            )}

                            {/* Jilla-banner: alleen tonen als het JOUW BEURT is én je wordt overgeslagen */}
                            {isMyTurn && myJailCount > 0 && (
                                <>
                                    <div className="jilla-banner" style={{ marginTop: 4 }}>
                                        🔒 Jilla actief — je wordt {myJailCount === 1 ? "1 beurt" : `${myJailCount} beurten`} overgeslagen
                                    </div>
                                    <div className="muted" style={{ marginTop: 4 }}>
                                        Je huidige beurt wordt <b>overgeslagen</b> (Jilla).
                                    </div>
                                </>
                            )}

                            <div style={{ fontSize: 18 }}>
                                Laatste letter: <span style={{ fontWeight: 700 }}>{room?.lastLetter ?? "?"}</span>
                            </div>
                            <div style={{ fontSize: 22, minHeight: "3rem" }}>
                                {onlineQuestion ?? "Vraag komt hier..."}
                            </div>

                            {!room.solo && (
                                <>
                                    {inCooldown ? (
                                        <div className="badge">⏳ Volgende ronde over {Math.ceil(cooldownLeftMs / 1000)}s</div>
                                    ) : (
                                        <Row>
                                            <span className="badge">⏱️ Tijd: {Math.floor(answerElapsedMs / 1000)}s / {Math.floor(MAX_TIME_MS / 1000)}s</span>
                                            <span className="badge">🏅 Punten als je nu antwoordt: <b>{potentialPoints}</b></span>
                                        </Row>
                                    )}
                                </>
                            )}
                            {room.paused && <div className="badge">⏸️ Gepauzeerd — timer staat stil</div>}

                            <input
                                ref={letterRef}
                                type="text"
                                inputMode="text"
                                maxLength={1}
                                onChange={onLetterChanged}
                                placeholder={
                                    room?.paused
                                        ? "Gepauzeerd…"
                                        : !isMyTurn
                                            ? "Niet jouw beurt"
                                            : (myJailCount > 0
                                                ? "Jilla actief — jouw beurt wordt overgeslagen"
                                                : (inCooldown
                                                    ? "Wachten… ronde start zo"
                                                    : "Jouw beurt — typ de laatste letter…"))
                                }
                                disabled={!isMyTurn || myJailCount > 0 || inCooldown || room?.paused}
                                style={{ ...styles.letterInput, opacity: (isMyTurn && myJailCount === 0 && !inCooldown && !room?.paused) ? 1 : 0.5 }}
                            />

                            {isMyTurn && !inCooldown && !room?.paused && (
                                <div style={{ marginTop: 6 }}>
                                    <Button variant="stop" onClick={useJilla}>Jilla (vraag overslaan)</Button>
                                </div>
                            )}

                            {!isMyTurn && <div className="muted">Wachten op je beurt…</div>}
                        </div>
                    </Section>
                )}

                {/* Spelerslijst met scores (alleen online room) */}
                {isOnlineRoom && room?.participants && (
                    <Section title="Spelers">
                        <ul style={styles.list}>
                            {(Array.isArray(room.playersOrder) ? room.playersOrder : Object.keys(room.players || {}))
                                .filter((id) => !!(room.players && room.players[id]))
                                .map((id, idx) => {
                                    const pName = (room.participants?.[id]?.name) || (room.players?.[id]?.name) || "Speler";
                                    const active = room.turn === id;
                                    const jcount = (room.jail && room.jail[id]) || 0;
                                    const showKick = id !== playerId;
                                    const score = (!room.solo && room.scores && room.scores[id]) || 0;

                                    // highlight recente jilla-user
                                    const hot = room?.jillaLast?.pid === id && jillaAnnounceActive;

                                    return (
                                        <li
                                            key={id}
                                            className={hot ? "hot-jilla" : ""}
                                            style={{
                                                ...styles.li,
                                                ...(active ? { background: "rgba(22,163,74,0.18)" } : {})
                                            }}
                                        >
                                            <div style={styles.liText}>
                                                {idx + 1}. {pName}{room?.hostId === id ? " (host)" : ""}{" "}
                                                {/* Rank / Elo */}
                                                <span className="badge">🏆 Elo: <b>{(room?.ratings && room.ratings[id]) ?? ELO_DEFAULT}</b></span>
                                                {/* Laatste delta */}
                                                {room?.lastRatingDelta && room.lastRatingDelta[id] != null && (
                                                    <span className="badge" style={{ marginLeft: 6 }}>
                                                        Δ {room.lastRatingDelta[id] > 0 ? `+${room.lastRatingDelta[id]}` : room.lastRatingDelta[id]}
                                                    </span>
                                                )}
                                                {/* Jilla badge */}
                                                {jcount > 0 && <span className="badge" style={{ marginLeft: 6 }}>🔒 Jilla x{jcount}</span>}
                                                {/* Score badge (alleen in multiplayer) */}
                                                {!room.solo && <> <span style={{ margin: "0 6px" }}> </span><span className="badge">Punten: <b>{score}</b></span></>}
                                            </div>
                                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                {active ? <div>🟢 beurt</div> : <div style={{ opacity: 0.6 }}>—</div>}
                                                {showKick && (<DangerButton onClick={() => kickPlayer(id)}>Kick</DangerButton>)}
                                            </div>
                                        </li>
                                    );
                                })}
                        </ul>
                    </Section>
                )}

                <footer style={styles.foot}>
                    {isOnlineRoom
                        ? (room?.solo ? "Solo modus (geen timer/punten)." : "Multiplayer: timer & punten actief (5s cooldown).")
                        : (offlineSolo ? "Offline solo actief." : (online ? "Maak een room of start Solo (offline)." : "Offline — start Solo (offline)."))}
                </footer>
            </div>

            {/* Dubble pof! overlay */}
            {pofShow && (
                <div className="pof-toast">
                    <div className="pof-bubble">{pofText}</div>
                </div>
            )}

            {/* Score delta toast */}
            {scoreToast.show && (
                <div className="score-toast">
                    <div className={`score-bubble ${scoreToast.type === "minus" ? "score-minus" : "score-plus"}`}>
                        {scoreToast.text}
                    </div>
                </div>
            )}

            {/* Leaderboard overlay (na Leave, gebruikt participants)*/}
            {leaderOpen && leaderData && (
                <div className="overlay" onClick={() => setLeaderOpen(false)}>
                    <div className="card" onClick={e => e.stopPropagation()}>
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
                                {leaderData.map((r, i) => (
                                    <tr key={r.id}>
                                        <td>{ordinal(i + 1)}</td>
                                        <td>{r.name}</td>
                                        <td>{r.score}</td>
                                        <td>{r.avgMs == null ? "—" : `${(r.avgMs / 1000).toFixed(1)}s`}</td>
                                        <td>{r.jilla}</td>
                                        <td>{r.dpf}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                            <Button variant="alt" onClick={() => setLeaderOpen(false)}>Sluiten</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
