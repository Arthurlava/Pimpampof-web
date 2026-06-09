import { MAX_POINTS, MAX_TIME_MS } from "../config/constants";

const START_CONSONANTS = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "V", "W"];

export function calcPoints(ms) {
  const points = Math.floor(MAX_POINTS * (1 - ms / MAX_TIME_MS));
  return Math.max(0, points);
}

export function shuffle(arr) {
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function splitInput(text) {
  return String(text || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function randomStartConsonant() {
  return START_CONSONANTS[Math.floor(Math.random() * START_CONSONANTS.length)];
}

export function normalizeLetter(ch) {
  return (ch ?? "").toString().trim().toUpperCase();
}

export function ordinal(n) {
  return `${n}e`;
}

export function fmtDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (value) => value.toString().padStart(2, "0");

  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

export function clampInt(n, min, max) {
  const x = Number.isFinite(n) ? Math.trunc(n) : min;
  return Math.max(min, Math.min(max, x));
}

export function canLeaveRoom(data) {
  if (!data) return true;
  if (data.solo) return true;
  if (!data.started) return true;
  if (data.finished) return true;
  return data.turn === data.hostId;
}

export function hasPresence(data, pid) {
  const connections = data?.presence?.[pid];
  return !!(connections && typeof connections === "object" && Object.keys(connections).length > 0);
}

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
