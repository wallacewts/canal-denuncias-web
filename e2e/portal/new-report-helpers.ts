import { expect, type Page } from '@playwright/test';

/** Descrição curta mas válida (100 caracteres), com caracteres especiais. */
export const DESCRIPTION =
  'Planilha com CPFs <clientes> & "salários" enviada ao e-mail pessoal.\n'.padEnd(100, 'x');

/** Confere que o foco está no título da etapa e que o progresso aponta a etapa certa (FR-006, FR-007). */
export async function expectStep(page: Page, title: string, index: number) {
  await expect(page.locator('h1')).toHaveText(title);
  await expect(page.locator('h1')).toBeFocused();
  const current = page
    .getByRole('navigation', { name: 'Progresso da denúncia' })
    .locator('[aria-current="step"]');
  await expect(current).toContainText(`${index}`);
  await expect(current).toContainText(title);
}

/** Preenche o wizard com o mínimo e chega à revisão. */
export async function fillMinimalReport(page: Page) {
  await page.goto('/nova-denuncia/tipo');
  await expectStep(page, 'Tipo de denunciante', 1);
  await page.getByRole('radio', { name: 'Colaborador' }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expectStep(page, 'Categoria', 2);
  await page.getByRole('radio', { name: 'Vazamento de dados' }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expectStep(page, 'Relato', 3);
  await page.getByLabel('Descrição').fill(DESCRIPTION);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expectStep(page, 'Envolvidos', 4);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expectStep(page, 'Revisão', 5);
}
