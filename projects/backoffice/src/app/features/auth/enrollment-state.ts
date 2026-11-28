import { Injectable } from '@angular/core';
import { ScreenState } from '@canal/shared';
import type { Enrollment } from './auth.types';

/**
 * Segredo do autenticador e códigos de recuperação, com escopo do componente-pai `/primeiro-acesso` (D35, R7). Somem
 * da memória quando a pessoa sai do primeiro acesso. Nada vai para o armazenamento do navegador.
 */
export interface EnrollmentData {
  readonly enrollment?: Enrollment;
  readonly recoveryCodes?: readonly string[];
}

@Injectable()
export class EnrollmentState extends ScreenState<EnrollmentData> {}
