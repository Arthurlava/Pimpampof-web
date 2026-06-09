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
  onAddQuestions,
  onCopyAll,
  onResetDefault,
  onRemoveQuestion,
  onToggleQuestionActive,
  onChangeQuestionCategory,
}) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const activeCount = activeQuestions.length;
  const realCategories = categories.filter((category) => category !== "Alles");
  const addCategoryValue = newCategoryName.trim();
  const currentInputCategory = selectedCategory === "Alles" ? newQuestionCategory : selectedCategory;

  function addCategory() {
    if (!addCategoryValue) return;
    onAddCategory();
    setIsAddingCategory(false);
  }

  function addQuestions() {
    onAddQuestions(currentInputCategory);
  }

  return (
    <>
      <Section title="Vragen beheren">
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

        <p className="muted" style={{ marginBottom: 0 }}>
          Actieve vragen in spel: <b>{activeCount}</b> / {totalQuestions}. Tab <b>Alles</b> toont alle vragen.
        </p>
      </Section>

      <Section title="Nieuwe vragen (gescheiden met , of enter)">
        <Row>
          <span className="badge">
            Nieuwe vragen naar: <b>{currentInputCategory}</b>
          </span>
          {selectedCategory === "Alles" && realCategories.length > 1 && (
            <span className="muted">
              Kies eerst een categorie-tab als je vragen direct in die categorie wilt plaatsen.
            </span>
          )}
        </Row>

        <TextArea value={input} onChange={onInputChange} />
        <div style={{ marginTop: 12 }}>
          <Row>
            <Button onClick={addQuestions}>Voeg vragen toe</Button>
            <Button variant="alt" onClick={onCopyAll}>Kopieer alle vragen</Button>
            <Button variant="stop" onClick={onResetDefault}>Reset naar standaard</Button>
          </Row>
        </div>
      </Section>

      <Section title={selectedCategory === "Alles" ? "Alle vragen" : `Vragen: ${selectedCategory}`}>
        {questions.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Geen vragen in deze categorie.</p>
        ) : (
          <ul style={styles.list}>
            {questions.map((question) => (
              <li
                key={question.id}
                style={{
                  ...styles.li,
                  opacity: question.active === false ? 0.55 : 1,
                }}
              >
                <div style={styles.liText}>
                  <div>{question.tekst}</div>
                  <div className="mini-hud" style={{ marginTop: 6 }}>
                    <span className="badge">{question.active === false ? "Uit" : "Actief"}</span>
                    <span className="badge">{question.category || "Algemeen"}</span>
                    <select
                      aria-label="Vraagcategorie wijzigen"
                      value={question.category || "Algemeen"}
                      onChange={(event) => onChangeQuestionCategory(question.id, event.target.value)}
                      style={styles.select}
                    >
                      {realCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
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
    </>
  );
}
