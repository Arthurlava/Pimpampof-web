// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  ref, onValue, set, update, get, runTransaction, serverTimestamp,
  onDisconnect, remove
} from "firebase/database";
import "./styles/global.css";
import { auth, db, AUTH_READY_EVENT } from "./config/firebase";
import {
  COOLDOWN_MS,
  DOUBLE_POF_BONUS,
  JILLA_PENALTY,
  MAX_TIME_MS,
  MIN_ANS_FOR_BEST,
  NAME_KEY,
  OFFLINE_MULTI_MAX_PLAYERS,
  PRIOR_MEAN,
  PRIOR_WEIGHT,
  STALE_ROOM_MS,
  URL_DIEREN,
  WHATS_NEW_COLLAPSE_KEY,
  WORDCHECK_AI_ENDPOINT,
} from "./config/constants";
import { WHATS_NEW } from "./data/whatsNew";
import { styles } from "./styles/styles";
import { Button } from "./components/common/Button";
import { DangerButton } from "./components/common/DangerButton";
import { Row } from "./components/common/Row";
import { Section } from "./components/common/Section";
import { useOnline } from "./hooks/useOnline";
import { useQuestions } from "./hooks/useQuestions";
import { WhatsNewPanel } from "./components/home/WhatsNewPanel";
import { SettingsOverlay } from "./components/home/SettingsOverlay";
import { MainMenuPanel } from "./components/home/MainMenuPanel";
import { QuestionManager } from "./components/questions/QuestionManager";
import { RoomBrowser } from "./components/online/RoomBrowser";
import { BottomScoreBar } from "./components/online/BottomScoreBar";
import { ProfileOverlay } from "./components/profile/ProfileOverlay";
import { WordCheckOverlay } from "./components/word-check/WordCheckOverlay";
import { OfflineMultiSetup } from "./components/offline/OfflineMultiSetup";
import { OfflineResultOverlay } from "./components/offline/OfflineResultOverlay";
import { LeaderboardOverlay } from "./components/feedback/LeaderboardOverlay";
import { PofToast } from "./components/feedback/PofToast";
import { ScoreToast } from "./components/feedback/ScoreToast";
import {
  calcPoints,
  canLeaveRoom,
  clampInt,
  fmtDuration,
  hasPresence,
  normalizeLetter,
  randomStartConsonant,
  shuffle,
  createId,
} from "./utils/gameUtils";
import {
  checkWordViaAiEndpoint,
  checkWordViaNlWiktionary,
  normalizeWordForCheck,
} from "./utils/wordCheck";

/* ---------- App ---------- */
export default function PimPamPofWeb() {
  const {
    vragen,
    activeQuestions,
    selectedGameQuestions,
    visibleQuestions,
    categories,
    selectedCategory,
    setSelectedCategory,
    newQuestionCategory,
    setNewQuestionCategory,
    newCategoryName,
    setNewCategoryName,
    voegCategorieToe,
    invoer,
    setInvoer,
    voegVragenToe,
    verwijderVraag,
    toggleVraagActief,
    veranderVraagCategorie,
    kopieerAlle,
    resetStandaardVragen,
  } = useQuestions();

  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  useEffect(() => { localStorage.setItem(NAME_KEY, playerName || ""); }, [playerName]);

  const [theme, setTheme] = useState(() => localStorage.getItem("ppp.theme") || "green");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [offlineResult, setOfflineResult] = useState(null);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem("ppp.theme", theme);
  }, [theme]);

  // playerId = auth.uid (wacht tot anonieme login klaar is)
  const [playerId, setPlayerId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => { if (user) setPlayerId(user.uid); });
    const onReady = () => setAuthReady(true);
    window.addEventListener(AUTH_READY_EVENT, onReady);
    return () => {
      unsubAuth();
      window.removeEventListener(AUTH_READY_EVENT, onReady);
    };
  }, []);

  const online = useOnline();
const [whatsOpen, setWhatsOpen] = useState(() => {
  try { return localStorage.getItem(WHATS_NEW_COLLAPSE_KEY) !== "1"; } catch { return true; }
});
useEffect(() => {
  try { localStorage.setItem(WHATS_NEW_COLLAPSE_KEY, whatsOpen ? "0" : "1"); } catch { /* localStorage kan onbeschikbaar zijn */ }
}, [whatsOpen]);

// OFFLINE SOLO
const [offlineSolo, setOfflineSolo] = useState(false);
const [offIndex, setOffIndex] = useState(-1);
const [offLastLetter, setOffLastLetter] = useState("?");
const [offOrder, setOffOrder] = useState([]);
const [offStartedAt, setOffStartedAt] = useState(null);

const [offTurnStartAt, setOffTurnStartAt] = useState(null);
const [offScore, setOffScore] = useState(0);
const [offAnswered, setOffAnswered] = useState(0);
const [offTotalTimeMs, setOffTotalTimeMs] = useState(0);
const [offJillaCount, setOffJillaCount] = useState(0);
const [offDoubleCount, setOffDoubleCount] = useState(0);

function startOffline() {
  const qs = getSeedQuestions();
  if (!qs.length) { alert("Geen actieve vragen beschikbaar voor deze categorie."); return; }

  setOfflineSolo(true);
  setOffOrder(shuffle([...Array(qs.length).keys()]));
  setOffIndex(0);
  setOffLastLetter(randomStartConsonant());
  const t = Date.now();
  setOffStartedAt(t);

  setOffTurnStartAt(t);
  setOffScore(0);
  setOffAnswered(0);
  setOffTotalTimeMs(0);
  setOffJillaCount(0);
  setOffDoubleCount(0);

  setTimeout(() => letterRef.current?.focus(), 0);
}

function stopOffline() {
  if (offlineSolo) {
    setOfflineResult({
      type: "solo",
      score: offScore,
      answered: offAnswered,
      totalTimeMs: offTotalTimeMs,
      jilla: offJillaCount,
      doublePof: offDoubleCount,
    });
  }

  setOfflineSolo(false);
  setOffIndex(-1);
  setOffLastLetter("?");
  setOffStartedAt(null);
  setOffTurnStartAt(null);
}

function onOfflineLetterChanged(e) {
  const val = normalizeLetter(e.target.value);
  if (val.length !== 1) return;

  const required = normalizeLetter(offLastLetter);
  const isDouble = required && required !== "?" && val === required;

  const elapsed = Math.max(0, Date.now() - (offTurnStartAt ?? Date.now()));
  const basePoints = calcPoints(elapsed);
  const bonus = isDouble ? DOUBLE_POF_BONUS : 0;
  const gain = basePoints + bonus;

  setOffScore(s => s + gain);
  setOffAnswered(c => c + 1);
  setOffTotalTimeMs(t => t + elapsed);
  if (isDouble) setOffDoubleCount(c => c + 1);

  setOffLastLetter(val);
  setOffIndex(i => (i + 1) % (offOrder.length || 1));
  setOffTurnStartAt(Date.now());

  if (isDouble) triggerPof(`Dubble pof! +${DOUBLE_POF_BONUS}`);
  if (gain > 0) {
    triggerScoreToast(
      `+${gain} punten${isDouble ? ` (incl. +${DOUBLE_POF_BONUS} bonus)` : ""}`,
      "plus"
    );
  }

  e.target.value = "";
}

function offlineJilla() {
  if (!offlineSolo) return;
  if (!offOrder || offOrder.length === 0) return;

  setOffScore(s => s - JILLA_PENALTY);
  setOffJillaCount(c => c + 1);
  setOffIndex(i => (i + 1) % (offOrder.length || 1));
  setOffTurnStartAt(Date.now());

  triggerScoreToast(`-${JILLA_PENALTY} punten (Jilla)`, "minus");
}
// OFFLINE MULTIPLAYER (cooldown = doorgeef-moment; geen apart scherm)
const [offlineMulti, setOfflineMulti] = useState(false);
const [offmSetupOpen, setOffmSetupOpen] = useState(false);
const [offmPlayerCount, setOffmPlayerCount] = useState(2);
const [offmNames, setOffmNames] = useState(() => [playerName || "", ""]);

const [offmPlayers, setOffmPlayers] = useState([]); // [{ id, name }]
const [offmOrder, setOffmOrder] = useState([]);
const [offmIndex, setOffmIndex] = useState(-1);
const [offmLastLetter, setOffmLastLetter] = useState("?");
const [offmPhase, setOffmPhase] = useState("answer"); // "answer" | "cooldown"
const [offmTurnIx, setOffmTurnIx] = useState(0);
const [offmTurnStartAt, setOffmTurnStartAt] = useState(null);
const [offmCooldownEndAt, setOffmCooldownEndAt] = useState(null);
const [offmStartedAt, setOffmStartedAt] = useState(null);

const [offmScores, setOffmScores] = useState({});
const [offmStats, setOffmStats] = useState({});
const [offmJail, setOffmJail] = useState({});
const [offmJillaLast, setOffmJillaLast] = useState(null);


function openOfflineMultiSetup() {
  if (offlineSolo || offlineMulti) return;
  if (roomCode) return; // niet tegelijk met online room
  setOffmPlayerCount(2);
  setOffmNames([playerName || "", ""]);
  setOffmSetupOpen(true);
}

function stopOfflineMulti() {
  if (offlineMulti && offmPlayers.length > 0) {
    const players = offmPlayers.map((player) => {
      const stats = offmStats[player.id] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
      return {
        id: player.id,
        name: player.name,
        score: offmScores[player.id] || 0,
        totalTimeMs: stats.totalTimeMs || 0,
        answered: stats.answeredCount || 0,
        jilla: stats.jillaCount || 0,
        doublePof: stats.doubleCount || 0,
      };
    }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    setOfflineResult({ type: "multi", players });
  }

  setOfflineMulti(false);
  setOffmSetupOpen(false);
  setOffmPlayers([]);
  setOffmOrder([]);
  setOffmIndex(-1);
  setOffmLastLetter("?");
  setOffmPhase("answer");
  setOffmTurnIx(0);
  setOffmTurnStartAt(null);
  setOffmCooldownEndAt(null);
  setOffmStartedAt(null);
  setOffmScores({});
  setOffmStats({});
  setOffmJail({});
  setOffmJillaLast(null);
}

function computeNextTurnIxWithJail(players, currentIx, jailMap) {
  const len = players.length;
  if (len <= 1) return { nextIx: 0, nextJail: { ...(jailMap || {}) } };

  const nextJail = { ...(jailMap || {}) };
  let idx = clampInt(currentIx, 0, len - 1);

  for (let tries = 0; tries < len; tries++) {
    idx = (idx + 1) % len;
    const pid = players[idx].id;
    const j = nextJail[pid] || 0;
    if (j > 0) {
      nextJail[pid] = j - 1;
      continue;
    }
    return { nextIx: idx, nextJail };
  }

  return { nextIx: (currentIx + 1) % len, nextJail };
}

function startOfflineMultiFromSetup() {
const n = clampInt(offmPlayerCount, 2, OFFLINE_MULTI_MAX_PLAYERS);
  const rawNames = (offmNames || []).slice(0, n).map(s => String(s || "").trim());
  const names = rawNames.map((nm, i) => nm || `Speler ${i + 1}`);
  const players = names.map(name => ({ id: createId(), name }));

  const qs = getSeedQuestions();
  if (!qs.length) { alert("Geen actieve vragen beschikbaar voor deze categorie."); return; }

  const initScores = {};
  const initStats = {};
  for (const p of players) {
    initScores[p.id] = 0;
    initStats[p.id] = { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
  }

  const t = Date.now();

  setOfflineMulti(true);
  setOffmPlayers(players);
  setOffmScores(initScores);
  setOffmStats(initStats);
  setOffmJail({});

  setOffmOrder(shuffle([...Array(qs.length).keys()]));
  setOffmIndex(0);

  setOffmLastLetter(randomStartConsonant());
  setOffmTurnIx(0);

  setOffmPhase("answer");
  setOffmTurnStartAt(t);
  setOffmCooldownEndAt(null);
  setOffmStartedAt(t);

  setOffmJillaLast(null);
  setOffmSetupOpen(false);

  setTimeout(() => letterRef.current?.focus(), 0);
}

function beginOffmCooldown() {
  setOffmPhase("cooldown");
  setOffmCooldownEndAt(Date.now() + COOLDOWN_MS);
  setOffmTurnStartAt(null);
}

function onOfflineMultiLetterChanged(e) {
  const val = normalizeLetter(e.target.value);
  if (val.length !== 1) return;

  if (!offlineMulti || offmPhase !== "answer") { e.target.value = ""; return; }
  if (!offmPlayers.length || !offmOrder.length) { e.target.value = ""; return; }

  const cur = offmPlayers[clampInt(offmTurnIx, 0, offmPlayers.length - 1)];
  const nowTs = Date.now();
  const elapsed = Math.max(0, nowTs - (offmTurnStartAt ?? nowTs));

  const required = normalizeLetter(offmLastLetter);
  const isDouble = required && required !== "?" && val === required;
  const basePoints = calcPoints(elapsed);
  const bonus = isDouble ? DOUBLE_POF_BONUS : 0;
  const gain = basePoints + bonus;

  setOffmScores(s => ({ ...s, [cur.id]: (s[cur.id] || 0) + gain }));
  setOffmStats(st => {
    const prev = st[cur.id] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
    return {
      ...st,
      [cur.id]: {
        totalTimeMs: prev.totalTimeMs + elapsed,
        answeredCount: prev.answeredCount + 1,
        jillaCount: prev.jillaCount || 0,
        doubleCount: (prev.doubleCount || 0) + (isDouble ? 1 : 0)
      }
    };
  });

  setOffmLastLetter(val);
  setOffmIndex(i => (i + 1) % (offmOrder.length || 1));

  const { nextIx, nextJail } = computeNextTurnIxWithJail(offmPlayers, offmTurnIx, offmJail);
  setOffmJail(nextJail);
  setOffmTurnIx(nextIx);

  beginOffmCooldown();

  if (isDouble) triggerPof(`Dubble pof! +${DOUBLE_POF_BONUS}`);
  if (gain > 0) {
    triggerScoreToast(
      `+${gain} punten${isDouble ? ` (incl. +${DOUBLE_POF_BONUS} bonus)` : ""}`,
      "plus"
    );
  }

  e.target.value = "";
}

function offlineMultiJilla() {
  if (!offlineMulti || offmPhase !== "answer") return;
  if (!offmPlayers.length || !offmOrder.length) return;

  const cur = offmPlayers[clampInt(offmTurnIx, 0, offmPlayers.length - 1)];

  setOffmScores(s => ({ ...s, [cur.id]: (s[cur.id] || 0) - JILLA_PENALTY }));
  setOffmStats(st => {
    const prev = st[cur.id] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
    return {
      ...st,
      [cur.id]: {
        totalTimeMs: prev.totalTimeMs || 0,
        answeredCount: prev.answeredCount || 0,
        jillaCount: (prev.jillaCount || 0) + 1,
        doubleCount: prev.doubleCount || 0
      }
    };
  });

  const jailNext = { ...(offmJail || {}) };
  jailNext[cur.id] = (jailNext[cur.id] || 0) + 1;

  const { nextIx, nextJail } = computeNextTurnIxWithJail(offmPlayers, offmTurnIx, jailNext);
  setOffmJail(nextJail);
  setOffmTurnIx(nextIx);

  setOffmIndex(i => (i + 1) % (offmOrder.length || 1));

  setOffmJillaLast({ id: cur.id, name: cur.name, at: Date.now() });
  beginOffmCooldown();

  triggerScoreToast(`-${JILLA_PENALTY} punten (Jilla)`, "minus");
}
const [wordCheckOpen, setWordCheckOpen] = useState(false);
const [wordCheckWord, setWordCheckWord] = useState("");
const [wordCheckBusy, setWordCheckBusy] = useState(false);
const [wordCheckError, setWordCheckError] = useState("");
const [wordCheckResult, setWordCheckResult] = useState(null); // { exists, source, url, note? }
const [wordCheckPreferAi, setWordCheckPreferAi] = useState(false);
const wordCheckAbortRef = useRef(null);

function openWordCheck() {
  setWordCheckOpen(true);
  setWordCheckWord("");
  setWordCheckBusy(false);
  setWordCheckError("");
  setWordCheckResult(null);
  setWordCheckPreferAi(false);
}

function closeWordCheck() {
  setWordCheckOpen(false);
  setWordCheckBusy(false);
  setWordCheckError("");
  setWordCheckResult(null);
  if (wordCheckAbortRef.current) {
    wordCheckAbortRef.current.abort();
    wordCheckAbortRef.current = null;
  }
}

async function runWordCheck() {
  const w = normalizeWordForCheck(wordCheckWord);
  if (!w) {
    setWordCheckError("Voer een woord in.");
    setWordCheckResult(null);
    return;
  }
  if (!online) {
    setWordCheckError("Je bent offline — woord check kan niet.");
    setWordCheckResult(null);
    return;
  }

  setWordCheckBusy(true);
  setWordCheckError("");
  setWordCheckResult(null);

  if (wordCheckAbortRef.current) wordCheckAbortRef.current.abort();
  const ctrl = new AbortController();
  wordCheckAbortRef.current = ctrl;

  try {
    let res = null;

    if (wordCheckPreferAi && WORDCHECK_AI_ENDPOINT) {
      try {
        res = await checkWordViaAiEndpoint(w, WORDCHECK_AI_ENDPOINT, ctrl.signal);
      } catch {
        res = null;
      }
    }

    if (!res) {
      res = await checkWordViaNlWiktionary(w, ctrl.signal);
    }

    setWordCheckResult(res);
  } catch (e) {
    if (e?.name !== "AbortError") {
      setWordCheckError("Kon woord niet controleren (netwerk/API).");
    }
  } finally {
    setWordCheckBusy(false);
  }
}




  // ONLINE
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const [roomBrowserOpen, setRoomBrowserOpen] = useState(false);
  const [roomListLoading, setRoomListLoading] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);

  const letterRef = useRef(null);
  const connIdRef = useRef(null);
  const roomUnsubRef = useRef(null); // holds onValue unsubscribe

  // UI toasts
  const [pofShow, setPofShow] = useState(false);
  const [pofText, setPofText] = useState("Dubble pof!");
  function triggerPof(text = "Dubble pof!") {
    setPofText(text);
    setPofShow(true);
    setTimeout(() => setPofShow(false), 1200);
  }

  const [scoreToast, setScoreToast] = useState({ show: false, text: "", type: "plus" });
  function triggerScoreToast(text, type = "plus") {
    setScoreToast({ show: true, text, type });
    setTimeout(() => setScoreToast(s => ({ ...s, show: false })), 1400);
  }

  // Timer tick
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  // Leaderboard overlay
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [leaderData, setLeaderData] = useState(null);



  /* presence per room */
  useEffect(() => {
    if (!roomCode || !playerId) return;
    const connectedRef = ref(db, ".info/connected");
    const unsub = onValue(connectedRef, snap => {
      if (snap.val() === true) {
        const connId = createId();
        connIdRef.current = connId;
        const myConnRef = ref(db, `rooms/${roomCode}/presence/${playerId}/${connId}`);
        set(myConnRef, serverTimestamp());
        onDisconnect(myConnRef).remove();
      }
    });
    return () => {
      if (connIdRef.current) {
        const myConnRef = ref(db, `rooms/${roomCode}/presence/${playerId}/${connIdRef.current}`);
        remove(myConnRef).catch((err) => console.warn("Kon presence niet verwijderen", err));
        connIdRef.current = null;
      }
      if (unsub) unsub();
    };
  }, [roomCode, playerId]);

  /* room listeners + self-heal */
 function computeHealInfo(data) {
  const players = data.players ? Object.keys(data.players) : [];
  const order = Array.isArray(data.playersOrder) ? data.playersOrder : players;
  const orderFiltered = order.filter((id) => players.includes(id));

  const hostOk = data.hostId && players.includes(data.hostId);
  const turnOk = data.turn && players.includes(data.turn);

  const mustHeal =
    players.length === 0 ||
    orderFiltered.length !== order.length ||
    !hostOk ||
    !turnOk;

  return { mustHeal };
}

function attachRoomListener(code) {
  if (roomUnsubRef.current) {
    roomUnsubRef.current();
    roomUnsubRef.current = null;
  }

  const r = ref(db, `rooms/${code}`);
  const unsub = onValue(r, (snap) => {
    const data = snap.val() ?? null;
    setRoom(data);
    setIsHost(!!data && data.hostId === playerId);
    if (!data) return;

    const { mustHeal } = computeHealInfo(data);
    if (!mustHeal) return;

    runTransaction(r, (d) => {
      if (!d) return d;

      const ids = d.players ? Object.keys(d.players) : [];
      if (ids.length === 0) return null;

      d.playersOrder = (Array.isArray(d.playersOrder) ? d.playersOrder : ids).filter((id) => ids.includes(id));
      if (d.playersOrder.length === 0) d.playersOrder = ids;

      if (!d.hostId || !ids.includes(d.hostId)) d.hostId = d.playersOrder[0] || ids[0];
      if (!d.turn || !ids.includes(d.turn)) d.turn = d.playersOrder[0] || d.hostId;

      if (d.jail) {
        for (const jid of Object.keys(d.jail)) {
          if (!d.players[jid]) delete d.jail[jid];
        }
      }

      d.lastActivityAt = Date.now();
      return d;
    });
  });

  roomUnsubRef.current = unsub;
}


  function getSeedQuestions() {
    return selectedGameQuestions.map((question) => question.tekst).filter(Boolean);
  }

  async function createRoom({ autoStart = false, solo = false } = {}) {
    if (!authReady || !playerId) {
      alert("Nog verbinding maken… probeer zo nog eens.");
      return;
    }
    if (!navigator.onLine && !solo) {
      alert("Je bent offline — multiplayer kan niet.");
      return;
    }

    const code = makeRoomCode();
    const qs = getSeedQuestions();
    if (!qs.length) { alert("Geen actieve vragen beschikbaar voor deze categorie."); return; }
    const order = shuffle([...Array(qs.length).keys()]);
    const playersOrder = [playerId];

    const obj = {
      createdAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(), // activiteit start hier
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
      phase: "answer",
      turnStartAt: solo ? null : Date.now(),
      cooldownEndAt: null,
      startedAt: null,
      startOrder: null,
      version: 5
    };

    const path = `rooms/${code}`;
    await set(ref(db, path), obj);

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
        startOrder: initialOrder,
        lastActivityAt: Date.now()
      });
      setTimeout(() => letterRef.current?.focus(), 0);
    }
  }

  const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  function makeRoomCode(len = 5) {
    let s = "";
    for (let i = 0; i < len; i++) {
      s += CODE_CHARS[Math.floor(Math.random() * (CODE_CHARS.length))];
    }
    return s;
  }

  async function joinRoom(codeOverride) {
    if (!navigator.onLine) { alert("Je bent offline — joinen kan niet."); return; }
    if (!authReady || !playerId) { alert("Nog verbinding maken…"); return; }
    const code = (codeOverride ?? roomCodeInput ?? "").trim().toUpperCase();
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
      if (!data.phase) {
        data.phase = "answer";
        data.turnStartAt = data.solo ? null : Date.now();
        data.cooldownEndAt = null;
      }

      if (!data.lastLetter || data.lastLetter === "?") data.lastLetter = randomStartConsonant();

      // join is activiteit
      data.lastActivityAt = Date.now();

      return data;
    });

    setIsHost(false);
    setRoomCode(code);
    setRoomCodeInput(code);
    setRoomBrowserOpen(false);
    attachRoomListener(code);
  }

  async function loadAvailableRooms() {
    if (!authReady || !playerId) {
      console.log("[RoomBrowser] Auth nog niet klaar, geen rooms geladen.");
      return;
    }

    setRoomListLoading(true);
    try {
      const snap = await get(ref(db, "rooms"));

      if (!snap.exists()) {
        console.log("[RoomBrowser] Geen rooms node gevonden.");
        setAvailableRooms([]);
        return;
      }

      const raw = snap.val() || {};
      console.log("[RoomBrowser] raw rooms:", raw);

      const now = Date.now();

      const list = await Promise.all(
        Object.entries(raw).map(async ([code, data]) => {
          if (!data) return null;

          const players = data.players || {};
          const presence = data.presence || {};

          const playerIds = Object.keys(players);
          const playerCount = playerIds.length;

          // check of er IEMAND online is
          let hasOnline = false;
          for (const pid of Object.keys(presence)) {
            const conns = presence[pid];
            if (conns && typeof conns === "object" && Object.keys(conns).length > 0) {
              hasOnline = true;
              break;
            }
          }

          // laatste activiteit bepalen
          const lastActivity =
            data.lastActivityAt ||
            (data.lastEvent && data.lastEvent.at) ||
            data.endedAt ||
            data.startedAt ||
            data.createdAt ||
            0;

          const ageMs = lastActivity ? now - lastActivity : Number.POSITIVE_INFINITY;

          // als niemand online en ouder dan 4 minuten: opruimen
          if (!hasOnline && ageMs > STALE_ROOM_MS) {
            console.log("[RoomBrowser] verwijder stale room", code, "ageMs=", ageMs);
            try {
              await remove(ref(db, `rooms/${code}`));
            } catch (err) {
              console.warn("[RoomBrowser] kon stale room niet verwijderen:", code, err);
            }
            return null; // niet tonen
          }

          // alleen nog actieve / recente rooms over
          const onlineNames = playerIds
            .filter((pid) => {
              const p = presence[pid];
              return p && typeof p === "object" && Object.keys(p).length > 0;
            })
            .map((pid) => players[pid]?.name || "Speler");

          return {
            code,
            started: !!data.started,
            finished: !!data.finished,
            playerCount,
            hostName:
              data.participants?.[data.hostId]?.name ||
              data.players?.[data.hostId]?.name ||
              "Host",
            onlineNames,
          };
        })
      );

      const filtered = list
        .filter(Boolean)
        .filter((r) => !r.finished && r.playerCount > 0)
        .sort((a, b) => {
          if (a.started === b.started) return 0;
          return a.started ? -1 : 1;
        });

      console.log("[RoomBrowser] parsed list:", filtered);
      setAvailableRooms(filtered);
    } catch (err) {
      console.error("Kon rooms niet laden:", err);
      setAvailableRooms([]);
    } finally {
      setRoomListLoading(false);
    }
  }

  function openRoomBrowser() {
    if (!navigator.onLine) {
      alert("Je bent offline — kan geen rooms ophalen.");
      return;
    }

    if (!authReady || !playerId) {
      alert("Nog verbinding maken met Firebase… probeer het over een paar seconden opnieuw.");
      return;
    }

    setRoomBrowserOpen(true);
    loadAvailableRooms();
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
      d.lastActivityAt = Date.now();
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
      placement: (() => {
        const ix = results.findIndex(r => r.pid === playerId);
        return ix >= 0 ? (ix + 1) : null;
      })(),
      players: results.map(r => ({
        pid: r.pid,
        name: r.name,
        score: r.score,
        answered: r.answered,
        avgMs: r.avgMs,
        adjusted: Number(r.adjusted.toFixed(2)),
        jilla: r.jilla,
        dpf: r.dpf
      }))
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
            bestGame: {
              roomCode,
              endedAt: matchEntry.endedAt,
              score: me.score,
              answered: me.answered,
              placement: matchEntry.placement
            }
          };
        }
        return old;
      });
    }
  }

  async function startSpelOnline() {
    if (!navigator.onLine) { alert("Je bent offline — kan niet starten."); return; }
    if (!room || !isHost) return;

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
      turnStartAt: Date.now(),
      cooldownEndAt: null,
      startedAt: Date.now(),
      startOrder: safeStartOrder,
      lastActivityAt: Date.now()
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
    if (j > 0) {
      data.jail[cand] = j - 1;
      continue;
    }

    data.turn = cand;
    return cand;
  }

  data.turn = ids[(Math.max(0, ids.indexOf(data.turn)) + 1) % ids.length];
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
      d.turnStartAt = (p.turnStartAt != null) ? p.turnStartAt : Date.now();

if (p.scoreDelta) {
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
      d.lastActivityAt = Date.now();
      return d;
    });
  }

  async function pauseGame() {
    if (!roomCode || !room) return;
    await runTransaction(ref(db, `rooms/${roomCode}`), (d) => {
      if (!d || d.paused) return d;
      d.paused = true;
      d.pausedAt = Date.now();
      d.lastActivityAt = Date.now();
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
      d.lastActivityAt = Date.now();
      return d;
    });
  }

async function submitLetterOnline(letter) {
  if (!room || room.paused) return;

  const elapsedUi = room?.turnStartAt ? Math.max(0, Date.now() - room.turnStartAt) : 0;
  const basePointsUi = calcPoints(elapsedUi);
  const requiredUi = normalizeLetter(room?.lastLetter);
  const isDoubleUi = requiredUi && requiredUi !== "?" && normalizeLetter(letter) === requiredUi;
  const bonusUi = isDoubleUi ? DOUBLE_POF_BONUS : 0;
  const totalGainUi = basePointsUi + bonusUi;

  const r = ref(db, `rooms/${roomCode}`);
  await runTransaction(r, (data) => {
    if (!data || data.paused) return data;

    if (!data.players || !data.players[data.turn]) {
      const ids = data.players ? Object.keys(data.players) : [];
      if (!ids.length) return null;
      data.playersOrder = (Array.isArray(data.playersOrder) ? data.playersOrder : ids).filter(id => ids.includes(id));
      data.turn = data.playersOrder[0] || ids[0];
    }

    if (data.turn !== playerId) return data;
    if (data.phase !== "answer") return data;

    const listLen = (data.order?.length ?? 0);
    if (!listLen) return data;

    const required = normalizeLetter(data.lastLetter);
    const isDouble = required && required !== "?" && normalizeLetter(letter) === required;

    const elapsed = data.turnStartAt ? Math.max(0, Date.now() - data.turnStartAt) : 0;
    const basePoints = calcPoints(elapsed);
    const bonus = isDouble ? DOUBLE_POF_BONUS : 0;
    const scoreDelta = basePoints + bonus;

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
      scoreDelta,
      statDelta: { timeMs: elapsed, answered: 1, double: isDouble ? 1 : 0 },
    };

    if (!data.scores) data.scores = {};
    data.scores[playerId] = (data.scores[playerId] || 0) + scoreDelta;

    if (!data.stats) data.stats = {};
    const s = data.stats[playerId] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
    s.totalTimeMs += elapsed;
    s.answeredCount += 1;
    if (isDouble) s.doubleCount += 1;
    data.stats[playerId] = s;

    data.lastRequired = required || null;
    data.lastAnswerBy = playerId;
    data.lastAnswerWasDouble = !!isDouble;

    data.lastLetter = letter;
    data.currentIndex = (data.currentIndex + 1) % listLen;

    advanceTurnWithJail(data);

    if (data.solo) {
      data.phase = "answer";
      data.turnStartAt = Date.now();
      data.cooldownEndAt = null;
    } else {
      data.phase = "cooldown";
      data.cooldownEndAt = Date.now() + COOLDOWN_MS;
      data.turnStartAt = null;
    }

    data.lastAction = { type: "answer", by: playerId, at: Date.now(), prev };
    data.lastEvent = { type: "answer_submit", by: playerId, at: Date.now(), toTurn: data.turn };
    data.lastActivityAt = Date.now();
    return data;
  });

  if (isDoubleUi) triggerPof(`Dubble pof! +${DOUBLE_POF_BONUS}`);
  if (totalGainUi > 0) {
    triggerScoreToast(
      `+${totalGainUi} punten${isDoubleUi ? ` (incl. +${DOUBLE_POF_BONUS} bonus)` : ""}`,
      "plus"
    );
  }
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
          d.lastEvent = {
            type: "double_pof_correction",
            by: d.lastAnswerBy,
            at: Date.now(),
            letter: val
          };
        } else if (!nowMatches && d.lastAnswerWasDouble) {
          if (!d.scores) d.scores = {};
          d.scores[d.lastAnswerBy] = Math.max(0, (d.scores[d.lastAnswerBy] || 0) - DOUBLE_POF_BONUS);

          if (!d.stats) d.stats = {};
          const s = d.stats[d.lastAnswerBy] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
          s.doubleCount = Math.max(0, (s.doubleCount || 0) - 1);
          d.stats[d.lastAnswerBy] = s;

          d.lastAnswerWasDouble = false;
          d.lastEvent = {
            type: "double_pof_revoke",
            by: d.lastAnswerBy,
            at: Date.now(),
            letter: val
          };
        }
      }

      d.lastActivityAt = Date.now();
      return d;
    });

    if (couldTriggerDouble) {
      triggerPof(`Dubble pof (correctie)! +${DOUBLE_POF_BONUS}`);
      triggerScoreToast(`+${DOUBLE_POF_BONUS} punten (Dubble pof correctie)`, "plus");
    }
  }

 async function useJilla() {
  if (!room || room.paused) return;

  const r = ref(db, `rooms/${roomCode}`);
  await runTransaction(r, (data) => {
    if (!data || data.paused) return data;

    if (!data.players || !data.players[data.turn]) return data;
    if (data.turn !== playerId) return data;
    if (data.phase !== "answer") return data;

    const listLen = (data.order?.length ?? 0);
    if (listLen > 0) data.currentIndex = (data.currentIndex + 1) % listLen;

    if (!data.solo) {
      if (!data.jail) data.jail = {};
      data.jail[playerId] = (data.jail[playerId] || 0) + 1;
    }

    if (!data.participants) data.participants = {};
    const whoName = (data.participants[playerId]?.name) || (data.players?.[playerId]?.name) || "Speler";
    data.jillaLast = { pid: playerId, name: whoName, at: Date.now() };

    if (!data.scores) data.scores = {};
    data.scores[playerId] = (data.scores[playerId] || 0) - JILLA_PENALTY;

    if (!data.stats) data.stats = {};
    const s = data.stats[playerId] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
    s.jillaCount += 1;
    data.stats[playerId] = s;

    if (data.solo) {
      data.phase = "answer";
      data.turnStartAt = Date.now();
      data.cooldownEndAt = null;
    } else {
      data.phase = "cooldown";
      data.cooldownEndAt = Date.now() + COOLDOWN_MS;
      data.turnStartAt = null;
    }

    advanceTurnWithJail(data);
    data.lastActivityAt = Date.now();
    return data;
  });

  triggerScoreToast(`-${JILLA_PENALTY} punten (Jilla)`, "minus");
}


  async function kickPlayer(targetId) {
    if (!roomCode || !targetId) return;
    if (!confirm("Speler verwijderen?")) return;

    const r = ref(db, `rooms/${roomCode}`);
    await runTransaction(r, (data) => {
      if (!data || !data.players || !data.players[targetId]) return data;

      delete data.players[targetId];
      if (data.jail && data.jail[targetId] != null) delete data.jail[targetId];

      if (Array.isArray(data.playersOrder)) {
        data.playersOrder = data.playersOrder.filter(id => id !== targetId && data.players && data.players[id]);
      }

      const ids = data.players ? Object.keys(data.players) : [];
      if (!ids.length) return null;

      if (!data.hostId || !data.players[data.hostId]) data.hostId = data.playersOrder?.[0] || ids[0];
      if (!data.turn || !data.players[data.turn] || data.turn === targetId) {
        data.turn = data.playersOrder?.[0] || data.hostId || ids[0];
      }

      data.lastActivityAt = Date.now();
      return data;
    });

    try {
      await remove(ref(db, `rooms/${roomCode}/presence/${targetId}`));
    } catch (err) {
      console.warn("Kon presence voor speler niet verwijderen", err);
    }
  }

  function buildLeaderboardSnapshot(rm) {
    const par = rm.participants ? Object.keys(rm.participants) : [];
    const arr = par.map(id => {
      const name = rm.participants[id]?.name || rm.players?.[id]?.name || "Speler";
      const score = (rm.scores && rm.scores[id]) || 0;
      const st = (rm.stats && rm.stats[id]) || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
      const avg = st.answeredCount > 0 ? (st.totalTimeMs / st.answeredCount) : null;
      return {
        id,
        name,
        score,
        avgMs: avg,
        answered: st.answeredCount || 0,
        jilla: st.jillaCount || 0,
        dpf: st.doubleCount || 0
      };
    });
    arr.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return arr;
  }

  async function leaveRoom() {
    if (!roomCode) {
      setRoom(null);
      setRoomCode("");
      setIsHost(false);
      return;
    }
    const r = ref(db, `rooms/${roomCode}`);
    let actuallyLeft = false;

    await runTransaction(r, (data) => {
      if (!data) return data;

      if (!canLeaveRoom(data)) {
        data.lastEvent = { type: "leave_blocked", by: playerId, at: Date.now(), reason: "gate_closed" };
        data.lastActivityAt = Date.now();
        return data;
      }

      if (data.players && data.players[playerId]) delete data.players[playerId];
      if (data.jail && data.jail[playerId] != null) delete data.jail[playerId];

      if (Array.isArray(data.playersOrder)) {
        data.playersOrder = data.playersOrder.filter(id => id !== playerId && data.players && data.players[id]);
      }

      const ids = data.players ? Object.keys(data.players) : [];
      if (!ids.length) {
        actuallyLeft = true;
        return null;
      }

      if (!data.hostId || !data.players[data.hostId]) data.hostId = data.playersOrder?.[0] || ids[0];
      if (!data.turn || !data.players[data.turn] || data.turn === playerId) {
        data.turn = data.playersOrder?.[0] || data.hostId || ids[0];
      }

      data.lastActivityAt = Date.now();
      actuallyLeft = true;
      return data;
    });

    if (!actuallyLeft) return;

    if (connIdRef.current) {
      const myConnRef = ref(db, `rooms/${roomCode}/presence/${playerId}/${connIdRef.current}`);
      remove(myConnRef).catch((err) => console.warn("Kon presence niet verwijderen na leaven", err));
      connIdRef.current = null;
    }

    if (roomUnsubRef.current) { roomUnsubRef.current(); roomUnsubRef.current = null; }

    setRoom(null);
    setRoomCode("");
    setIsHost(false);
  }

  async function onLeaveClick() {
    if (room && isHost && room.started) {
      await finishGameAndRecord();
    } else if (room && !canLeaveRoom(room)) {
      alert("Je kunt nu niet leaven. Alleen wanneer de host aan de beurt is (of het potje is klaar) mag je leaven.");
      return;
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
    if (room.solo || room.paused) return;
    if (room.phase === "cooldown" && room.cooldownEndAt && now >= room.cooldownEndAt) {
      runTransaction(ref(db, `rooms/${roomCode}`), (data) => {
        if (!data || data.solo || data.paused) return data;
        if (data.phase !== "cooldown") return data;
        if (!data.cooldownEndAt || Date.now() < data.cooldownEndAt) return data;
        data.phase = "answer";
        data.turnStartAt = Date.now();
        data.lastActivityAt = Date.now();
        return data;
      });
    }
  }, [roomCode, room?.phase, room?.cooldownEndAt, room?.paused, now, room]);

 useEffect(() => {
  if (!offlineMulti) return;
  if (offmPhase !== "cooldown") return;
  if (!offmCooldownEndAt) return;

  if (now >= offmCooldownEndAt) {
    setOffmPhase("answer");
    const t = Date.now();
    setOffmTurnStartAt(t);
    setOffmCooldownEndAt(null);
    setTimeout(() => letterRef.current?.focus(), 0);
  }
}, [offlineMulti, offmPhase, offmCooldownEndAt, now]);

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
const answerElapsedMs = (room?.phase === "answer" && room?.turnStartAt)
  ? Math.max(0, effectiveNow - room.turnStartAt) : 0;
const potentialPoints = calcPoints(answerElapsedMs);

const offElapsedMs = (offlineSolo && offTurnStartAt) ? Math.max(0, now - offTurnStartAt) : 0;
const offPotentialPoints = offlineSolo ? calcPoints(offElapsedMs) : 0;
const offmInCooldown = offlineMulti && offmPhase === "cooldown";
const offmCooldownLeftMs = Math.max(0, (offmCooldownEndAt || 0) - now);
const offmElapsedMs = (offlineMulti && offmPhase === "answer" && offmTurnStartAt)
  ? Math.max(0, now - offmTurnStartAt) : 0;
const offmPotentialPoints = offlineMulti ? calcPoints(offmElapsedMs) : 0;


  const roundSize = (isOnlineRoom && room?.started)
    ? Math.max(
      1,
      Array.isArray(room?.startOrder) && room.startOrder.length > 0
        ? room.startOrder.length
        : Object.keys(room?.players || {}).length || 1
    )
    : 1;

const currentRound = isOnlineRoom
  ? (1 + Math.floor((room?.currentIndex ?? 0) / roundSize))
  : (offlineMulti
    ? (1 + Math.floor(Math.max(0, offmIndex) / Math.max(1, offmPlayers.length || 1)))
    : (offlineSolo ? (1 + Math.floor(Math.max(0, offIndex) / 1)) : 0));


const matchStartedAt = isOnlineRoom
  ? (room?.startedAt || room?.createdAt || null)
  : (offlineMulti ? offmStartedAt : (offlineSolo ? offStartedAt : null));

  const matchDurationMs = matchStartedAt
    ? (effectiveNow - (typeof matchStartedAt === "number" ? matchStartedAt : Date.now()))
    : 0;

function onLetterChanged(e) {
  const val = normalizeLetter(e.target.value);
  if (val.length === 1) {
    if (room?.paused) { e.target.value = ""; return; }
    if (isOnlineRoom && isMyTurn && myJailCount === 0 && !inCooldown) {
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



  /* Profiel (match history + highscore) */
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!playerId) return;
    const profRef = ref(db, `profiles/${playerId}`);
    const off = onValue(profRef, snap => setProfile(snap.val() || null));
    return () => off();
  }, [playerId]);


  return (
    <>
      <div style={styles.wrap}>
        <header style={styles.header}>
          <h1 style={styles.h1}>PimPamPof</h1>

          <Row>
            {!room?.started && !offlineSolo && !offlineMulti && (
              <input
                style={styles.input}
                placeholder="Jouw naam"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
              />
            )}


            {offlineSolo && (
              <Button variant="stop" onClick={stopOffline}>Stop solo</Button>
            )}
            {offlineMulti && (
              <Button variant="stop" onClick={stopOfflineMulti}>Stop offline multiplayer</Button>
            )}

            {isOnlineRoom && (
              <>
                {!room?.started && (
                  <span className="badge">
                    Room: <b>{roomCode}</b>
                    <button
                      onClick={copyRoomCode}
                      style={{ ...styles.btn, padding: "4px 10px", marginLeft: 8 }}
                    >
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

            <Button variant="alt" onClick={() => setSettingsOpen(true)}>⚙️ Instellingen</Button>
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
                <Button variant="alt" onClick={openWordCheck}>Check woord</Button>
                <Button onClick={changeLastLetter}>🔤 Verander letter</Button>
                {room.paused && <span className="badge">⏸️ Gepauzeerd</span>}
                {room?.lastAction?.type === "answer" && (
                  <Button variant="stop" onClick={cancelLastAnswer}>↩️ Cancel antwoord</Button>
                )}
              </>
            )}

            {!online && !offlineSolo && <span className="muted">start Solo</span>}
          </Row>
          {(offlineSolo || offlineMulti || (isOnlineRoom && room?.started)) && (
            <div className="mini-hud" style={{ marginTop: 6 }}>
              <span className="badge">🧭 Ronde: <b>{currentRound}</b></span>
              <span className="badge">⏳ Duur <b>{fmtDuration(matchDurationMs)}</b></span>
            </div>
          )}
        </header>
        {!offlineSolo && !offlineMulti && !room?.started && (
          <WhatsNewPanel
            whatsNew={WHATS_NEW}
            isOpen={whatsOpen}
            onToggle={() => setWhatsOpen((open) => !open)}
          />
        )}

        {!isOnlineRoom && !offlineSolo && !offlineMulti && (
          <MainMenuPanel
            online={online}
            roomCodeInput={roomCodeInput}
            onRoomCodeInputChange={setRoomCodeInput}
            onCreateRoom={() => createRoom({ autoStart: false, solo: false })}
            onBrowseRooms={openRoomBrowser}
            onJoinRoom={joinRoom}
            onStartSolo={startOffline}
            onStartOfflineMulti={openOfflineMultiSetup}
            onOpenDieren={() => (window.location.href = URL_DIEREN)}
          />
        )}

        {(!isOnlineRoom || (isOnlineRoom && isHost && !room?.started)) && !offlineSolo && !offlineMulti && (
          <QuestionManager
            input={invoer}
            onInputChange={setInvoer}
            questions={visibleQuestions}
            totalQuestions={vragen.length}
            activeQuestions={activeQuestions}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectedCategoryChange={setSelectedCategory}
            newQuestionCategory={newQuestionCategory}
            onNewQuestionCategoryChange={setNewQuestionCategory}
            newCategoryName={newCategoryName}
            onNewCategoryNameChange={setNewCategoryName}
            onAddCategory={voegCategorieToe}
            onAddQuestions={voegVragenToe}
            onCopyAll={kopieerAlle}
            onResetDefault={resetStandaardVragen}
            onRemoveQuestion={verwijderVraag}
            onToggleQuestionActive={toggleVraagActief}
            onChangeQuestionCategory={veranderVraagCategorie}
          />
        )}

        {offlineSolo && (
          <Section>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div className="badge">Solo</div>
<Row>
  <span className="badge">🏅 Punten: <b>{offScore}</b></span>
  <span className="badge">✅ Antwoorden: <b>{offAnswered}</b></span>
  <span className="badge">🔒 Jilla: <b>{offJillaCount}</b></span>
  <span className="badge">✨ Dubble pof: <b>{offDoubleCount}</b></span>
</Row>

<Row>
  <span className="badge">
    ⏱️ Tijd: {Math.floor(offElapsedMs / 1000)}s / {Math.floor(MAX_TIME_MS / 1000)}s
  </span>
  <span className="badge">
    🏅 Punten als je nu antwoordt: <b>{offPotentialPoints}</b>
  </span>
  <span className="badge">
    Gem. tijd / vraag: <b>{offAnswered > 0 ? `${(offTotalTimeMs / offAnswered / 1000).toFixed(1)}s` : "—"}</b>
  </span>
</Row>

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
              <div style={{ marginTop: 6 }}>
  <Button variant="stop" onClick={offlineJilla}>Jilla (vraag overslaan)</Button>
</div>

            </div>
          </Section>
        )}
{offlineMulti && (
  <>
    <Section>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div className="badge">Offline multiplayer</div>

        {(() => {
          const active = offmJillaLast && (Date.now() - (offmJillaLast.at || 0) < 2000);
          return active ? (
            <div className="jilla-toast">
              <div className="jilla-bubble">🔒 {offmJillaLast.name} gebruikte Jilla!</div>
            </div>
          ) : null;
        })()}

        <div className="badge">
          Beurt: <b>{offmPlayers?.[offmTurnIx]?.name ?? "Speler"}</b>
        </div>

        {offmInCooldown ? (
          <div className="badge">
            ⏳ Volgende beurt over {Math.ceil(offmCooldownLeftMs / 1000)}s
          </div>
        ) : (
          <Row>
            <span className="badge">
              ⏱️ Tijd: {Math.floor(offmElapsedMs / 1000)}s / {Math.floor(MAX_TIME_MS / 1000)}s
            </span>
            <span className="badge">
              🏅 Punten als je nu antwoordt: <b>{offmPotentialPoints}</b>
            </span>
          </Row>
        )}

        <div style={{ fontSize: 18 }}>
          Laatste letter: <span style={{ fontWeight: 700 }}>{offmLastLetter}</span>
        </div>

        <div style={{ fontSize: 22, minHeight: "3rem" }}>
          {offmInCooldown
            ? "Wachten…"
            : (() => {
                const qs = getSeedQuestions();
                const qIdx = offmOrder[offmIndex] ?? 0;
                return qs[qIdx] ?? "Vraag komt hier...";
              })()}
        </div>

        <input
          ref={letterRef}
          type="text"
          inputMode="text"
          maxLength={1}
          onChange={onOfflineMultiLetterChanged}
          placeholder={offmInCooldown ? "Wachten…" : "Typ de laatste letter…"}
          disabled={offmInCooldown}
          style={{
            ...styles.letterInput,
            opacity: offmInCooldown ? 0.5 : 1
          }}
        />

        {!offmInCooldown && (
          <div style={{ marginTop: 6 }}>
            <Button variant="stop" onClick={offlineMultiJilla}>Jilla (vraag overslaan)</Button>
          </div>
        )}
      </div>
    </Section>

    <Section title="Spelers">
      <ul style={styles.list}>
        {offmPlayers.map((p, idx) => {
          const score = offmScores?.[p.id] ?? 0;
          const jail = offmJail?.[p.id] ?? 0;
          const active = idx === offmTurnIx;
          const hot = offmJillaLast?.id === p.id && (Date.now() - (offmJillaLast.at || 0) < 2000);

          return (
            <li
              key={p.id}
              className={hot ? "hot-jilla" : ""}
              style={{
                ...styles.li,
                ...(active ? { background: "rgba(22,163,74,0.18)" } : {})
              }}
            >
              <div style={styles.liText}>
                {idx + 1}. {p.name}
                <span className="badge" style={{ marginLeft: 6 }}>
                  Punten: <b>{score}</b>
                </span>
                {jail > 0 && (
                  <span className="badge" style={{ marginLeft: 6 }}>
                    🔒 Jilla x{jail}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {active ? <div>🟢 beurt</div> : <div style={{ opacity: 0.6 }}>—</div>}
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  </>
)}


        {isOnlineRoom && room?.started && (
          <Section>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div className="badge">
                Room: <b>{roomCode}</b>
                <button
                  onClick={copyRoomCode}
                  style={{ ...styles.btn, padding: "4px 10px", marginLeft: 8 }}
                >
                  Kopieer
                </button>
              </div>

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

{room?.solo ? (
  <Row>
    <span className="badge">
      ⏱️ Tijd: {Math.floor(answerElapsedMs / 1000)}s / {Math.floor(MAX_TIME_MS / 1000)}s
    </span>
    <span className="badge">
      🏅 Punten als je nu antwoordt: <b>{potentialPoints}</b>
    </span>
  </Row>
) : inCooldown ? (
  <div className="badge">
    ⏳ Volgende ronde over {Math.ceil(cooldownLeftMs / 1000)}s
  </div>
) : (
  <Row>
    <span className="badge">
      ⏱️ Tijd: {Math.floor(answerElapsedMs / 1000)}s / {Math.floor(MAX_TIME_MS / 1000)}s
    </span>
    <span className="badge">
      🏅 Punten als je nu antwoordt: <b>{potentialPoints}</b>
    </span>
  </Row>
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
                style={{
                  ...styles.letterInput,
                  opacity: (isMyTurn && myJailCount === 0 && !inCooldown && !room?.paused) ? 1 : 0.5
                }}
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
                  const score = (room.scores && room.scores[id]) || 0;
                  const hot = room?.jillaLast?.pid === id && (Date.now() - (room?.jillaLast?.at || 0) < 2000);
                  const onlineNow = hasPresence(room, id);

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
                        {onlineNow
                          ? <span className="badge" style={{ marginLeft: 6 }}>🟢 online</span>
                          : <span className="badge" style={{ marginLeft: 6 }}>⚫ offline</span>}
                        {room?.lastRatingDelta && room.lastRatingDelta[id] != null && (
                          <span className="badge" style={{ marginLeft: 6 }}>
                            Δ {room.lastRatingDelta[id] > 0 ? `+${room.lastRatingDelta[id]}` : room.lastRatingDelta[id]}
                          </span>
                        )}
                        {jcount > 0 && (
                          <span className="badge" style={{ marginLeft: 6 }}>
                            🔒 Jilla x{jcount}
                          </span>
                        )}
                        {!room.solo && (
                          <>
                            <span style={{ margin: "0 6px" }}> </span>
                            <span className="badge">Punten: <b>{score}</b></span>

                          </>
                        )}
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
    ? (room?.solo
        ? "Solo: timer & punten actief."
        : "Multiplayer: timer & punten actief (5s cooldown).")
    : (offlineSolo
        ? "Offline solo actief."
        : (offlineMulti
            ? "Offline multiplayer actief (5s cooldown)."
            : (online
                ? "Maak een room of start Solo (offline)."
                : "Offline — start Solo (offline).")))}
</footer>

      </div>
      <BottomScoreBar room={isOnlineRoom ? room : null} />
      <PofToast show={pofShow} text={pofText} />
      <ScoreToast toast={scoreToast} />
      <LeaderboardOverlay
        open={leaderOpen}
        data={leaderData}
        onClose={() => setLeaderOpen(false)}
      />

      <SettingsOverlay
        open={settingsOpen}
        theme={theme}
        onThemeChange={setTheme}
        onClose={() => setSettingsOpen(false)}
      />
      <RoomBrowser
        open={roomBrowserOpen}
        onClose={() => setRoomBrowserOpen(false)}
        onRefresh={loadAvailableRooms}
        loading={roomListLoading}
        rooms={availableRooms}
        onJoinRoom={joinRoom}
      />
      <ProfileOverlay
        open={profileOpen}
        profile={profile}
        onClose={() => setProfileOpen(false)}
      />
      <OfflineResultOverlay
        result={offlineResult}
        onClose={() => setOfflineResult(null)}
      />
      <OfflineMultiSetup
        open={offmSetupOpen}
        playerCount={offmPlayerCount}
        names={offmNames}
        onPlayerCountChange={setOffmPlayerCount}
        onNamesChange={setOffmNames}
        onStart={startOfflineMultiFromSetup}
        onClose={() => setOffmSetupOpen(false)}
      />
      <WordCheckOverlay
        open={wordCheckOpen}
        word={wordCheckWord}
        onWordChange={setWordCheckWord}
        busy={wordCheckBusy}
        error={wordCheckError}
        result={wordCheckResult}
        preferAi={wordCheckPreferAi}
        onPreferAiChange={setWordCheckPreferAi}
        requiredLetter={normalizeLetter(
          offlineSolo ? offLastLetter :
          offlineMulti ? offmLastLetter :
          (isOnlineRoom && room?.started ? room?.lastLetter : "?")
        )}
        online={online}
        onRun={runWordCheck}
        onClose={closeWordCheck}
      />
    </>
  );
}
