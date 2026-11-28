import { Pipe, type PipeTransform } from '@angular/core';
import { formatAppDate } from './format-date';

/** Data para o denunciante: só o dia, sem hora (dd/MM/yyyy). Reduz a chance de cruzar horários com outros registros. */
@Pipe({ name: 'portalDate' })
export class PortalDatePipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    return formatAppDate(value, 'dd/MM/yyyy');
  }
}
