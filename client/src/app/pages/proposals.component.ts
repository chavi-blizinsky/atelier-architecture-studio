import { AfterViewInit, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudioStore } from '../core/studio.store';
import { draftProposal, ils, ProposalDraft } from '../core/agents';

@Component({
  selector: 'app-proposals',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div><h1>הצעות מחיר</h1><p>סוכן שקורא את תיאור הפרויקט, מזהה את היקף העבודה, מתמחר ומנסח הצעה. הלקוח חותם על המסך.</p></div>
    </div>
    <div class="grid g2">
      <section class="card no-print">
        <h2>1. בריף</h2>
        <label>פרויקט
          <select [ngModel]="projectId()" (ngModelChange)="projectId.set($event); draft.set(null)">
            @for (p of store.projects(); track p.id) { <option [value]="p.id">{{ p.name }} – {{ store.client(p.clientId).name }}</option> }
          </select>
        </label>
        <label class="mt">מה הלקוח ביקש? (טקסט חופשי)
          <textarea rows="5" [ngModel]="brief()" (ngModelChange)="brief.set($event)"></textarea>
        </label>
        <div class="row mt">
          @for (b of examples; track b) { <button class="btn" (click)="brief.set(b)">{{ b.slice(0, 26) }}…</button> }
        </div>
        <button class="btn primary mt" (click)="generate()">✦ ניסוח הצעה</button>
        @if (draft(); as d) {
          <h2 class="mt">איך הסוכן חישב</h2>
          <ul class="reason">@for (r of d.reasoning; track $index) { <li>{{ r }}</li> }</ul>
        }
      </section>

      <section class="card doc">
        @if (draft(); as d) {
          <div class="letterhead"><b>אטליה</b> · אדריכלות ועיצוב פנים<span class="spacer"></span>{{ today }}</div>
          <textarea class="body" rows="22" [ngModel]="d.text" (ngModelChange)="edit($event)"></textarea>
          <div class="sign">
            <div>
              <span class="muted">חתימת הלקוח</span>
              <canvas #pad width="360" height="120" (pointerdown)="startSign($event)" (pointermove)="drawSign($event)" (pointerup)="drawing = false"></canvas>
              <div class="row no-print"><button class="btn" (click)="clearSign()">ניקוי</button></div>
            </div>
            <div class="row no-print">
              <button class="btn sage" (click)="sign(d)">✓ שמירה כחתומה</button>
              <button class="btn" (click)="print()">🖨 PDF</button>
              <a class="btn" [href]="whatsapp(d)" target="_blank" rel="noopener">שליחה בוואטסאפ</a>
            </div>
          </div>
          @if (saved()) { <p class="chip sage">נחתם ונשמר · {{ ils(d.total) }}</p> }
        } @else {
          <p class="muted">בחרו פרויקט, כתבו מה הלקוח ביקש ולחצו "ניסוח הצעה".</p>
        }
      </section>
    </div>
  `,
  styles: [`
    .reason { font-size: 13px; color: var(--ink-2); padding-inline-start: 18px; line-height: 1.8; }
    .doc { min-height: 560px; }
    .letterhead { display: flex; gap: 6px; border-bottom: 2px solid var(--accent); padding-bottom: 10px; margin-bottom: 12px; font-size: 14px; b { font-family: 'Frank Ruhl Libre'; font-size: 20px; } }
    .body { border: none; padding: 0; font-size: 15px; line-height: 1.75; min-height: 380px; box-shadow: none !important; }
    .sign { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-top: 10px; }
    canvas { display: block; border-bottom: 1px solid var(--ink); background: color-mix(in srgb, var(--paper) 50%, transparent); touch-action: none; cursor: crosshair; }
  `],
})
export class ProposalsComponent implements AfterViewInit {
  readonly store = inject(StudioStore);
  readonly ils = ils;
  readonly today = this.store.today.toLocaleDateString('he-IL');
  readonly examples = [
    'שיפוץ קומפלט כולל מטבח חדש, תכנית תאורה והדמיות, ופיקוח עליון בביצוע',
    'הרחבה של 25 מ״ר כולל היתר, ועדה ותכנון חדרי ילדים',
    'עיצוב חדרי ילדים עם נגרות וליווי בקניות רהיטים',
  ];
  readonly projectId = signal('p5');
  readonly brief = signal(this.examples[0]);
  readonly draft = signal<ProposalDraft | null>(null);
  readonly saved = signal(false);
  private readonly pad = viewChild<ElementRef<HTMLCanvasElement>>('pad');
  private readonly project = computed(() => this.store.project(this.projectId())!);
  drawing = false;

  ngAfterViewInit() { this.generate(); }

  generate() {
    const p = this.project();
    this.draft.set(draftProposal(p, this.store.client(p.clientId), this.brief()));
    this.saved.set(false);
  }
  edit(text: string) { const d = this.draft(); if (d) this.draft.set({ ...d, text }); }

  private ctx() { return this.pad()?.nativeElement.getContext('2d') ?? null; }
  startSign(e: PointerEvent) {
    const g = this.ctx(); if (!g) return;
    this.drawing = true;
    g.lineWidth = 2.4; g.lineCap = 'round'; g.strokeStyle = '#1f1b16';
    g.beginPath(); g.moveTo(e.offsetX, e.offsetY);
  }
  drawSign(e: PointerEvent) { const g = this.ctx(); if (this.drawing && g) { g.lineTo(e.offsetX, e.offsetY); g.stroke(); } }
  clearSign() { const c = this.pad()?.nativeElement; c?.getContext('2d')?.clearRect(0, 0, c.width, c.height); }

  sign(d: ProposalDraft) {
    const p = this.project();
    this.store.addProposal({ id: `pr-${p.id}`, projectId: p.id, createdAt: this.today, scope: d.scope, total: d.total, stages: d.stages, text: d.text, signature: this.pad()?.nativeElement.toDataURL(), signedAt: this.today });
    this.store.updateProject({ ...p, fee: d.total, stage: p.stage === 'lead' ? 'concept' : p.stage });
    this.saved.set(true);
  }
  whatsapp(d: ProposalDraft) {
    const phone = this.store.client(this.project().clientId).phone.replace(/\D/g, '').replace(/^0/, '972');
    return `https://wa.me/${phone}?text=${encodeURIComponent(d.text)}`;
  }
  print() { window.print(); }
}
