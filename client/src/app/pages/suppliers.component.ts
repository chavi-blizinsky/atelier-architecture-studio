import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudioStore } from '../core/studio.store';
import { MaterialCategory } from '../core/models';
import { ils } from '../core/agents';

const CAT_HE: Record<MaterialCategory, string> = {
  paint: 'צבע', tiles: 'חיפוי', flooring: 'ריצוף', board: 'גבס', sanitary: 'כלים סניטריים', lighting: 'תאורה', kitchen: 'מטבח', skirting: 'פאנלים',
};

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div><h1>ספקים וחומרים</h1><p>קטלוג חומרי הגמר של המשרד, עם קישורים ישירים לאתרי הספקים, השוואת מחירים וחיפוש</p></div>
    </div>

    <div class="grid g3">
      @for (s of store.suppliers(); track s.id) {
        <a class="card sup" [href]="s.url" target="_blank" rel="noopener">
          <div class="row"><div class="logo">{{ s.name[0] }}</div><div><b>{{ s.name }}</b><div class="muted">{{ s.note }}</div></div></div>
          <div class="row mt">@for (c of s.categories; track c) { <span class="chip">{{ CAT_HE[c] }}</span> }<span class="spacer"></span><span class="go">לאתר ↗</span></div>
        </a>
      }
    </div>

    <section class="card mt">
      <div class="row">
        <h2>קטלוג חומרים</h2><span class="spacer"></span>
        <input placeholder="חיפוש…" [ngModel]="q()" (ngModelChange)="q.set($event)" />
        <select [ngModel]="cat()" (ngModelChange)="cat.set($event)">
          <option value="">כל הקטגוריות</option>
          @for (c of cats; track c) { <option [value]="c">{{ CAT_HE[c] }}</option> }
        </select>
      </div>
      <table>
        <thead><tr><th></th><th>חומר</th><th>קטגוריה</th><th>מחיר</th><th>ספק</th></tr></thead>
        <tbody>
          @for (m of rows(); track m.id) {
            <tr>
              <td>@if (m.hex) { <span class="sw" [style.background]="m.hex"></span> }</td>
              <td>{{ m.name }}</td>
              <td><span class="chip sage">{{ CAT_HE[m.category] }}</span></td>
              <td>{{ ils(m.price) }} / {{ m.unit }}</td>
              <td>@if (store.supplier(m.supplierId); as s) { <a [href]="s.url" target="_blank" rel="noopener">{{ s.name }} ↗</a> }</td>
            </tr>
          }
        </tbody>
      </table>
    </section>
  `,
  styles: [`
    .sup { color: var(--ink); text-decoration: none; transition: .15s; &:hover { transform: translateY(-2px); border-color: var(--accent); } }
    .logo { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; font: 700 22px 'Frank Ruhl Libre'; color: #fff; background: var(--accent-2); }
    .go { color: var(--accent); font-size: 13px; }
    .sw { display: inline-block; width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--line); }
  `],
})
export class SuppliersComponent {
  readonly store = inject(StudioStore);
  readonly ils = ils;
  readonly CAT_HE = CAT_HE;
  readonly cats = Object.keys(CAT_HE) as MaterialCategory[];
  readonly q = signal('');
  readonly cat = signal<MaterialCategory | ''>('');
  readonly rows = computed(() => this.store.materials().filter(m => (!this.cat() || m.category === this.cat()) && m.name.includes(this.q())));
}
