import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StudioStore } from './core/studio.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside>
        <div class="brand">
          <div class="logo">א</div>
          <div><b>אטליה</b><span>אדריכלות ועיצוב פנים</span></div>
        </div>
        <nav>
          @for (group of nav; track group.title) {
            <small>{{ group.title }}</small>
            @for (item of group.items; track item.path) {
              <a [routerLink]="item.path" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: item.path === '/' }">
                <span class="ic">{{ item.icon }}</span>{{ item.label }}
              </a>
            }
          }
        </nav>
        <div class="foot">
          <button class="btn" (click)="toggleDark()">{{ dark() ? '☀️ מצב בהיר' : '🌙 מצב כהה' }}</button>
          <button class="btn" (click)="store.reset()">↺ איפוס הדגמה</button>
        </div>
      </aside>
      <main><router-outlet /></main>
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; }
    aside { width: 250px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow: auto; padding: 22px 16px; display: flex; flex-direction: column;
      background: var(--card); border-inline-start: 1px solid var(--line); }
    .brand { display: flex; gap: 12px; align-items: center; margin: 0 6px 22px;
      b { font-family: 'Frank Ruhl Libre', serif; font-size: 22px; display: block; }
      span { font-size: 12px; color: var(--muted); } }
    .logo { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; color: #fff; font-family: 'Frank Ruhl Libre', serif; font-size: 24px;
      background: linear-gradient(135deg, var(--accent), var(--gold)); }
    nav { display: grid; gap: 2px; }
    nav small { color: var(--muted); font-size: 11px; margin: 14px 10px 4px; letter-spacing: .05em; }
    nav a { display: flex; gap: 10px; align-items: center; padding: 9px 10px; border-radius: 10px; color: var(--ink); text-decoration: none; font-size: 14px; }
    nav a:hover { background: color-mix(in srgb, var(--accent) 7%, transparent); }
    nav a.on { background: var(--ink); color: var(--paper); }
    .ic { width: 20px; text-align: center; }
    .foot { margin-top: auto; display: grid; gap: 8px; padding-top: 16px; }
    main { flex: 1; padding: 28px 34px; min-width: 0; }
    @media (max-width: 900px) {
      .shell { flex-direction: column; }
      aside { width: auto; height: auto; position: static; }
      nav { grid-template-columns: repeat(2, 1fr); }
      main { padding: 18px 16px; }
    }
  `],
})
export class AppComponent {
  readonly store = inject(StudioStore);
  readonly dark = signal(this.readTheme());

  readonly nav = [
    { title: 'המשרד', items: [
      { path: '/', icon: '◧', label: 'לוח בקרה' },
      { path: '/projects', icon: '▦', label: 'פרויקטים ולוח זמנים' },
      { path: '/assistant', icon: '✦', label: 'עוזרת AI' },
    ] },
    { title: 'תכנון', items: [
      { path: '/planner', icon: '⌗', label: 'עורך תכניות' },
      { path: '/3d', icon: '◭', label: 'תצוגת תלת-ממד' },
      { path: '/moodboard', icon: '◐', label: 'לוח השראה וצבעים' },
    ] },
    { title: 'כסף וחוזים', items: [
      { path: '/estimate', icon: '∑', label: 'כתב כמויות ועלויות' },
      { path: '/suppliers', icon: '⛁', label: 'ספקים וחומרים' },
      { path: '/proposals', icon: '✎', label: 'הצעות מחיר' },
      { path: '/contracts', icon: '§', label: 'חוזה ומפרט לקבלן' },
    ] },
  ];

  constructor() { this.applyTheme(); }

  toggleDark() { this.dark.update(v => !v); this.applyTheme(); }

  private readTheme(): boolean {
    try { return localStorage.getItem('atelier-theme') === 'dark'; } catch { return false; }
  }
  private applyTheme() {
    document.documentElement.classList.toggle('dark', this.dark());
    try { localStorage.setItem('atelier-theme', this.dark() ? 'dark' : 'light'); } catch { /* ignore */ }
  }
}
