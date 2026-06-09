import { useEffect, useMemo, useState } from "react";
import { DEFAULT_VRAGEN } from "../data/defaultQuestions";
import { OLD_KEYS, STORAGE_KEY } from "../config/constants";
import { createId, splitInput } from "../utils/gameUtils";

const DEFAULT_CATEGORY = "Algemeen";
const ALL_CATEGORIES = "Alles";

function cleanCategory(value) {
  const category = String(value || "").trim();
  return category || DEFAULT_CATEGORY;
}

function normalizeQuestion(question) {
  return {
    id: question?.id || createId(),
    tekst: String(question?.tekst ?? question ?? ""),
    active: question?.active !== false,
    category: cleanCategory(question?.category),
  };
}

function createDefaultQuestions() {
  return DEFAULT_VRAGEN.map((tekst) => ({
    id: createId(),
    tekst: String(tekst),
    active: true,
    category: DEFAULT_CATEGORY,
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

    return parsed.map(normalizeQuestion).filter((question) => question.tekst.trim());
  } catch {
    return createDefaultQuestions();
  }
}

export function useQuestions() {
  const [vragen, setVragen] = useState(loadStoredQuestions);
  const [invoer, setInvoer] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [newQuestionCategory, setNewQuestionCategory] = useState(DEFAULT_CATEGORY);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vragen));
    } catch (err) {
      console.warn("Kon vragen niet opslaan in localStorage", err);
    }
  }, [vragen]);

  const categories = useMemo(() => {
    const names = new Set([DEFAULT_CATEGORY]);
    vragen.forEach((question) => names.add(cleanCategory(question.category)));
    return [ALL_CATEGORIES, ...Array.from(names).sort((a, b) => a.localeCompare(b))];
  }, [vragen]);

  const visibleQuestions = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES) return vragen;
    return vragen.filter((question) => cleanCategory(question.category) === selectedCategory);
  }, [vragen, selectedCategory]);

  const activeQuestions = useMemo(
    () => vragen.filter((question) => question.active !== false),
    [vragen]
  );

  function voegVragenToe(categoryOverride) {
    const items = splitInput(invoer);
    if (!items.length) return;

    const category = cleanCategory(categoryOverride || newQuestionCategory);

    setVragen((prev) => [
      ...prev,
      ...items.map((tekst) => ({ id: createId(), tekst, active: true, category })),
    ]);
    setNewQuestionCategory(category);
    setInvoer("");
  }

  function verwijderVraag(id) {
    setVragen((prev) => prev.filter((question) => question.id !== id));
  }

  function toggleVraagActief(id) {
    setVragen((prev) =>
      prev.map((question) =>
        question.id === id ? { ...question, active: question.active === false } : question
      )
    );
  }

  function veranderVraagCategorie(id, category) {
    setVragen((prev) =>
      prev.map((question) =>
        question.id === id ? { ...question, category: cleanCategory(category) } : question
      )
    );
  }

  function voegCategorieToe() {
    const category = cleanCategory(newCategoryName);
    setNewQuestionCategory(category);
    setSelectedCategory(category);
    setNewCategoryName("");
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
    setSelectedCategory(ALL_CATEGORIES);
    setNewQuestionCategory(DEFAULT_CATEGORY);
    alert("Standaard vragen opnieuw geladen.");
  }

  return {
    vragen,
    activeQuestions,
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
  };
}
