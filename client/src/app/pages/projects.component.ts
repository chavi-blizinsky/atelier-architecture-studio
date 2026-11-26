import { Component, computed, inject } from '@angular/core';
import { StudioStore } from '../core/studio.store';
import { PROJECT_TYPES, Project, STAGES, Stage } from '../core/models';
import { ils } from '../core/agents';

const DAY = 86400000;

@Component({
  selector: 'app-projects',
  standalone: true,
  template: `
    <div class="page-head"><div><h1>פרויקטים ולוח זמנים</h1><p>מעבר בין שלבים, גבייה לפי התקדמות ותרשים גאנט לכל אבני הדרך</p></div></div>

    <section class="card">
      <table>
        <thead><tr><th>פרויקט</th><th>לקוח</th><th>שטח</th><th>תקציב ביצוע</th><th>שכר טרחה</th><th>נגבה</th><th>שלב</th></tr></thead>
        <tbody>
          @for (p of store.projects(); track p.id) {
            <tr>
              <td><b>{{ p.name }}</b><br /><small class="muted">{{ types[p.type] }} · {{ p.city }}</small></td>
              <td>{{ store.client(p.clientId).name }}<br /><small class="muted" dir="ltr">{{ store.client(p.clientId).phone }}</small></td>
              <td>{{ p.areaSqm }} מ״ר</td>
              <td>{{ ils(p.budget) }}</td>
              <td>{{ ils(p.fee) }}</td>
              <td><span class="chip" [class.sage]="p.paid >= p.fee && p.fee > 0">{{ p.fee ? ((p.paid / p.fee) * 100).toFixed(0) + '%' : '—' }}</span></td>
              <td>
                <select [value]="p.stage" (change)="move(p, $any($event.target).value)">
                  @for (s of stages; track s.id) { <option [value]="s.id" [selected]="s.id === p.stage">{{ s.he }}</option> }
                </select>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>

    <section class="card mt">
      <h2>גאנט – אבני דרך</h2>
      <div class="gantt">
        <div class="months">@for (m of months(); track m.label) { <span [style.inset-inline-start.%]="m.pos">{{ m.label }}</span> }</div>
        <div class="today" [style.inset-inline-start.%]="pos(store.today.getTime())"><span>היום</span></div>
        @for (row of rows(); track row.project.id) {
          <div class="grow">
            <div class="name">{{ row.project.name }}</div>
            <div class="track">
              @for (m of row.ms; track m.id) {
                <button class="bar" [class.done]="m.done" [style.inset-inline-start.%]="pos(time(m.start))" [style.width.%]="width(m.start, m.end)"
                  [title]="m.name + ' · ' + m.start + ' → ' + m.end" (click)="store.toggleMilestone(m.id)">{{ m.name }}</button>
              }
            </div>
          </div>
        }
      </div>
      <p class="muted">לחיצה על אבן דרך מסמנת אותה כבוצעה.</p>
    </section>
  `,
  styles: [`
    .gantt { position: relative; padding-top: 28px; }
    .months { position: relative; height: 20px; margin-inline-start: 200px; span { position: absolute; font-size: 11px; color: var(--muted); } }
    .today { position: absolute; top: 20px; bottom: 0; width: 2px; background: var(--accent); margin-inline-start: 200px; z-index: 2;
      span { position: absolute; top: -18px; font-size: 11px; color: var(--accent); white-space: nowrap; transform: translateX(50%); } }
    .grow { display: flex; align-items: center; min-height: 40px; border-bottom: 1px dashed var(--line); }
    .name { width: 200px; flex-shrink: 0; font-size: 13px; }
    .track { position: relative; flex: 1; height: 30px; }
    .bar { position: absolute; top: 4px; height: 22px; border: 0; border-radius: 6px; background: var(--accent); color: #fff; font: 11px 'Heebo'; overflow: hidden; white-space: nowrap; cursor: pointer; padding: 0 6px; }
    .bar.done { background: var(--accent-2); opacity: .75; }
  `],
})
export class ProjectsComponent {
  readonly store = inject(StudioStore);
  readonly ils = ils;
  readonly stages = STAGES;
  readonly types = PROJECT_TYPES;
  private readonly range = computed(() => {
    const ms = this.store.data().milestones;
    const min = Math.min(...ms.map(m => +new Date(m.start)));
    const max = Math.max(...ms.map(m => +new Date(m.end)));
    return { min, max: Math.max(max, min + 60 * DAY) };
  });
  readonly rows = computed(() => this.store.projects()
    .map(project => ({ project, ms: this.store.data().milestones.filter(m => m.projectId === project.id) }))
    .filter(r => r.ms.length));
  readonly months = computed(() => {
    const { min, max } = this.range();
    const out: { label: string; pos: number }[] = [];
    const d = new Date(min); d.setDate(1);
    while (+d <= max) { out.push({ label: d.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' }), pos: this.pos(+d) }); d.setMonth(d.getMonth() + 1); }
    return out;
  });

  pos(t: number) { const { min, max } = this.range(); return Math.max(0, Math.min(100, ((t - min) / (max - min)) * 100)); }
  width(a: string, b: string) { const { min, max } = this.range(); return Math.max(1.5, ((+new Date(b) - +new Date(a)) / (max - min)) * 100); }
  move(p: Project, stage: Stage) { this.store.updateProject({ ...p, stage }); }
  time(s: string) { return +new Date(s); }
}
