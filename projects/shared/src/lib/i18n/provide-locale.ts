import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID, type Provider } from '@angular/core';

/** Locale único dos dois apps. */
export const APP_LOCALE = 'pt-BR';

registerLocaleData(localePt, APP_LOCALE);

/** Define `pt-BR` como locale do app (datas, números e pipes do Angular). */
export function provideLocale(): Provider {
  return { provide: LOCALE_ID, useValue: APP_LOCALE };
}
