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
function makeRoomCode(len = 5) { let s = ""; for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math]()_
