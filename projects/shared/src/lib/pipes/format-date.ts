import { formatDate } from '@angular/common';
import { APP_LOCALE } from '../i18n/provide-locale';

/** Formata no fuso do navegador. Valor vazio ou inválido vira texto vazio (nunca "Invalid Date"). */
export function formatAppDate(value: Date | string | null | undefined, format: string): string {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDate(date, format, APP_LOCALE);
}
