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
  const activeCount = activeQuestions.length;

  return (
    <>
      <Section title="Categorieën">
        <Row>
          <label className="badge">
            Bekijken
            <select
              value={selectedCategory}
              onChange={(event) => onSelectedCategoryChange(event.target.value)}
              style={styles.select}
            >
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>

          <input
            style={styles.input}
            placeholder="Nieuwe categorie"
            value={newCategoryName}
            onChange={(event) => onNewCategoryNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAddCategory();
            }}
          />
          <Button variant="alt" onClick={onAddCategory}>Maak categorie</Button>
        </Row>

        <p className="muted" style={{ marginBottom: 0 }}>
          Actieve vragen in spel: <b>{activeCount}</b> / {totalQuestions}. Standaard worden alle categorieën gebruikt tijdens het spelen.
        </p>
      </Section>

      <Section title="Nieuwe vragen (gescheiden met , of enter)">
        <Row>
          <label className="badge">
            Categorie
            <select
              value={newQuestionCategory}
              onChange={(event) => onNewQuestionCategoryChange(event.target.value)}
              style={styles.select}
            >
              {categories.filter((category) => category !== "Alles").map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
        </Row>

        <TextArea value={input} onChange={onInputChange} />
        <div style={{ marginTop: 12 }}>
          <Row>
            <Button onClick={onAddQuestions}>Voeg vragen toe</Button>
            <Button variant="alt" onClick={onCopyAll}>Kopieer alle vragen</Button>
            <Button variant="stop" onClick={onResetDefault}>Reset naar standaard</Button>
          </Row>
        </div>
      </Section>

      <Section title="Huidige vragen">
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
                    <select
                      value={question.category || "Algemeen"}
                      onChange={(event) => onChangeQuestionCategory(question.id, event.target.value)}
                      style={styles.select}
                    >
                      {categories.filter((category) => category !== "Alles").map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
