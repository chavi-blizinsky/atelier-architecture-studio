import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StudioStore } from '../core/studio.store';
import { PROJECT_TYPES, STAGES } from '../core/models';
import { ils } from '../core/agents';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div><h1>בוקר טוב 👋</h1><p>{{ store.today.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}</p></div>
      <span class="spacer"></span>
      <a class="btn" routerLink="/assistant">✦ לשאול את העוזרת</a>
      <a class="btn primary" routerLink="/planner">⌗ לעורך התכניות</a>
    </div>

    <div class="grid g4">
      <div class="card"><div class="num">{{ active() }}</div><span class="muted">פרויקטים פעילים</span></div>
      <div class="card"><div class="num">{{ ils(fees()) }}</div><span class="muted">שכר טרחה בתיק</span></div>
      <div class="card"><div class="num">{{ ils(open()) }}</div><span class="muted">יתרה לגבייה</span></div>
      <div class="card"><div class="num">{{ leads() }}</div><span class="muted">לידים חדשים</span></div>
    </div>

    <section class="card mt">
      <h2>הפרויקטים לפי שלב</h2>
      <div class="funnel">
        @for (s of stages; track s.id) {
          <div class="col">
            <div class="head"><b>{{ s.he }}</b><span class="chip">{{ byStage()[s.id].length }}</span></div>
            @for (p of byStage()[s.id]; track p.id) {
              <a class="proj" routerLink="/projects">
                <b>{{ p.name }}</b>
                <span class="muted">{{ store.client(p.clientId).name }} · {{ types[p.type] }}</span>
                <div class="meter"><span [style.width.%]="p.fee ? (p.paid / p.fee) * 100 : 0"></span></div>
              </a>
            }
          </div>
        }
      </div>
    </section>

    <div class="grid g2 mt">
      <section class="card">
        <h2>אבני דרך קרובות</h2>
        @for (m of upcoming(); track m.id) {
          <div class="ms"><span class="date">{{ m.end.slice(8, 10) }}/{{ m.end.slice(5, 7) }}</span><div><b>{{ m.name }}</b><div class="muted">{{ store.project(m.projectId)?.name }}</div></div></div>
        }
      </section>
      <section class="card">
        <h2>כלים מהירים</h2>
        <div class="grid g2 tools">
          <a routerLink="/planner" class="tool">⌗<b>שרטוט תכנית</b><span>קירות, חדרים ושטחים</span></a>
          <a routerLink="/3d" class="tool">◭<b>הדמיית תלת-ממד</b><span>כולל מסלול השמש</span></a>
          <a routerLink="/estimate" class="tool">∑<b>כתב כמויות</b><span>מחושב מהשרטוט</span></a>
          <a routerLink="/proposals" class="tool">✎<b>הצעת מחיר</b><span>סוכן מנסח, הלקוח חותם</span></a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .funnel { display: grid; grid-template-columns: repeat(6, minmax(150px, 1fr)); gap: 10px; overflow-x: auto; }
    .col { background: color-mix(in srgb, var(--paper) 70%, transparent); border-radius: 12px; padding: 10px; min-height: 140px; }
    .head { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .proj { display: grid; gap: 3px; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 10px; margin-bottom: 8px; text-decoration: none; color: var(--ink); font-size: 13px; }
    .meter { height: 4px; background: var(--line); border-radius: 4px; overflow: hidden; span { display: block; height: 100%; background: var(--accent-2); } }
    .ms { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
    .date { width: 54px; height: 44px; display: grid; place-items: center; border-radius: 10px; background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); font-weight: 700; }
    .tools { gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tool { display: grid; gap: 2px; padding: 14px; border-radius: 12px; border: 1px solid var(--line); text-decoration: none; color: var(--ink); font-size: 22px;
      b { font-size: 15px; } span { font-size: 12px; color: var(--muted); } &:hover { border-color: var(--accent); } }
  `],
})
export class DashboardComponent {
  readonly store = inject(StudioStore);
  readonly ils = ils;
  readonly stages = STAGES;
  readonly types = PROJECT_TYPES;
  readonly active = computed(() => this.store.projects().filter(p => !['lead', 'handover'].includes(p.stage)).length);
  readonly leads = computed(() => this.store.projects().filter(p => p.stage === 'lead').length);
  readonly fees = computed(() => this.store.projects().reduce((s, p) => s + p.fee, 0));
  readonly open = computed(() => this.store.projects().reduce((s, p) => s + p.fee - p.paid, 0));
  readonly byStage = computed(() => Object.fromEntries(STAGES.map(s => [s.id, this.store.projects().filter(p => p.stage === s.id)])) as Record<string, ReturnType<StudioStore['projects']>>);
  readonly upcoming = computed(() => this.store.data().milestones.filter(m => !m.done).sort((a, b) => a.end.localeCompare(b.end)).slice(0, 5));
}
