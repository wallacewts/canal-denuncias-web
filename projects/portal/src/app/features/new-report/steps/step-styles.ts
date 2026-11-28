/** Estilos comuns das etapas do wizard (lista de opções e barra de ações). */
export const STEP_STYLES = `
  .options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-block: 1rem;
  }
  .hint {
    display: block;
    color: var(--mat-sys-on-surface-variant);
    font: var(--mat-sys-body-small);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1rem;
    align-items: center;
    margin-block-start: 1.5rem;
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
  legend {
    font: var(--mat-sys-title-small);
    margin-block-end: 0.25rem;
  }
`;
