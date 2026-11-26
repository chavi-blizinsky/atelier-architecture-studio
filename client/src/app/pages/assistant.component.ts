import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudioStore } from '../core/studio.store';
import { claudeAssistant, localAssistant, TOOLS } from '../core/agents';

interface Msg { me: boolean; text: string }

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head"><div><h1>עוזרת AI</h1><p>סוכנת שמכירה את כל המשרד: יתרות, דדליינים, סטטוס פרויקטים ועומס. היא עונה מהנתונים עצמם.</p></div></div>
    <div class="grid layout">
      <section class="card chat">
        <div class="msgs">
          @for (m of msgs(); track $index) { <div class="msg" [class.me]="m.me">{{ m.text }}</div> }
          @if (busy()) { <div class="msg">חושבת…</div> }
        </div>
        <div class="row">
          @for (s of suggestions; track s) { <button class="btn" (click)="ask(s)">{{ s }}</button> }
        </div>
        <form class="row mt" (ngSubmit)="ask(input)">
          <input name="q" [(ngModel)]="input" placeholder="מה תרצי לדעת?" style="flex:1" />
          <button class="btn primary" [disabled]="busy()">שליחה</button>
        </form>
      </section>
      <section class="card">
        <h2>מנוע</h2>
        <p class="muted">{{ key() ? 'מחובר ל-Claude – הסוכנת בוחרת בעצמה באילו כלים להשתמש.' : 'מצב מקומי – ניתוב כוונות בעברית לאותם כלים. אפשר לחבר מפתח Claude.' }}</p>
        <label>מפתח Claude API (נשמר רק בלשונית)<input type="password" dir="ltr" [ngModel]="key()" (ngModelChange)="setKey($event)" placeholder="sk-ant-…" /></label>
        <h2 class="mt">כלים</h2>
        <ul class="tools">@for (t of tools; track t.name) { <li><code>{{ t.name }}</code> – {{ t.description }}</li> }</ul>
      </section>
    </div>
  `,
  styles: [`
    .layout { grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr); }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
    .chat { display: flex; flex-direction: column; height: 70vh; }
    .msgs { flex: 1; overflow: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
    .msg { max-width: 80%; white-space: pre-line; padding: 12px 14px; border-radius: 14px; background: color-mix(in srgb, var(--paper) 80%, transparent); font-size: 14px; }
    .msg.me { align-self: flex-start; background: var(--ink); color: var(--paper); }
    .tools { font-size: 13px; padding-inline-start: 18px; code { color: var(--accent); } }
  `],
})
export class AssistantComponent {
  private readonly store = inject(StudioStore);
  readonly tools = TOOLS;
  readonly suggestions = ['מי עוד לא שילם?', 'מה הדדליינים הקרובים?', 'איפה עומד כל פרויקט?', 'תני לי סיכום עומס'];
  readonly msgs = signal<Msg[]>([{ me: false, text: 'שלום! אני העוזרת של המשרד. אפשר לשאול אותי על יתרות פתוחות, אבני דרך, סטטוס פרויקטים ועומס עבודה.' }]);
  readonly busy = signal(false);
  readonly key = signal(this.readKey());
  input = '';

  private readKey() { try { return sessionStorage.getItem('atelier-claude-key') ?? ''; } catch { return ''; } }
  setKey(v: string) { this.key.set(v); try { sessionStorage.setItem('atelier-claude-key', v); } catch { /* ignore */ } }

  async ask(q: string) {
    if (!q.trim() || this.busy()) return;
    this.input = '';
    this.msgs.update(m => [...m, { me: true, text: q }]);
    this.busy.set(true);
    const d = this.store.data(), today = this.store.today;
    let answer: string;
    try { answer = this.key() ? await claudeAssistant(q, this.key(), d, today) : localAssistant(q, d, today); }
    catch (e) { answer = `(Claude לא זמין: ${(e as Error).message})\n\n${localAssistant(q, d, today)}`; }
    this.msgs.update(m => [...m, { me: false, text: answer }]);
    this.busy.set(false);
  }
}
