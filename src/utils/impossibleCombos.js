export function normalizeComboQuestion(question) {
  return String(question || "").trim().replace(/\s+/g, " ");
}

export function normalizeComboLetter(letter) {
  return String(letter || "").trim().toUpperCase().slice(0, 1);
}

export function makeImpossibleComboKey(question, letter) {
  const normalized = `${normalizeComboLetter(letter)}|${normalizeComboQuestion(question).toLowerCase()}`;
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(index);
    hash |= 0;
  }

  return `combo_${Math.abs(hash)}`;
}

export function isImpossibleComboApproved(approvedCombos, question, letter) {
  const key = makeImpossibleComboKey(question, letter);
  return !!approvedCombos?.[key];
}
