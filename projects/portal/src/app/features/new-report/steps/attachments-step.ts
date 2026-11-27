import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-attachments-step',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Anexos"
    description="Evidências opcionais. Os metadados dos arquivos são removidos antes de guardar."
  />`,
})
export class AttachmentsStep {}
