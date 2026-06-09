export function normalizeWordForCheck(raw) {
  const value = String(raw || "").trim().replace(/\s+/g, " ");
  return value.length > 80 ? value.slice(0, 80) : value;
}

export async function checkWordViaAiEndpoint(word, endpoint, signal) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word }),
    signal,
  });

  if (!res.ok) throw new Error(`AI endpoint HTTP ${res.status}`);

  const json = await res.json();
  return {
    exists: !!json.exists,
    source: "AI",
    url: json.url || getWiktionaryUrl(word),
    note: json.note || null,
  };
}

export function getWiktionaryUrl(word) {
  const title = normalizeWordForCheck(word).replace(/\s+/g, "_");
  return `https://nl.wiktionary.org/wiki/${encodeURIComponent(title)}`;
}

export function getGoogleMeaningUrl(word) {
  const q = `${normalizeWordForCheck(word)} betekenis`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export async function checkWordViaNlWiktionary(word, signal) {
  const endpoint = "https://nl.wiktionary.org/w/api.php";
  const url =
    `${endpoint}?action=query&titles=${encodeURIComponent(word)}` +
    `&format=json&redirects=1&origin=*`;

  const res = await fetch(url, { method: "GET", signal });
  if (!res.ok) throw new Error(`Wiktionary HTTP ${res.status}`);

  const json = await res.json();
  const pages = json?.query?.pages;
  if (!pages || typeof pages !== "object") {
    throw new Error("Unexpected Wiktionary response.");
  }

  const firstKey = Object.keys(pages)[0];
  const page = pages[firstKey] || null;

  return {
    exists: firstKey !== "-1" && !page?.missing,
    source: "Wiktionary",
    url: getWiktionaryUrl(word),
  };
}
