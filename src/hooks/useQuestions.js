import { useEffect, useMemo, useState } from "react";
import { DEFAULT_VRAGEN } from "../data/defaultQuestions";
import { OLD_KEYS, STORAGE_KEY } from "../config/constants";
import { createId, splitInput } from "../utils/gameUtils";

const ALL_CATEGORIES = "Alles";
const CATEGORY_STORAGE_KEY = "ppp.vragen.categories.v1";

function cleanCategory(value) {
  return String(value || "").trim();
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
    category: "",
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

function loadStoredCategories() {
  try {
    const raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(cleanCategory).filter(Boolean))];
  } catch {
    return [];
  }
}

export function useQuestions() {
  const [vragen, setVragen] = useState(loadStoredQuestions);
  const [customCategories, setCustomCategories] = useState(loadStoredCategories);
  const [invoer, setInvoer] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [newQuestionCategory, setNewQuestionCategory] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vragen));
    } catch (err) {
      console.warn("Kon vragen niet opslaan in localStorage", err);
    }
  }, [vragen]);

  useEffect(() => {
    try {
      localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(customCategories));
    } catch (err) {
      console.warn("Kon categorieën niet opslaan in localStorage", err);
    }
  }, [customCategories]);

  const categories = useMemo(() => {
    const names = new Set(customCategories);
    vragen.forEach((question) => {
      const category = cleanCategory(question.category);
      if (category) names.add(category);
    });
    return [ALL_CATEGORIES, ...Array.from(names).sort((a, b) => a.localeCompare(b))];
  }, [customCategories, vragen]);

  const visibleQuestions = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES) return vragen;
    return vragen.filter((question) => cleanCategory(question.category) === selectedCategory);
  }, [vragen, selectedCategory]);

  const activeQuestions = useMemo(
    () => vragen.filter((question) => question.active !== false),
    [vragen]
  );

  const selectedGameQuestions = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES) return activeQuestions;
    return activeQuestions.filter((question) => cleanCategory(question.category) === selectedCategory);
  }, [activeQuestions, selectedCategory]);

  function voegVragenToe(categoryOverride) {
    const items = splitInput(invoer);
    if (!items.length) return;

    const category = cleanCategory(categoryOverride ?? newQuestionCategory);

    setVragen((prev) => [
      ...prev,
      ...items.map((tekst) => ({ id: createId(), tekst, active: true, category })),
    ]);

    if (category) {
      setCustomCategories((prev) => [...new Set([...prev, category])]);
      setNewQuestionCategory(category);
    }

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
    const cleaned = cleanCategory(category);
    setVragen((prev) =>
      prev.map((question) =>
        question.id === id ? { ...question, category: cleaned } : question
      )
    );

    if (cleaned) {
      setCustomCategories((prev) => [...new Set([...prev, cleaned])]);
    }
  }

  function voegCategorieToe() {
    const category = cleanCategory(newCategoryName);
    if (!category) return;

    setCustomCategories((prev) => [...new Set([...prev, category])]);
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
      localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify([]));
    } catch (err) {
      console.warn("Kon standaardvragen niet opslaan", err);
    }

    setVragen(seeded);
    setCustomCategories([]);
    setSelectedCategory(ALL_CATEGORIES);
    setNewQuestionCategory("");
    alert("Standaard vragen opnieuw geladen.");
  }

  return {
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
  };
}
