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
  onAddQuestions,
  onCopyAll,
  onResetDefault,
  onRemoveQuestion,
}) {
  return (
    <>
      <Section title="Nieuwe vragen (gescheiden met , of enter)">
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
          <p style={{ opacity: 0.7 }}>Nog geen vragen toegevoegd.</p>
        ) : (
          <ul style={styles.list}>
            {questions.map((question) => (
              <li key={question.id} style={styles.li}>
                <div style={styles.liText}>{question.tekst}</div>
                <DangerButton onClick={() => onRemoveQuestion(question.id)}>❌</DangerButton>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
