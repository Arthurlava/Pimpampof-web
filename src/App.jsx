// src/App.jsx
import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import {
    getDatabase, ref, onValue, set, get, runTransaction
} from "firebase/database";

/* ---- CONSTANTS DIE WEL GEBRUIKT WORDEN ---- */
const URL_DIEREN = import.meta.env.VITE_DIERENSPEL_URL || "https://dierenspel-mtul.vercel.app/";
const PRIOR_MEAN = 80;
const PRIOR_WEIGHT = 10;
const MIN_ANS_FOR_BEST = 5;

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

/* ---------- STORAGE + HELPERS ---------- */
const STORAGE_VERSION = 4;
const STORAGE_KEY = `ppp.vragen.v${STORAGE_VERSION}`;
const OLD_KEYS = ["ppp.vragen", "ppp.vragen.v2", "ppp.vragen.v3"];

function loadVragen() {
    try {
        OLD_KEYS.forEach(k => localStorage.removeItem(k));
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) { void e; return []; }
}
function saveVragen(v) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); }
    catch (e) { void e; }
}
function getOrCreatePlayerId() {
    const key = "ppp.playerId";
    try {
        const ex = localStorage.getItem(key);
        if (ex) return ex;
        const id = crypto.randomUUID();
        localStorage.setItem(key, id);
        return id;
    } catch (e) { void e; return crypto.randomUUID(); }
}
const NAME_KEY = "ppp.playerName";

/* ---------- Kleine UI helpers ---------- */
const styles = {
    section: { background: "rgba(255,255,255,.05)", borderRadius: 12, padding: 16, marginTop: 16 },
    btn: { background: "#16a34a", border: "none", borderRadius: 8, padding: "8px 12px", color: "#fff", cursor: "pointer" },
    input: { padding: 8, borderRadius: 6, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.05)", color: "#fff" }
};
function Section({ title, children }) {
    return (
        <div style={styles.section}>
            {title && <h2 style={{ marginTop: 0 }}>{title}</h2>}
            {children}
        </div>
    );
}

/* ---------- PROFIEL OPSLAAN (helper) ---------- */
async function writeMatchToProfile(dbRef, playerId, roomCode, rm) {
    const results = [];
    const participants = Object.keys(rm.participants || {});
    for (const pid of participants) {
        const name = rm.participants?.[pid]?.name || rm.players?.[pid]?.name || "Speler";
        const score = (rm.scores?.[pid]) ?? 0;
        const st = rm.stats?.[pid] || { totalTimeMs: 0, answeredCount: 0, jillaCount: 0, doubleCount: 0 };
        const answered = st.answeredCount || 0;
        const avgMs = answered > 0 ? (st.totalTimeMs / answered) : null;
        const adjusted = (score + PRIOR_MEAN * PRIOR_WEIGHT) / ((answered || 0) + PRIOR_WEIGHT);
        results.push({ pid, name, score, answered, avgMs, adjusted });
    }
    results.sort((a, b) => (b.adjusted - a.adjusted) || (b.score - a.score));

    const placement = (() => {
        const ix = results.findIndex(r => r.pid === playerId);
        return ix >= 0 ? (ix + 1) : null;
    })();
    const you = results.find(r => r.pid === playerId) || null;

    const matchEntry = {
        roomCode,
        endedAt: rm.endedAt || Date.now(),
        you,
        placement,
        players: results.map(r => ({
            pid: r.pid, name: r.name, score: r.score, answered: r.answered,
            avgMs: r.avgMs, adjusted: Number(r.adjusted.toFixed(2))
        }))
    };
    await set(ref(dbRef, `profiles/${playerId}/matches/${roomCode}`), matchEntry);

    if (you && you.answered >= MIN_ANS_FOR_BEST) {
        const hsRef = ref(dbRef, `profiles/${playerId}/localHighscore`);
        await runTransaction(hsRef, cur => {
            const old = cur || { bestAdjusted: 0 };
            const better = !old.bestAdjusted || you.adjusted > old.bestAdjusted;
            if (better) {
                return {
                    bestAdjusted: Number(you.adjusted.toFixed(2)),
                    bestRaw: Number((you.score / Math.max(1, you.answered)).toFixed(2)),
                    bestGame: {
                        roomCode,
                        endedAt: matchEntry.endedAt,
                        score: you.score,
                        answered: you.answered,
                        placement
                    }
                };
            }
            return old;
        });
    }
}

/* ---------- HOOFD COMPONENT (DEEL 1) ---------- */
export default function PimPamPofWeb() {
    const [vragen, setVragen] = useState(loadVragen());
    const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) || "");
    const [playerId] = useState(() => getOrCreatePlayerId());
    const [room, setRoom] = useState(null);
    const [roomCode, setRoomCode] = useState("");
    const [isHost, setIsHost] = useState(false);

    useEffect(() => { saveVragen(vragen); }, [vragen]);
    useEffect(() => { localStorage.setItem(NAME_KEY, playerName || ""); }, [playerName]);

    // Profiel listener
    const [profile, setProfile] = useState(null);
    useEffect(() => {
        const r = ref(db, `profiles/${playerId}`);
        const off = onValue(r, s => setProfile(s.val() || null));
        return () => off();
    }, [playerId]);

    function fmt(ts) { try { return new Date(ts).toLocaleString(); } catch (e) { void e; return "—"; } }

    /* --- Room aanmaken, joinen, afronden --- */
    async function createRoom() {
        const code = Math.random().toString(36).substring(2, 7).toUpperCase();
        const obj = {
            hostId: playerId,
            participants: { [playerId]: { name: playerName || "Host" } },
            players: { [playerId]: { name: playerName || "Host" } },
            scores: {},
            stats: {},
            started: true,
            finished: false,
            order: [0],
            questions: vragen.map(v => v.tekst),
            currentIndex: 0,
            lastLetter: "A"
        };
        await set(ref(db, `rooms/${code}`), obj);
        setRoom(obj);
        setRoomCode(code);
        setIsHost(true);
    }

    async function joinRoom(code) {
        const r = ref(db, `rooms/${code}`);
        const s = await get(r);
        if (!s.exists()) return alert("Room niet gevonden");
        const d = s.val();
        await runTransaction(r, data => {
            if (!data) return data;
            if (!data.players) data.players = {};
            data.players[playerId] = { name: playerName || "Speler" };
            if (!data.participants) data.participants = {};
            data.participants[playerId] = { name: playerName || "Speler" };
            return data;
        });
        setRoomCode(code);
        setRoom(d);
        setIsHost(false);
    }

    async function finishGameAndRecord() {
        if (!roomCode) return;
        const r = ref(db, `rooms/${roomCode}`);
        await runTransaction(r, d => {
            if (!d) return d;
            d.started = false;
            d.finished = true;
            d.endedAt = Date.now();
            return d;
        });

        const snap = await get(r);
        if (!snap.exists()) return;
        const rm = snap.val();
        await writeMatchToProfile(db, playerId, roomCode, rm);
        alert("Potje afgerond en opgeslagen in jouw match history (dit apparaat).");
    }

/* ---- DEEL 2 volgt hierna ---- */
    /* ---------------- LEAVE / SAVE ---------------- */
    async function onLeaveClick() {
        if (!roomCode) return;

        const r = ref(db, `rooms/${roomCode}`);
        if (isHost && room?.started) {
            // Host rondt af én schrijft eigen match
            await finishGameAndRecord();
        } else {
            // Niet-host: schrijf eigen match snapshot (ook als de host nog niet heeft gefinished)
            const snap = await get(r);
            if (snap.exists()) {
                const rm = snap.val();
                await writeMatchToProfile(db, playerId, roomCode, rm);
            }
        }

        // Lokale state resetten
        setRoom(null);
        setRoomCode("");
        setIsHost(false);
    }

    /* ---------------- VRAAGBEHEER ---------------- */
    const [bulkText, setBulkText] = useState("");
    function addBulkQuestions() {
        const parts = String(bulkText)
            .split(/[\n,]+/)
            .map(s => s.trim())
            .filter(Boolean)
            .map(t => ({ id: crypto.randomUUID(), tekst: t }));
        if (parts.length === 0) return;
        const next = [...(Array.isArray(vragen) ? vragen : []), ...parts];
        setVragen(next);
        saveVragen(next);
        setBulkText("");
    }
    function removeQuestion(id) {
        const next = (Array.isArray(vragen) ? vragen : []).filter(q => q.id !== id);
        setVragen(next);
        saveVragen(next);
    }

    /* ---------------- HANDIGE DINGETJES ---------------- */
    function copyRoomCode() {
        if (!roomCode) return;
        navigator.clipboard?.writeText(roomCode).then(() => {
            alert("Room code gekopieerd.");
        }).catch((e) => { void e; });
    }

    /* ---------------- RENDER HELPERS ---------------- */
    function renderHighscore() {
        const hs = profile?.localHighscore;
        if (!hs) return <em style={{ opacity: .7 }}>Nog geen highscore opgeslagen.</em>;
        return (
            <div style={{
                display: "flex", flexWrap: "wrap", gap: 12,
                background: "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.25)",
                borderRadius: 10, padding: 12
            }}>
                <div><strong>Best Adjusted:</strong> {hs.bestAdjusted?.toFixed?.(2) ?? hs.bestAdjusted}</div>
                <div><strong>Best Raw:</strong> {hs.bestRaw}</div>
                {hs.bestGame && (
                    <>
                        <div><strong>Room:</strong> {hs.bestGame.roomCode}</div>
                        <div><strong>Eindigt:</strong> {fmt(hs.bestGame.endedAt)}</div>
                        <div><strong>Score:</strong> {hs.bestGame.score} / {hs.bestGame.answered} vragen</div>
                        {hs.bestGame.placement && <div><strong>Plaats:</strong> {hs.bestGame.placement}e</div>}
                    </>
                )}
            </div>
        );
    }

    function renderMatches() {
        const matchesObj = profile?.matches || {};
        const arr = Object.values(matchesObj)
            .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
        if (arr.length === 0) {
            return <em style={{ opacity: .7 }}>Nog geen gespeelde potjes opgeslagen.</em>;
        }
        return (
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,.2)", padding: "6px 8px" }}>Datum</th>
                            <th style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,.2)", padding: "6px 8px" }}>Room</th>
                            <th style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,.2)", padding: "6px 8px" }}>Jij (score)</th>
                            <th style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,.2)", padding: "6px 8px" }}>Jij (adjusted)</th>
                            <th style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,.2)", padding: "6px 8px" }}>Plaats</th>
                            <th style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,.2)", padding: "6px 8px" }}>Deelnemers</th>
                        </tr>
                    </thead>
                    <tbody>
                        {arr.map((m) => {
                            const you = m.you || { score: 0, answered: 0, adjusted: 0 };
                            return (
                                <tr key={`${m.roomCode}-${m.endedAt}`}>
                                    <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>{fmt(m.endedAt)}</td>
                                    <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>{m.roomCode}</td>
                                    <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                                        {you.score} / {you.answered}
                                    </td>
                                    <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                                        {Number(you.adjusted || 0).toFixed(2)}
                                    </td>
                                    <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                                        {m.placement ? `${m.placement}e` : "—"}
                                    </td>
                                    <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                                        {Array.isArray(m.players) ? m.players.map(p => p.name).join(", ") : "—"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    /* ---------------- UI ---------------- */
    const [joinCode, setJoinCode] = useState("");

    return (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
            <h1 style={{ marginTop: 0 }}>PimPamPof</h1>

            {/* Profiel: Highscore + Matches */}
            <Section title="🏅 Highscore">
                {renderHighscore()}
            </Section>
            <Section title="📜 Match history">
                {renderMatches()}
            </Section>

            {/* Naam en room acties */}
            <Section title="Spelen">
                {!roomCode ? (
                    <>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <input
                                style={styles.input}
                                placeholder="Jouw naam"
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                            />
                            <button style={styles.btn} onClick={createRoom}>Room aanmaken</button>
                            <input
                                style={styles.input}
                                placeholder="Room code"
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            />
                            <button
                                style={{ ...styles.btn, background: "#0ea5e9" }}
                                onClick={() => joinRoom(joinCode)}
                            >
                                Join
                            </button>
                            <button
                                style={{ ...styles.btn, background: "#065f46" }}
                                onClick={() => (window.location.href = URL_DIEREN)}
                                title="Ga naar Dierenspel"
                            >
                                ↔️ Naar Dierenspel
                            </button>
                        </div>
                        <p style={{ opacity: .7, marginTop: 8 }}>
                            Maak een room of join met een code. Je scores worden daarna automatisch in je profiel (hierboven) opgeslagen.
                        </p>
                    </>
                ) : (
                    <>
                        <div style={{
                            display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
                            background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.15)",
                            borderRadius: 10, padding: 12
                        }}>
                            <div><strong>Room:</strong> {roomCode}</div>
                            <button style={{ ...styles.btn, padding: "6px 10px" }} onClick={copyRoomCode}>Kopieer</button>
                            {isHost && room?.started && (
                                <button
                                    style={{ ...styles.btn, background: "#9333ea" }}
                                    onClick={finishGameAndRecord}
                                >
                                    ✅ Finish & Save
                                </button>
                            )}
                            <button style={{ ...styles.btn, background: "#475569" }} onClick={onLeaveClick}>Leave</button>
                        </div>

                        {room && (
                            <div style={{ marginTop: 10 }}>
                                <div style={{ opacity: .8 }}>
                                    {isHost ? "Jij bent host." : "Je bent deelnemer."}{" "}
                                    {room.started ? "Potje is gestart." : "Potje is (nog) niet gestart."}
                                </div>
                                {/* Simpele scoreweergave */}
                                {!!room.scores && Object.keys(room.scores).length > 0 && (
                                    <div style={{ marginTop: 8 }}>
                                        <strong>Scores:</strong>{" "}
                                        {Object.entries(room.scores).map(([pid, sc]) => {
                                            const naam = room.participants?.[pid]?.name || room.players?.[pid]?.name || "Speler";
                                            return <span key={pid} style={{ marginRight: 10 }}>{naam}: {sc}</span>;
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </Section>

            {/* Vragenbeheer */}
            {!roomCode && (
                <Section title="Vragen beheren (lokaal)">
                    <textarea
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                        placeholder={"Voer vragen in, gescheiden door enter of komma"}
                        style={{
                            width: "100%", minHeight: 100, padding: 10, borderRadius: 8,
                            border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.05)", color: "#fff"
                        }}
                    />
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <button style={styles.btn} onClick={addBulkQuestions}>Voeg vragen toe</button>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        {(Array.isArray(vragen) && vragen.length > 0) ? (
                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                {vragen.map(q => (
                                    <li key={q.id} style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,.08)"
                                    }}>
                                        <span>{q.tekst}</span>
                                        <button
                                            style={{ ...styles.btn, background: "#dc2626", padding: "6px 10px" }}
                                            onClick={() => removeQuestion(q.id)}
                                        >
                                            Verwijder
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <em style={{ opacity: .7 }}>Nog geen vragen toegevoegd.</em>
                        )}
                    </div>
                </Section>
            )}

            <footer style={{ opacity: .6, fontSize: 12, marginTop: 24 }}>
                Scores & history worden lokaal voor dit apparaat onder je profiel bewaard.
            </footer>
        </div>
    );
}
