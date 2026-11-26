import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudioStore } from '../core/studio.store';
import { billOfQuantities } from '../core/geometry';
import { draftContractorSpec } from '../core/agents';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div><h1>חוזה ומפרט לקבלן</h1><p>חוזה התקשרות עם כתב כמויות שנבנה אוטומטית מהשרטוט, כולל תנאי תשלום, עכבון ובדק</p></div>
      <span class="spacer"></span>
      <button class="btn primary" (click)="print()">🖨 הדפסה / PDF</button>
    </div>
    <div class="grid g2">
      <section class="card no-print">
        <label>שם הקבלן<input [ngModel]="contractor()" (ngModelChange)="contractor.set($event)" placeholder="לדוגמה: א.ב. בנייה ושיפוצים" /></label>
        <label class="mt">משך העבודה (ימי עבודה)<input type="number" [ngModel]="days()" (ngModelChange)="days.set(+$event)" /></label>
        <p class="muted mt">הפרויקט: {{ project().name }} · התכנית: {{ store.plan().name }}</p>
      </section>
      <section class="card"><pre>{{ text() }}</pre></section>
    </div>
  `,
  styles: [`pre { white-space: pre-wrap; font: 14px/1.8 'Heebo'; margin: 0; }`],
})
export class ContractsComponent {
  readonly store = inject(StudioStore);
  readonly contractor = signal('');
  readonly days = signal(75);
  readonly project = computed(() => this.store.projects().find(p => p.planId === this.store.plan().id) ?? this.store.projects()[0]);
  readonly text = computed(() => {
    const p = this.project();
    return draftContractorSpec(p, this.store.client(p.clientId), billOfQuantities(this.store.plan(), this.store.materials()), this.contractor(), this.days());
  });
  print() { window.print(); }
}
