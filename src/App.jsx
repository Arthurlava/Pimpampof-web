// src/App.jsx  — DEEL 1/2
import React, { useEffect, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  getDatabase, ref, onValue, set, update, get, runTransaction, serverTimestamp,
  onDisconnect, remove
} from "firebase/database";

/* ---- GAME CONSTANTS (multiplayer) ---- */
const MAX_TIME_MS = 120000;
const MAX_POINTS = 200;
const DOUBLE_POF_BONUS = 100;
const JILLA_PENALTY = 25;
const COOLDOWN_MS = 5000;
const URL_DIEREN = import.meta.env.VITE_DIERENSPEL_URL || "https://dierenspel-mtul.vercel.app/";
const PRIOR_MEAN = 80;
const PRIOR_WEIGHT = 10;
const MIN_ANS_FOR_BEST = 5;

function calcPoints(ms) {
  const p = Math.floor(MAX_POINTS * (1 - ms / MAX_TIME_MS));
  return Math.max(0, p);
}

/* --- GLOBALE CSS + Animaties --- */
const GlobalStyle = () => (
  <style>{`
    html, body, #root { height: 100%; }
    body { margin: 0; background: linear-gradient(180deg, #171717 0%, #262626 100%); color: #fff; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
    #root { width: min(100%, 720px) !important; margin-left: auto !important; margin-right: auto !important; padding: 24px 16px; box-sizing: border-box; display: block !important; float: none !important; }
    input, button, textarea { font-family: inherit; }
    .badge { display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); font-size: 12px; }
    .muted { color: rgba(255,255,255,0.7); font-size:12px; }
    .mini-hud { display:flex; gap:8px; flex-wrap:wrap; }
    @keyframes pofPop { 0%{transform:scale(0.6);opacity:0;} 20%{transform:scale(1.12);opacity:1;} 50%{transform:scale(1);} 100%{transform:scale(.9);opacity:0;} }
    .pof-toast { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 9999; }
    .pof-bubble { background: radial-gradient(circle at 30% 30%, rgba(34,197,94,0.96), rgba(16,185,129,0.92)); padding: 18px 26px; border-radius: 999px; font-size: 28px; font-weight: 800; box-shadow: 0 12px 40px rgba(0,0,0,.35); animation: pofPop 1200ms ease-out forwards; letter-spacing: .5px; }
    @keyframes jillaPulse { 0%,100%{transform:translateY(0);box-shadow:0 8px 24px rgba(251,146,60,.25);} 50%{transform:translateY(-2px);box-shadow:0 12px 34px rgba(251,146,60,.35);} }
    .jilla-banner { display:inline-flex; align-items:center; gap:10px; background: linear-gradient(90deg, #f97316, #fb923c); color:#111; font-weight:800; padding:10px 14px; border-radius:999px; border:1px solid rgba(255,255,255,.3); animation: jillaPulse 1.3s ease-in-out infinite; }
    @keyframes jillaPop { 0%{transform:translateY(6px);opacity:0;} 15%{transform:translateY(0);opacity:1;} 85%{transform:translateY(0);opacity:1;} 100%{transform:translateY(-6px);opacity:0;} }
    .jilla-toast { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 9999; pointer-events: none; }
    .jilla-bubble { background: linear-gradient(90deg, #fb923c, #f97316); color:#111; font-weight: 800; padding: 10px 14px; border-radius: 999px; box-shadow: 0 12px 28px rgba(0,0,0,.35); animation: jillaPop 1800ms ease-out forwards; }
    @keyframes scoreToast { 0%{transform:translateY(8px);opacity:0;} 15%{transform:translateY(0);opacity:1;} 85%{transform:translateY(0);opacity:1;} 100%{transform:translateY(-6px);opacity:0;} }
    .score-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 9999; pointer-events: none; animation: scoreToast 1400ms ease-out forwards; }
    .score-bubble { padding: 10px 14px; border-radius: 999px; font-weight: 800; box-shadow: 0 12px 28px rgba(0,0,0,.35); font-size: 16px; }
    .score-plus { background: linear-gradient(90deg, #22c55e, #16a34a); color: #041507; }
    .score-minus { background: linear-gradient(90deg, #ef4444, #dc2626); color: #180404; }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 9998; }
    .card { width: min(92vw, 720px); max-height: 88vh; overflow: auto; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); border-radius: 16px; padding: 16px; backdrop-filter: blur(6px); box-shadow: 0 20px 60px rgba(0,0,0,.35); }
    .table { width:100%; border-collapse: collapse; }
    .table th, .table td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.12); text-align: left; }
    .table th { font-weight: 700; }
    .hot-jilla { outline: 2px solid #fb923c; border-radius: 12px; }
  `}</style>
);

/* ---------- standaard vragen ---------- */
const DEFAULT_VRAGEN = [/* ... jouw lijst ... */];

/* ---------- styles ---------- */
const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 20, textAlign: "center", alignItems: "center" },
  header: { display: "flex", flexDirection: "column", gap: 12, alignItems: "center" },
  h1: { fontSize: 28, fontWeight: 800, margin: 0 },
  row: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "center" },
  section: { width: "100%", padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 22px rgba(0,0,0,0.3)", boxSizing: "border-box" },
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
  foot: { fontSize: 12, color: "rgba(255,255,255,0.6)" }
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
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);

// Altijd anoniem inloggen (en klaar-flag zetten)
const AUTH_READY_EVENT = "ppp-auth-ready";
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch((e) => console.error("Anon sign-in failed:", e));
  } else {
    window.dispatchEvent(new Event(AUTH_READY_EVENT));
  }
});

/* ---------- helper componenten/functies ---------- */
function Section({ title, children }) { return (<div style={styles.section}>{title && <h2 style={styles.sectionTitle}>{title}</h2>}{children}</div>); }
function Row({ children }) { return <div style={styles.row}>{children}</div>; }
function Button({ children, onClick, variant, disabled, title }) {
  let s = { ...styles.btn }; if (variant === "alt") s = { ...s, ...styles.btnAlt }; if (variant === "stop") s = { ...s, ...styles.btnStop };
  return <button onClick={onClick} title={title} style={{ ...s, opacity: disabled ? .6 : 1, cursor: disabled ? "not-allowed" : "pointer" }} disabled={disabled}>{children}</button>;
}
function DangerButton({ children, onClick }) { return <button onClick={onClick} style={styles.btnDanger}>{children}</button>; }
function TextArea({ value, onChange, placeholder }) { return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={styles.textarea} />; }

function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function splitInput(text) { return String(text || "").split(/[\n,]+/).map(s => s.trim()).filter(Boolean); }
const START_CONSONANTS = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "V", "W"];
function randomStartConsonant() { return START_CONSONANTS[Math.floor(Math.random() * START_CONSONANTS.length)]; }
function normalizeLetter(ch) { return (ch ?? "").toString().trim().toUpperCase(); }
function ordinal(n) { return `${n}e`; }
function fmtDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}
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
function canLeaveRoom(data) {
  if (!data) return true;
  if (data.solo) return true;
  if (!data.started) return true;
  if (data.finished) return true;
  return data.turn === data.hostId;
}
function hasPresence(data, pid) {
  const c = data?.presence?.[pid];
  return !!(c && typeof c === "object" && Object.keys(c).length > 0);
}

/* ---------- App ---------- */
const NAME_KEY = "ppp.playerName";
export default function PimPamPofWeb() {
  const [vragen, setVragen] = useState(() => {
    try {
      OLD_KEYS.forEach((k) => localStorage.removeItem(k));
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seeded = DEFAULT_VRAGEN.map((t) => ({ id: crypto.randomUUID(), tekst: String(t) }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch {
        const seeded = DEFAULT_VRAGEN.map((t) => ({ id: crypto.randomUUID(), tekst: String(t) }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const seeded = DEFAULT_VRAGEN.map((t) => ({ id: crypto.randomUUID(), tekst: String(t) }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      return parsed.map((v) => ({ id: v?.id || crypto.randomUUID(), tekst: String(v?.tekst ?? "") }));
    } catch {
      return DEFAULT_VRAGEN.map((t) => ({ id: crypto.randomUUID(), tekst: String(t) }));
    }
  });
  const [invoer, setInvoer] = useState("");

  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  useEffect(() => { localStorage.setItem(NAME_KEY, playerName || ""); }, [playerName]);

  // playerId = auth.uid (wacht tot anonieme login klaar is)
  const [playerId, setPlayerId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => { if (user) setPlayerId(user.uid); });
    const onReady = () => setAuthReady(true);
    window.addEventListener(AUTH_READY_EVENT, onReady);
    return () => { unsubAuth(); window.removeEventListener(AUTH_READY_EVENT, onReady); };
  }, []);

  const online = useOnline();

  // OFFLINE SOLO
  const [offlineSolo, setOfflineSolo] = useState(false);
  const [offIndex, setOffIndex] = useState(-1);
  const [offLastLetter, setOffLastLetter] = useState("?");
  const [offOrder, setOffOrder] = useState([]);
  const [offStartedAt, setOffStartedAt] = useState(null);

  function startOffline() {
    const qs = (vragen.length > 0 ? vragen.map(v => v.tekst) : DEFAULT_VRAGEN);
    if (!qs || qs.length === 0) { alert("Geen vragen beschikbaar."); return; }
    setOfflineSolo(true);
    setOffOrder(shuffle([...Array(qs.length).keys()]));
    setOffIndex(0);
    setOffLastLetter(randomStartConsonant());
    setOffStartedAt(Date.now());
    setTimeout(() => letterRef.current?.focus(), 0);
  }
  function stopOffline() { setOfflineSolo(false); setOffIndex(-1); setOffLastLetter("?"); setOffStartedAt(null); }
  function onOfflineLetterChanged(e) {
    const val = normalizeLetter(e.target.value);
    if (val.length === 1) {
      setOffLastLetter(val);
      setOffIndex(i => (i + 1) % (offOrder.length || 1));
      e.target.value = '';
    }
  }

  // ONLINE
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const roomRef = useRef(null);

  const letterRef = useRef(null);
  const connIdRef = useRef(null);

  // UI toasts
  const [pofShow, setPofShow] = useState(false);
  const [pofText, setPofText] = useState("Dubble pof!");
  function triggerPof(text = "Dubble pof!") { setPofText(text); setPofShow(true); setTimeout(() => setPofShow(false), 1200); }

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

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(vragen)); } catch {} }, [vragen]);

  /* presence per room */
  useEffect(() => {
    if (!roomCode || !playerId) return;
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
        remove(myConnRef).catch(() => {});
        connIdRef.current = null;
      }
      if (unsub) unsub();
    };
  }, [roomCode, playerId]);

  /* room listeners + self-heal */
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
      if (!data) return;

      const { offline, mustHeal } = computeHealInfo(data);
      if (!mustHeal) return;

      runTransaction(ref(db, `rooms/${code}`), (d) => {
        if (!d) return d;

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
    if (!authReady || !playerId) { alert("Nog verbinding maken… probeer zo nog eens."); return; }
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
      startedAt: null,
      startOrder: null,
      version: 5
    };
    await set(ref(db, `rooms/${code}`), obj);
    setIsHost(true);
    setRoomCode(code);
    attachRoomListener(code);

    if (autoStart) {
      const snap = await get(ref(db, `rooms/${code}`));
      const data = snap.val() || {};
      const initialOrder = Array.isArray(data.playersOrder)
        ? data.playersOrder.filter(id => data.players && data.players[id])
        : Object.keys(data.players || {});
      await update(ref(db, `rooms/${code}`), {
        started: true,
        startedAt: Date.now(),
        startOrder: initialOrder
      });
      setTimeout(() => letterRef.current?.focus(), 0);
    }
  }

  const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  function makeRoomCode(len = 5) { let s = ""; for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * (CODE_CHARS.length))]; return s; }

  async function joinRoom() {
    if (!navigator.onLine) { alert("Je bent offline — joinen kan niet."); return; }
    if (!authReady || !playerId) { alert("Nog verbinding maken…"); return; }
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
      if (data.finished == null) data.finished = false;

      const playerCount = Object.keys(data.players).length;
      if (playerCount >= 2 && data.solo) data.solo = false;

      if (!data.turn || !data.players[data.turn]) data.turn = data.playersOrder[0] || playerId;
      if (!data.hostId || !data.players[data.hostId]) data.hostId = data.playersOrder[0] || playerId;
      if (!data.phase) { data.phase = "answer"; data.turnStartAt = data.solo ? null : Date.now(); data.cooldownEndAt = null; }

      if (!data.lastLetter || data.lastLetter === "?") data.lastLetter = randomStartConsonant();
      return data;
    });

    setIsHost(false);
    setRoomCode(code);
    attachRoomListener(code);
  }

  async function finishGameAndRecord() {
    if (!roomCode || !room) return;
    if (!isHost) { alert("Alleen de host kan het potje afronden."); return; }

    const roomPath = `rooms/${roomCode}`;
    await runTransaction(ref(db, roomPath), (d) => {
      if (!d) return d;
      d.started = false;
      d.finished = true;
      d.endedAt = Date.now();
      return d;
    });

    const snap = await get(ref(db, roomPath));
    if (!snap.exists()) return;
    const rm = snap.val();

    const results = [];
    const participants = Object.keys(rm.participants || {});
    for (const pid of participants) {
      const name = rm.participants?.[pid]?.name || rm.players?.[pid]?.name || "Speler";
      const score = (rm.scores?.[pid]) ?? 0;
      const st = rm.stats?.[pid] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
      const answered = st.answeredCount || 0;
      const avgMs = answered > 0 ? (st.totalTimeMs / answered) : null;
      const adjusted = (score + PRIOR_MEAN * PRIOR_WEIGHT) / ((answered || 0) + PRIOR_WEIGHT);
      const jilla = st.jillaCount || 0;
      const dpf = st.doubleCount || 0;
      results.push({ pid, name, score, answered, avgMs, adjusted, jilla, dpf });
    }
    results.sort((a, b) => (b.adjusted - a.adjusted) || (b.score - a.score));

    const myProfilePath = `profiles/${playerId}`;
    const matchEntry = {
      roomCode,
      endedAt: rm.endedAt || Date.now(),
      you: results.find(r => r.pid === playerId) || null,
      placement: (() => { const ix = results.findIndex(r => r.pid === playerId); return ix >= 0 ? (ix + 1) : null; })(),
      players: results.map(r => ({ pid: r.pid, name: r.name, score: r.score, answered: r.answered, avgMs: r.avgMs, adjusted: Number(r.adjusted.toFixed(2)), jilla: r.jilla, dpf: r.dpf }))
    };

    await set(ref(db, `${myProfilePath}/matches/${roomCode}`), matchEntry);

    const me = matchEntry.you;
    if (me && me.answered >= MIN_ANS_FOR_BEST) {
      const hsRef = ref(db, `${myProfilePath}/localHighscore`);
      await runTransaction(hsRef, (cur) => {
        const old = cur || { bestAdjusted: 0, bestRaw: 0, bestGame: null };
        const better = !old.bestAdjusted || me.adjusted > old.bestAdjusted;
        if (better) {
          return {
            bestAdjusted: Number(me.adjusted.toFixed(2)),
            bestRaw: Number((me.score / Math.max(1, me.answered)).toFixed(2)),
            bestGame: { roomCode, endedAt: matchEntry.endedAt, score: me.score, answered: me.answered, placement: matchEntry.placement }
          };
        }
        return old;
      });
    }
  }

  async function startSpelOnline() {
    if (!navigator.onLine) { alert("Je bent offline — kan niet starten."); return; }
    if (!room || !isHost) { return; }
    const nextStartLetter = (!room.lastLetter || room.lastLetter === "?") ? randomStartConsonant() : room.lastLetter;

    const initialOrder = Array.isArray(room.playersOrder)
      ? room.playersOrder.filter(id => room.players && room.players[id])
      : Object.keys(room.players || {});
    const safeStartOrder = initialOrder.length > 0 ? initialOrder : (room.hostId ? [room.hostId] : []);

    await update(ref(db, `rooms/${roomCode}`), {
      started: true,
      finished: false,
      currentIndex: 0,
      lastLetter: nextStartLetter,
      turn: room.playersOrder?.[0] || room.hostId,
      phase: "answer",
      turnStartAt: room.solo ? null : Date.now(),
      cooldownEndAt: null,
      startedAt: Date.now(),
      startOrder: safeStartOrder
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

      if (!hasPresence(data, cand)) continue;

      const j = data.jail[cand] || 0;
      if (j > 0) { data.jail[cand] = j - 1; continue; }

      data.turn = cand;
      return cand;
    }
    data.turn = ids[(ids.indexOf(data.turn) + 1) % ids.length];
    return data.turn;
  }

  async function cancelLastAnswer() {
    if (!roomCode || !room || !room.started) return;
    const r = ref(db, `rooms/${roomCode}`);
    await runTransaction(r, (d) => {
      if (!d || d.started === false) return d;
      const act = d.lastAction;
      if (!act || act.type !== "answer") return d;
      const allowed = (act.by === playerId) || (d.hostId === playerId);
      if (!allowed) return d;

      const p = act.prev || null;
      if (!p) return d;

      d.currentIndex = p.currentIndex;
      d.lastLetter = p.lastLetter;
      d.turn = p.turn;

      d.phase = p.phase || "answer";
      d.cooldownEndAt = p.cooldownEndAt || null;
      d.turnStartAt = p.turnStartAt || (d.solo ? null : Date.now());

      if (!d.solo && p.scoreDelta) {
        if (!d.scores) d.scores = {};
        d.scores[act.by] = Math.max(0, (d.scores[act.by] || 0) - p.scoreDelta);

        if (!d.stats) d.stats = {};
        const s = d.stats[act.by] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
        if (p.statDelta) {
          s.totalTimeMs = Math.max(0, s.totalTimeMs - (p.statDelta.timeMs || 0));
          s.answeredCount = Math.max(0, s.answeredCount - (p.statDelta.answered || 0));
          if (p.statDelta.double) s.doubleCount = Math.max(0, (s.doubleCount || 0) - p.statDelta.double);
        }
        d.stats[act.by] = s;
      }

      d.lastRequired = p.lastRequired;
      d.lastAnswerBy = p.lastAnswerBy;
      d.lastAnswerWasDouble = !!p.lastAnswerWasDouble;

      d.lastAction = null;
      d.lastEvent = { type: "answer_cancelled", by: playerId, at: Date.now() };
      return d;
    });
  }
  async function pauseGame() {
    if (!roomCode || !room) return;
    await runTransaction(ref(db, `rooms/${roomCode}`), (d) => {
      if (!d || d.paused) return d;
      d.paused = true; d.pausedAt = Date.now();
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
      d.paused = false; d.pausedAt = null;
      return d;
    });
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

      const prev = {
        currentIndex: data.currentIndex,
        lastLetter: data.lastLetter,
        turn: data.turn,
        phase: data.phase,
        cooldownEndAt: data.cooldownEndAt || null,
        turnStartAt: data.turnStartAt || null,
        lastRequired: data.lastRequired || null,
        lastAnswerBy: data.lastAnswerBy || null,
        lastAnswerWasDouble: !!data.lastAnswerWasDouble,
        scoreDelta: isMP2 ? (basePoints + bonus) : 0,
        statDelta: isMP2 ? { timeMs: elapsed, answered: 1, double: isDouble ? 1 : 0 } : null,
      };

      if (isMP2) {
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

      data.lastAction = { type: "answer", by: playerId, at: Date.now(), prev };
      data.lastEvent = { type: "answer_submit", by: playerId, at: Date.now(), toTurn: data.turn };
      return data;
    });

    if (isDouble) triggerPof(`Dubble pof! +${DOUBLE_POF_BONUS}`);
    if (isMP && totalGain > 0) triggerScoreToast(`+${totalGain} punten${isDouble ? ` (incl. +${DOUBLE_POF_BONUS} bonus)` : ""}`, "plus");
  }

  async function changeLastLetter() {
    if (!roomCode || !room || !room.started) return;
    const raw = window.prompt("Nieuwe laatste letter (A–Z):", "");
    const val = normalizeLetter(raw);
    if (val.length !== 1) return;

    const couldTriggerDouble =
      !room.solo &&
      !room.lastAnswerWasDouble &&
      normalizeLetter(room.lastRequired) === val &&
      (room.lastAnswerBy === playerId || room.hostId === playerId);

    const r = ref(db, `rooms/${roomCode}`);
    await runTransaction(r, (d) => {
      if (!d || !d.started) return d;
      const isAllowed = (d.hostId === playerId) || (d.lastAnswerBy === playerId);
      if (!isAllowed) return d;

      d.lastLetter = val;
      const required = normalizeLetter(d.lastRequired);
      const nowMatches = required && required === val;

      if (!d.solo) {
        if (nowMatches && !d.lastAnswerWasDouble) {
          if (!d.scores) d.scores = {};
          d.scores[d.lastAnswerBy] = (d.scores[d.lastAnswerBy] || 0) + DOUBLE_POF_BONUS;

          if (!d.stats) d.stats = {};
          const s = d.stats[d.lastAnswerBy] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
          s.doubleCount += 1;
          d.stats[d.lastAnswerBy] = s;

          d.lastAnswerWasDouble = true;
          d.lastEvent = { type: "double_pof_correction", by: d.lastAnswerBy, at: Date.now(), letter: val };
        } else if (!nowMatches && d.lastAnswerWasDouble) {
          if (!d.scores) d.scores = {};
          d.scores[d.lastAnswerBy] = Math.max(0, (d.scores[d.lastAnswerBy] || 0) - DOUBLE_POF_BONUS);

          if (!d.stats) d.stats = {};
          const s = d.stats[d.lastAnswerBy] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
          s.doubleCount = Math.max(0, (s.doubleCount || 0) - 1);
          d.stats[d.lastAnswerBy] = s;

          d.lastAnswerWasDouble = false;
          d.lastEvent = { type: "double_pof_revoke", by: d.lastAnswerBy, at: Date.now(), letter: val };
        }
      }
      return d;
    });

    if (couldTriggerDouble) {
      triggerPof(`Dubble pof (correctie)! +${DOUBLE_POF_BONUS}`);
      triggerScoreToast(`+${DOUBLE_POF_BONUS} punten (Dubble pof correctie)`, "plus");
    }
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

      if (!data.jail) data.jail = {};
      data.jail[playerId] = (data.jail[playerId] || 0) + 1;

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

    try { await remove(ref(db, `rooms/${roomCode}/presence/${targetId}`)); } catch {}
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

  async function leaveRoom() {
    if (!roomCode) { setRoom(null); setRoomCode(""); setIsHost(false); return; }
    const r = ref(db, `rooms/${roomCode}`);
    let actuallyLeft = false;

    await runTransaction(r, (data) => {
      if (!data) return data;

      if (!canLeaveRoom(data)) {
        data.lastEvent = { type: "leave_blocked", by: playerId, at: Date.now(), reason: "gate_closed" };
        return data;
      }

      if (data.players && data.players[playerId]) delete data.players[playerId];
      if (data.jail && data.jail[playerId] != null) delete data.jail[playerId];

      if (Array.isArray(data.playersOrder)) {
        data.playersOrder = data.playersOrder.filter(id => id !== playerId && data.players && data.players[id]);
      }

      const ids = data.players ? Object.keys(data.players) : [];
      if (ids.length === 0) { actuallyLeft = true; return null; }

      if (!data.hostId || !data.players[data.hostId]) data.hostId = data.playersOrder?.[0] || ids[0];
      if (!data.turn || !data.players[data.turn] || data.turn === playerId) {
        data.turn = data.playersOrder?.[0] || data.hostId || ids[0];
      }

      actuallyLeft = true;
      return data;
    });

    if (!actuallyLeft) return;

    if (connIdRef.current) {
      const myConnRef = ref(db, `rooms/${roomCode}/presence/${playerId}/${connIdRef.current}`);
      remove(myConnRef).catch(() => {});
      connIdRef.current = null;
    }

    setRoom(null);
    setRoomCode("");
    setIsHost(false);
  }

  async function onLeaveClick() {
    if (room && isHost && room.started) {
      await finishGameAndRecord();
    } else {
      if (room && !canLeaveRoom(room)) {
        alert("Je kunt nu niet leaven. Alleen wanneer de host aan de beurt is (of het potje is klaar) mag je leaven.");
        return;
      }
    }

    if (room && !room.solo && (room.started || room.finished) && (room.participants || room.players)) {
      const snap = buildLeaderboardSnapshot(room);
      setLeaderData(snap);
      setLeaderOpen(true);
    }

    await leaveRoom();
  }

  /* cooldown -> answer */
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

  /* watchdog: skip offline beurt */
  useEffect(() => {
    if (!roomCode || !room) return;
    if (room.solo || room.paused) return;
    if (room.phase !== "answer") return;

    const currentTurn = room.turn;
    if (!currentTurn) return;

    if (!hasPresence(room, currentTurn)) {
      runTransaction(ref(db, `rooms/${roomCode}`), (data) => {
        if (!data) return data;
        if (data.solo || data.paused) return data;
        if (data.phase !== "answer") return data;
        if (!data.turn || hasPresence(data, data.turn)) return data;

        advanceTurnWithJail(data);
        data.phase = "cooldown";
        data.cooldownEndAt = Date.now() + COOLDOWN_MS;
        data.turnStartAt = null;
        data.lastEvent = { type: "auto_skip_offline", by: data.turn, at: Date.now() };
        return data;
      });
    }
  }, [roomCode, room?.turn, room?.phase, room?.paused, room]);

  /* UI helpers voor render */
  const isOnlineRoom = !!roomCode;
  const isMyTurn = isOnlineRoom && room?.turn === playerId;
  const myJailCount = isOnlineRoom && room?.jail ? (room.jail[playerId] || 0) : 0;
  const onlineQuestion = isOnlineRoom && room
    ? room.questions?.[room.order?.[room.currentIndex ?? 0] ?? 0] ?? "Vraag komt hier..."
    : null;

  const inCooldown = room?.phase === "cooldown" && !room?.solo;
  const effectiveNow = room?.paused ? (room?.pausedAt || now) : now;
  const cooldownLeftMs = Math.max(0, (room?.cooldownEndAt || 0) - effectiveNow);
  const answerElapsedMs = (!room?.solo && room?.phase === "answer" && room?.turnStartAt)
    ? Math.max(0, effectiveNow - room.turnStartAt) : 0;
  const potentialPoints = !room?.solo ? calcPoints(answerElapsedMs) : 0;

  const roundSize = (isOnlineRoom && room?.started)
    ? Math.max(1, Array.isArray(room?.startOrder) && room.startOrder.length > 0
      ? room.startOrder.length
      : Object.keys(room?.players || {}).length || 1)
    : 1;

  const currentRound = isOnlineRoom
    ? (1 + Math.floor((room?.currentIndex ?? 0) / roundSize))
    : (offlineSolo ? (1 + Math.floor(Math.max(0, offIndex) / 1)) : 0);

  const matchStartedAt = isOnlineRoom ? (room?.startedAt || room?.createdAt || null) : (offlineSolo ? offStartedAt : null);
  const matchDurationMs = matchStartedAt ? (effectiveNow - (typeof matchStartedAt === "number" ? matchStartedAt : Date.now())) : 0;

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
    const seeded = DEFAULT_VRAGEN.map((t) => ({ id: crypto.randomUUID(), tekst: String(t) }));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded)); } catch {}
    setVragen(seeded);
    alert("Standaard vragen opnieuw geladen.");
  }

  const jillaAnnounceActive = (() => {
    if (!room?.jillaLast) return false;
    const at = room.jillaLast.at || 0;
    return now - at < 2000;
  })();

  /* Profiel (match history + highscore) */
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!playerId) return;
    const profRef = ref(db, `profiles/${playerId}`);
    const off = onValue(profRef, snap => setProfile(snap.val() || null));
    return () => off();
  }, [playerId]);

  function renderProfileOverlay() {
    if (!profileOpen) return null;
    const matches = profile?.matches ? Object.values(profile.matches) : [];
    matches.sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
    const hs = profile?.localHighscore || null;
    const fmt = (ts) => { try { return new Date(ts).toLocaleString(); } catch { return "—"; } };
    const ordinal = (n) => `${n}e`;
    return (
      <div className="overlay" onClick={() => setProfileOpen(false)}>
        <div className="card" onClick={(e) => e.stopPropagation()}>
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>📜 Profiel</h2>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ margin: "8px 0" }}>🏅 Highscore</h3>
            {hs ? (
              <div className="badge" style={{ display: "inline-flex", gap: 10 }}>
                <span><b>Adjusted:</b> {Number(hs.bestAdjusted || 0).toFixed(2)}</span>
                <span><b>Raw:</b> {hs.bestRaw}</span>
                {hs.bestGame && (
                  <>
                    <span><b>Datum:</b> {fmt(hs.bestGame.endedAt)}</span>
                    {hs.bestGame.placement && <span><b>Resultaat:</b> {hs.bestGame.placement === 1 ? "Gewonnen" : `${hs.bestGame.placement}e`}</span>}
                  </>
                )}
              </div>
            ) : (
              <div className="muted">Nog geen highscore opgeslagen.</div>
            )}
          </div>
          <h3 style={{ margin: "8px 0" }}>📅 Match history</h3>
          {matches.length === 0 ? (
            <div className="muted">Nog geen gespeelde potjes opgeslagen.</div>
          ) : (
            <div style={{ maxHeight: "60vh", overflow: "auto", borderRadius: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Datum</th><th>Resultaat</th><th>Punten</th><th>Gem. tijd / vraag</th><th>Jilla</th><th>Dubble pof</th><th>Deelnemers</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(m => {
                    const you = m.you || { score: 0, answered: 0, adjusted: 0, avgMs: null, jilla: 0, dpf: 0 };
                    const placement = m.placement;
                    const result = placement === 1 ? "Gewonnen" : (placement ? ordinal(placement) : "—");
                    const avgSecs = you.avgMs == null ? "—" : `${(you.avgMs / 1000).toFixed(1)}s`;
                    const names = Array.isArray(m.players) ? m.players.map(p => p.name).join(", ") : "—";
                    return (
                      <tr key={`${m.roomCode || "room"}-${m.endedAt || Math.random()}`}>
                        <td>{fmt(m.endedAt)}</td><td>{result}</td><td>{you.score}{you.answered ? ` / ${you.answered}` : ""}</td>
                        <td>{avgSecs}</td><td>{you.jilla ?? 0}</td><td>{you.dpf ?? 0}</td><td>{names}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <Button variant="alt" onClick={() => setProfileOpen(false)}>Sluiten</Button>
          </div>
        </div>
      </div>
    );
  }
// src/App.jsx — DEEL 2/2 (vervolg en afsluiting)

  return (
    <>
      <GlobalStyle />
      <div style={styles.wrap}>
        <header style={styles.header}>
          <h1 style={styles.h1}>PimPamPof</h1>

          <Row>
            {/* Naamveld tonen als er geen spel bezig is */}
            {!room?.started && !offlineSolo && (
              <input
                style={styles.input}
                placeholder="Jouw naam"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
              />
            )}

            {/* Startscherm (geen room, geen solo) */}
            {!isOnlineRoom && !offlineSolo && (
              <>
                {!online ? (
                  <>
                    <span className="badge">alleen solo</span>
                    <Button onClick={startOffline}>Solo Mode</Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="alt"
                      onClick={() => createRoom({ autoStart: false, solo: false })}
                    >
                      Room aanmaken
                    </Button>
                    <input
                      style={styles.input}
                      placeholder="Room code"
                      value={roomCodeInput}
                      onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                    />
                    <Button variant="alt" onClick={joinRoom}>Join</Button>
                    <Button onClick={startOffline}>Solo (offline)</Button>
                    <Button onClick={() => (window.location.href = URL_DIEREN)} title="Ga naar Dierenspel">
                      ↔️ Naar Dierenspel
                    </Button>
                  </>
                )}
              </>
            )}

            {/* Solo actief */}
            {offlineSolo && (
              <Button variant="stop" onClick={stopOffline}>Stop solo</Button>
            )}

            {/* In een room */}
            {isOnlineRoom && (
              <>
                {!room?.started && (
                  <span className="badge">
                    Room: <b>{roomCode}</b>
                    <button onClick={copyRoomCode} style={{ ...styles.btn, padding: "4px 10px", marginLeft: 8 }}>
                      Kopieer
                    </button>
                  </span>
                )}
                <Button
                  variant="alt"
                  onClick={onLeaveClick}
                  disabled={room && !canLeaveRoom(room)}
                  title={room && !canLeaveRoom(room) ? "Je kunt pas leaven wanneer de host aan de beurt is." : "Leave"}
                >
                  Leave
                </Button>
              </>
            )}

            <Button variant="alt" onClick={() => setProfileOpen(true)}>📜 Profiel</Button>
          </Row>

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
                <Button onClick={changeLastLetter}>🔤 Verander letter</Button>
                {room.paused && <span className="badge">⏸️ Gepauzeerd</span>}
                {room?.lastAction?.type === "answer" && (
                  <Button variant="stop" onClick={cancelLastAnswer}>↩️ Cancel antwoord</Button>
                )}
              </>
            )}

            {!online && !offlineSolo && <span className="muted">start Solo</span>}
          </Row>

          {/* Mini-HUD (ronde + duur) */}
          {(offlineSolo || (isOnlineRoom && room?.started)) && (
            <div className="mini-hud" style={{ marginTop: 6 }}>
              <span className="badge">🧭 Ronde: <b>{currentRound}</b></span>
              <span className="badge">⏳ Duur <b>{fmtDuration(matchDurationMs)}</b></span>
            </div>
          )}
        </header>

        {/* Vraagbeheer (alleen wanneer er geen spel loopt of host pre-game) */}
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
                  <Button variant="stop" onClick={resetStandaardVragen}>
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

        {/* Solo (offline) UI */}
        {offlineSolo && (
          <Section>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div className="badge">Solo</div>

              <div style={{ fontSize: 18 }}>
                Laatste letter: <span style={{ fontWeight: 700 }}>{offLastLetter}</span>
              </div>
              <div style={{ fontSize: 22, minHeight: "3rem" }}>
                {(() => {
                  const qs = (vragen.length > 0 ? vragen.map(v => v.tekst) : DEFAULT_VRAGEN);
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

        {/* Online game UI */}
        {isOnlineRoom && room?.started && (
          <Section>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div className="badge">
                Room: <b>{roomCode}</b>
                <button onClick={copyRoomCode} style={{ ...styles.btn, padding: "4px 10px", marginLeft: 8 }}>
                  Kopieer
                </button>
              </div>

              {/* Jilla toast */}
              {(() => {
                const active = (() => {
                  if (!room?.jillaLast) return false;
                  const at = room.jillaLast.at || 0;
                  return Date.now() - at < 2000;
                })();
                return active && room?.jillaLast?.name ? (
                  <div className="jilla-toast">
                    <div className="jilla-bubble">🔒 {room.jillaLast.name} gebruikte Jilla!</div>
                  </div>
                ) : null;
              })()}

              {/* Jilla banner als het jouw beurt is en je in 'jail' zit */}
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

        {/* Spelerslijst */}
        {isOnlineRoom && room?.participants && (
          <Section title="Spelers">
            <ul style={styles.list}>
              {(Array.isArray(room.playersOrder) ? room.playersOrder : Object.keys(room.players || {}))
                .filter((id) => !!(room.players && room.players[id]))
                .map((id, idx) => {
                  const pName = (room.participants?.[id]?.name) || (room.players?.[id]?.name) || "Speler";
                  const active = room.turn === id;
                  const jcount = (room.jail && room.jail[id]) || 0;
                  const showKick = id !== (playerId || "");
                  const score = (!room.solo && room.scores && room.scores[id]) || 0;
                  const hot = room?.jillaLast?.pid === id && (Date.now() - (room?.jillaLast?.at || 0) < 2000);
                  const onlineNow = hasPresence(room, id);

                  return (
                    <li key={id} className={hot ? "hot-jilla" : ""} style={{ ...styles.li, ...(active ? { background: "rgba(22,163,74,0.18)" } : {}) }}>
                      <div style={styles.liText}>
                        {idx + 1}. {pName}{room?.hostId === id ? " (host)" : ""}{" "}
                        {onlineNow ? <span className="badge" style={{ marginLeft: 6 }}>🟢 online</span> : <span className="badge" style={{ marginLeft: 6 }}>⚫ offline</span>}
                        {room?.lastRatingDelta && room.lastRatingDelta[id] != null && (
                          <span className="badge" style={{ marginLeft: 6 }}>
                            Δ {room.lastRatingDelta[id] > 0 ? `+${room.lastRatingDelta[id]}` : room.lastRatingDelta[id]}
                          </span>
                        )}
                        {jcount > 0 && <span className="badge" style={{ marginLeft: 6 }}>🔒 Jilla x{jcount}</span>}
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

      {/* Dubble Pof toast */}
      {pofShow && (
        <div className="pof-toast">
          <div className="pof-bubble">{pofText}</div>
        </div>
      )}

      {/* Score toast */}
      {scoreToast.show && (
        <div className="score-toast">
          <div className={`score-bubble ${scoreToast.type === "minus" ? "score-minus" : "score-plus"}`}>
            {scoreToast.text}
          </div>
        </div>
      )}

      {/* Leaderboard-overlay */}
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

      {/* Profiel-overlay */}
      {renderProfileOverlay()}
    </>
  );
}

