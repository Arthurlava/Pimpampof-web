import { useEffect, useState } from "react";
import { DEFAULT_VRAGEN } from "../data/defaultQuestions";
import { OLD_KEYS, STORAGE_KEY } from "../config/constants";
import { createId, splitInput } from "../utils/gameUtils";

function createDefaultQuestions() {
  return DEFAULT_VRAGEN.map((tekst) => ({
    id: createId(),
    tekst: String(tekst),
  }));
}

function loadStoredQuestions() {
  try {
    OLD_KEYS.forEach((key) => localStorage.removeItem(key));

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = createDefaultQuestions();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const seeded = createDefaultQuestions();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = createDefaultQuestions();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    return parsed.map((question) => ({
      id: question?.id || createId(),
      tekst: String(question?.tekst ?? ""),
    }));
  } catch {
    return createDefaultQuestions();
  }
}

export function useQuestions() {
  const [vragen, setVragen] = useState(loadStoredQuestions);
  const [invoer, setInvoer] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vragen));
    } catch (err) {
      console.warn("Kon vragen niet opslaan in localStorage", err);
    }
  }, [vragen]);

  function voegVragenToe() {
    const items = splitInput(invoer);
    if (!items.length) return;

    setVragen((prev) => [
      ...prev,
      ...items.map((tekst) => ({ id: createId(), tekst })),
    ]);
    setInvoer("");
  }

  function verwijderVraag(id) {
    setVragen((prev) => prev.filter((question) => question.id !== id));
  }

  async function kopieerAlle() {
    const tekst = vragen.map((vraag) => vraag.tekst).join(",\n");

    try {
      await navigator.clipboard.writeText(tekst);
      alert("Alle vragen zijn gekopieerd.");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = tekst;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("Alle vragen zijn gekopieerd.");
    }
  }

  function resetStandaardVragen() {
    const seeded = createDefaultQuestions();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    } catch (err) {
      console.warn("Kon standaardvragen niet opslaan", err);
    }

    setVragen(seeded);
    alert("Standaard vragen opnieuw geladen.");
  }

  return {
    vragen,
    invoer,
    setInvoer,
    voegVragenToe,
    verwijderVraag,
    kopieerAlle,
    resetStandaardVragen,
  };
}
