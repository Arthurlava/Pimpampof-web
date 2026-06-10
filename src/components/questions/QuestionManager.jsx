import { useState } from "react";
import { Button } from "../common/Button";
import { DangerButton } from "../common/DangerButton";
import { Row } from "../common/Row";
import { Section } from "../common/Section";
import { TextArea } from "../common/TextArea";
import { styles } from "../../styles/styles";

export function QuestionManager({
  input,
  onInputChange,
  questions,
  totalQuestions,
  activeQuestions,
  categories,
  selectedCategory,
  onSelectedCategoryChange,
  newQuestionCategory,
  onNewQuestionCategoryChange,
  newCategoryName,
  onNewCategoryNameChange,
  onAddCategory,
  onDeleteCategory,
  onAddQuestions,
  onCopyAll,
  onResetDefault,
  onRemoveQuestion,
  onToggleQuestionActive,
  onChangeQuestionCategory,
}) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const activeCount = activeQuestions.length;
  const realCategories = categories.filter((category) => category !== "Alles");
  const addCategoryValue = newCategoryName.trim();
  const currentInputCategory = selectedCategory === "Alles" ? newQuestionCategory : selectedCategory;
  const listTitle = selectedCategory === "Alles" ? "Alle vragen" : `Vragen: ${selectedCategory}`;

  function addCategory() {
    if (!addCategoryValue) return;
    onAddCategory();
    setIsAddingCategory(false);
  }

  function addQuestions() {
    onAddQuestions(currentInputCategory);
    setAddOpen(false);
  }

  function deleteSelectedCategory() {
    if (selectedCategory === "Alles") return;
    if (!confirm(`Categorie "${selectedCategory}" verwijderen? De vragen blijven bestaan en gaan terug naar Alles.`)) return;
    onDeleteCategory(selectedCategory);
  }

  return (
    <Section title={listTitle}>
      <div className="question-manager-top">
        <div className="question-tabs">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`question-tab${selectedCategory === category ? " question-tab-active" : ""}`}
              onClick={() => {
                onSelectedCategoryChange(category);
                if (category !== "Alles") onNewQuestionCategoryChange(category);
              }}
            >
              {category}
            </button>
          ))}

          {!isAddingCategory ? (
            <button
              type="button"
              className="question-tab question-tab-add"
              onClick={() => setIsAddingCategory(true)}
            >
              + Categorie
            </button>
          ) : (
            <div className="question-tab-create">
              <input
                style={{ ...styles.input, width: 160 }}
                placeholder="Naam categorie"
                value={newCategoryName}
                onChange={(event) => onNewCategoryNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addCategory();
                  if (event.key === "Escape") setIsAddingCategory(false);
                }}
                autoFocus
              />
              <Button variant="alt" onClick={addCategory} disabled={!addCategoryValue}>Toevoegen</Button>
            </div>
          )}
        </div>

        <div className="question-toolbar">
          <span className="muted">
            {selectedCategory === "Alles"
              ? `Alle actieve vragen worden gebruikt: ${activeCount} / ${totalQuestions}`
              : `Alleen actieve vragen uit deze categorie worden gebruikt.`}
          </span>

          <div className="question-toolbar-actions" aria-label="Vraagbeheer acties">
            <Button variant="alt" onClick={() => setAddOpen((open) => !open)}>
              {addOpen ? "Sluit toevoegen" : "+ Vragen"}
            </Button>
            <Button variant="alt" onClick={onCopyAll}>Kopieer</Button>
            <Button variant="stop" onClick={onResetDefault}>Reset</Button>
            {selectedCategory !== "Alles" && (
              <Button variant="stop" onClick={deleteSelectedCategory}>Verwijder categorie</Button>
            )}
          </div>
        </div>

        {addOpen && (
          <div className="question-add-panel">
            <p className="muted" style={{ marginTop: 0 }}>
              Nieuwe vragen gaan naar: <b>{currentInputCategory || "Geen categorie"}</b>
            </p>
            <TextArea value={input} onChange={onInputChange} />
            <div style={{ marginTop: 12 }}>
              <Row>
                <Button onClick={addQuestions}>Voeg vragen toe</Button>
              </Row>
            </div>
          </div>
        )}
      </div>

      {questions.length === 0 ? (
        <p style={{ opacity: 0.7 }}>Geen vragen in deze categorie.</p>
      ) : (
        <ul style={styles.list}>
          {questions.map((question) => (
            <li
              key={question.id}
              className="question-row"
              style={{ opacity: question.active === false ? 0.55 : 1 }}
            >
              <div className="question-text">{question.tekst}</div>

              <div className="question-actions">
                {realCategories.length > 0 && (
                  <select
                    aria-label="Vraagcategorie wijzigen"
                    value={question.category || ""}
                    onChange={(event) => onChangeQuestionCategory(question.id, event.target.value)}
                    style={styles.select}
                  >
                    <option value="">Geen categorie</option>
                    {realCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                )}

                <Button variant="alt" onClick={() => onToggleQuestionActive(question.id)}>
                  {question.active === false ? "Aanzetten" : "Uitzetten"}
                </Button>
                <DangerButton onClick={() => onRemoveQuestion(question.id)}>❌</DangerButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
