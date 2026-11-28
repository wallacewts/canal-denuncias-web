import { formatDate } from '@angular/common';
import { APP_LOCALE } from '../i18n/provide-locale';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Data sem hora (`AAAA-MM-DD`) é um dia do calendário: lida no fuso local, não como meia-noite UTC. */
function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  const day = DATE_ONLY.exec(value);
  return day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(value);
}

/**
 * Formata no fuso do navegador. Valor vazio ou inválido vira texto vazio (nunca "Invalid Date"). Uma data sem hora
 * (`AAAA-MM-DD`, como `receivedOn` da API) mostra sempre o mesmo dia, em qualquer fuso.
 */
export function formatAppDate(value: Date | string | null | undefined, format: string): string {
  if (value === null || value === undefined || value === '') return '';
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDate(date, format, APP_LOCALE);
}
