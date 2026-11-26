import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudioStore } from '../core/studio.store';
import { billOfQuantities } from '../core/geometry';
import { ils } from '../core/agents';

@Component({
  selector: 'app-estimate',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="page-head">
      <div><h1>כתב כמויות ועלויות</h1><p>מחושב אוטומטית מהשרטוט: ריצוף ופחת, צבע לפי כיסוי, חיפוי חדרים רטובים, פאנלים, תאורה ומשטחים</p></div>
      <span class="spacer"></span>
      <button class="btn" (click)="csv()">⤓ אקסל</button>
      <button class="btn primary" (click)="print()">🖨 הדפסה / PDF</button>
    </div>

    <div class="grid g4">
      <div class="card"><div class="num">{{ materialsTotal() }}</div><span class="muted">חומרים</span></div>
      <div class="card"><div class="num">{{ labour() }}</div><span class="muted">עבודה (הערכה {{ labourPct() }}%)</span></div>
      <div class="card"><div class="num">{{ vat() }}</div><span class="muted">מע״מ 18%</span></div>
      <div class="card total"><div class="num">{{ grand() }}</div><span>סה״כ משוער לפרויקט</span></div>
    </div>

    <div class="grid g2 mt">
      <section class="card">
        <div class="row"><h2>כתב כמויות – {{ store.plan().name }}</h2><span class="spacer"></span>
          <label class="row no-print">גוון קירות
            <select [ngModel]="paintId()" (ngModelChange)="paintId.set($event)">
              @for (p of paints(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
            </select>
          </label>
        </div>
        <table>
          <thead><tr><th>סעיף</th><th>כמות</th><th>מחיר יח׳</th><th>סה״כ</th><th>ספק</th></tr></thead>
          <tbody>
            @for (l of lines(); track l.key) {
              <tr>
                <td>{{ l.label }}<br /><small class="muted">{{ l.note }}</small></td>
                <td>{{ l.quantity | number }} {{ l.unit }}</td>
                <td>{{ l.material ? ils(l.material.price) : '—' }}</td>
                <td><b>{{ ils(l.total) }}</b></td>
                <td>
                  @if (l.material && store.supplier(l.material.supplierId); as s) {
                    <a [href]="s.url" target="_blank" rel="noopener">{{ s.name }} ↗</a>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
        <label class="mt no-print">אחוז עבודה (מעל החומרים): {{ labourPct() }}%
          <input type="range" min="40" max="160" [ngModel]="labourPct()" (ngModelChange)="labourPct.set(+$event)" />
        </label>
      </section>

      <section class="card">
        <h2>רשימות הזמנה לפי ספק</h2>
        <p class="muted">כל ספק מקבל רשימה משלו. לחיצה על "שליחה" פותחת מייל מוכן להזמנה.</p>
        @for (g of bySupplier(); track g.supplier.id) {
          <div class="sup">
            <div class="row"><b>{{ g.supplier.name }}</b><span class="chip sage">{{ ils(g.total) }}</span><span class="spacer"></span>
              <a class="btn" [href]="g.supplier.url" target="_blank" rel="noopener">לאתר ↗</a>
              <a class="btn" [href]="mailto(g)">✉ שליחה</a>
            </div>
            <ul>@for (l of g.lines; track l.key) { <li>{{ l.material?.name }} – {{ l.quantity }} {{ l.unit }}</li> }</ul>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .total { background: var(--ink); color: var(--paper); span { color: var(--paper); opacity: .7; } }
    .sup { border-top: 1px solid var(--line); padding: 12px 0; ul { margin: 6px 0 0; padding-inline-start: 18px; font-size: 13px; color: var(--ink-2); } }
  `],
})
export class EstimateComponent {
  readonly store = inject(StudioStore);
  readonly ils = ils;
  readonly paintId = signal('m-paint-white');
  readonly labourPct = signal(85);
  readonly paints = computed(() => this.store.materials().filter(m => m.category === 'paint'));
  readonly lines = computed(() => billOfQuantities(this.store.plan(), this.store.materials(), this.paintId()));
  private readonly mat = computed(() => this.lines().reduce((s, l) => s + l.total, 0));
  readonly materialsTotal = computed(() => ils(this.mat()));
  readonly labour = computed(() => ils((this.mat() * this.labourPct()) / 100));
  readonly vat = computed(() => ils(this.mat() * (1 + this.labourPct() / 100) * 0.18));
  readonly grand = computed(() => ils(this.mat() * (1 + this.labourPct() / 100) * 1.18));

  readonly bySupplier = computed(() => {
    const groups = new Map<string, { supplier: NonNullable<ReturnType<StudioStore['supplier']>>; lines: ReturnType<typeof billOfQuantities>; total: number }>();
    for (const l of this.lines()) {
      const s = l.material && this.store.supplier(l.material.supplierId);
      if (!s) continue;
      const g = groups.get(s.id) ?? { supplier: s, lines: [], total: 0 };
      g.lines.push(l);
      g.total += l.total;
      groups.set(s.id, g);
    }
    return [...groups.values()].sort((a, b) => b.total - a.total);
  });

  mailto(g: { supplier: { name: string }; lines: { material?: { name: string }; quantity: number; unit: string }[] }) {
    const body = `שלום ${g.supplier.name},\nנבקש הצעת מחיר / הזמנה עבור:\n` + g.lines.map(l => `- ${l.material?.name}: ${l.quantity} ${l.unit}`).join('\n') + '\n\nתודה,\nאטליה – אדריכלות ועיצוב פנים';
    return `mailto:?subject=${encodeURIComponent('הזמנת חומרים – ' + this.store.plan().name)}&body=${encodeURIComponent(body)}`;
  }

  csv() {
    const rows = [['סעיף', 'כמות', 'יחידה', 'מחיר', 'סה"כ'], ...this.lines().map(l => [l.label, l.quantity, l.unit, l.material?.price ?? '', l.total])];
    const text = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = 'boq.csv';
    a.click();
  }
  print() { window.print(); }
}
