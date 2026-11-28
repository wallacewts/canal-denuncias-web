import { Pipe, type PipeTransform } from '@angular/core';
import { formatAppDate } from './format-date';

/** Data e hora exatas para a equipe (dd/MM/yyyy HH:mm:ss, decisão D25). */
@Pipe({ name: 'staffDateTime' })
export class StaffDateTimePipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    return formatAppDate(value, 'dd/MM/yyyy HH:mm:ss');
  }
}
