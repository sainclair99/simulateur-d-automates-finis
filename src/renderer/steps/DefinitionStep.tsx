import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { validateDefinitionDraft } from '../../application';
import type { DefinitionDraft, LanguageDefinition } from '../../application';
import { AlphabetField } from './definition/AlphabetField';
import { RegexField } from './definition/RegexField';
import { StatesEditor } from './definition/StatesEditor';

interface Props {
  readonly draft: DefinitionDraft;
  readonly onDraftChange: (draft: DefinitionDraft) => void;
  readonly onSubmit: (definition: LanguageDefinition) => void;
}

export function DefinitionStep({ draft, onDraftChange, onSubmit }: Props) {
  const validation = useMemo(() => validateDefinitionDraft(draft), [draft]);
  const [submitted, setSubmitted] = useState(false);
  const errors = validation.ok ? null : validation.errors;

  const showAlphabetError = submitted || draft.alphabet.length > 0;
  const showRegexError = submitted || draft.regex.trim() !== '';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (validation.ok) onSubmit(validation.definition);
  };

  return (
    <main className="screen">
      <h1>1. Définition du langage</h1>
      <p className="hint">Définis l'alphabet, le langage (expression régulière) et les états de ton automate.</p>

      <form onSubmit={handleSubmit} noValidate>
        <AlphabetField
          symbols={draft.alphabet}
          error={showAlphabetError ? (errors?.alphabet ?? null) : null}
          onAdd={(text) => onDraftChange(draft.withSymbolsAdded(text))}
          onRemove={(symbol) => onDraftChange(draft.withoutSymbol(symbol))}
        />
        <RegexField
          value={draft.regex}
          issue={showRegexError ? (errors?.regex ?? null) : null}
          onChange={(value) => onDraftChange(draft.withRegex(value))}
        />
        <StatesEditor
          states={draft.states}
          rowErrors={errors?.stateNames ?? {}}
          error={errors?.states ?? null}
          onAdd={() => onDraftChange(draft.withStateAdded())}
          onRemove={(key) => onDraftChange(draft.withoutState(key))}
          onRename={(key, name) => onDraftChange(draft.withStateRenamed(key, name))}
          onSelectInitial={(key) => onDraftChange(draft.withInitialState(key))}
          onToggleFinal={(key) => onDraftChange(draft.withFinalToggled(key))}
        />

        <div className="actions">
          {submitted && !validation.ok && <p className="error">Corrige les erreurs signalées ci-dessus.</p>}
          <button type="submit" className="primary">
            Continuer vers la construction →
          </button>
        </div>
      </form>
    </main>
  );
}
