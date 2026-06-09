export const MAX_TIME_MS = 120000;
export const MAX_POINTS = 200;
export const DOUBLE_POF_BONUS = 100;
export const JILLA_PENALTY = 25;
export const COOLDOWN_MS = 5000;
export const OFFLINE_MULTI_MAX_PLAYERS = 20;

export const URL_DIEREN = import.meta.env.VITE_DIERENSPEL_URL || "https://dierenspel-mtul.vercel.app/";
export const WORDCHECK_AI_ENDPOINT = import.meta.env.VITE_WORDCHECK_ENDPOINT || "";

export const PRIOR_MEAN = 80;
export const PRIOR_WEIGHT = 10;
export const MIN_ANS_FOR_BEST = 5;

export const STALE_ROOM_MS = 4 * 60 * 1000;

export const STORAGE_VERSION = 4;
export const STORAGE_KEY = `ppp.vragen.v${STORAGE_VERSION}`;
export const OLD_KEYS = ["ppp.vragen", "ppp.vragen.v2", "ppp.vragen.v3"];

export const WHATS_NEW_COLLAPSE_KEY = "ppp.whatsnew.collapsed";
export const NAME_KEY = "ppp.playerName";
