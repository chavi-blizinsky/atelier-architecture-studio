import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudioStore } from '../core/studio.store';
import { Furniture, FurnitureKind, Plan, Pt, ROOM_TYPES, RoomType } from '../core/models';
import { billOfQuantities, centroid, checkRegulations, dist, pointInPolygon, pointOnWall, polygonArea, snap } from '../core/geometry';
import { ils } from '../core/agents';

type Tool = 'select' | 'wall' | 'room' | 'door' | 'window' | 'furniture';
type Selection = { kind: 'wall' | 'room' | 'furniture' | 'opening'; id: string } | null;

const FURNITURE: Record<FurnitureKind, { he: string; w: number; h: number }> = {
  sofa: { he: 'ספה', w: 220, h: 90 }, bed: { he: 'מיטה זוגית', w: 160, h: 200 }, table: { he: 'שולחן אוכל', w: 180, h: 90 },
  wardrobe: { he: 'ארון', w: 200, h: 60 }, desk: { he: 'שולחן עבודה', w: 140, h: 60 }, kitchen: { he: 'מטבח', w: 300, h: 60 },
  toilet: { he: 'אסלה', w: 40, h: 60 }, shower: { he: 'מקלחון', w: 90, h: 90 }, bunk: { he: 'מיטת קומתיים', w: 90, h: 200 },
};

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterLink],
  template: `
    <div class="page-head">
      <div><h1>עורך תכניות</h1><p>שרטוט קירות וחדרים עם הצמדה לגריד, חישוב שטחים ומידות בזמן אמת, ובדיקת תקנות</p></div>
      <span class="spacer"></span>
      <a class="btn" routerLink="/3d">◭ לתלת-ממד</a>
      <a class="btn primary" routerLink="/estimate">∑ לכתב הכמויות</a>
    </div>

    <div class="layout">
      <section class="card canvas-card">
        <div class="toolbar row no-print">
          @for (t of tools; track t.id) {
            <button class="btn" [class.active]="tool() === t.id" (click)="setTool(t.id)" [title]="t.hint">{{ t.icon }} {{ t.label }}</button>
          }
          @if (tool() === 'furniture') {
            <select [(ngModel)]="furnitureKind">
              @for (k of furnitureKinds; track k) { <option [value]="k">{{ FURNITURE[k].he }}</option> }
            </select>
          }
          <span class="spacer"></span>
          <button class="btn" (click)="undo()" [disabled]="!past.length" title="Ctrl+Z">↶</button>
          <button class="btn" (click)="redo()" [disabled]="!future.length" title="Ctrl+Y">↷</button>
          <button class="btn" (click)="zoom(0.85)">＋</button>
          <button class="btn" (click)="zoom(1.18)">－</button>
          <button class="btn" (click)="exportSvg()">⤓ SVG</button>
        </div>

        <svg #svg class="board" [attr.viewBox]="viewBox()" (pointerdown)="down($event)" (pointermove)="move($event)" (pointerup)="up()" (dblclick)="finishRoom()">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" stroke-opacity=".07" stroke-width="1"/></pattern>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#1f1b16" stroke-width="3"/></pattern>
          </defs>
          <rect x="-2000" y="-2000" width="6000" height="6000" fill="url(#grid)" />

          @for (r of plan().rooms; track r.id) {
            <polygon [attr.points]="pts(r.points)" [attr.fill]="roomColor(r.type)" [class.sel]="isSel('room', r.id)" (pointerdown)="pick($event, 'room', r.id)" />
          }
          @for (w of plan().walls; track w.id) {
            <line [attr.x1]="w.a[0]" [attr.y1]="w.a[1]" [attr.x2]="w.b[0]" [attr.y2]="w.b[1]" [attr.stroke-width]="w.thickness"
              class="wall" [class.sel]="isSel('wall', w.id)" (pointerdown)="pick($event, 'wall', w.id)" />
          }
          @for (o of openingShapes(); track o.id) {
            <g (pointerdown)="pick($event, 'opening', o.id)" [class.sel]="isSel('opening', o.id)">
              <line [attr.x1]="o.a[0]" [attr.y1]="o.a[1]" [attr.x2]="o.b[0]" [attr.y2]="o.b[1]" stroke="var(--card)" stroke-width="30" />
              @if (o.kind === 'window') {
                <line [attr.x1]="o.a[0]" [attr.y1]="o.a[1]" [attr.x2]="o.b[0]" [attr.y2]="o.b[1]" stroke="#5b8db8" stroke-width="8" />
              } @else {
                <path [attr.d]="o.arc" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="6 4" />
              }
            </g>
          }
          @for (f of plan().furniture; track f.id) {
            <g [attr.transform]="'translate(' + f.x + ' ' + f.y + ') rotate(' + f.rot + ' ' + f.w / 2 + ' ' + f.h / 2 + ')'"
               class="furn" [class.sel]="isSel('furniture', f.id)" (pointerdown)="pick($event, 'furniture', f.id)">
              <rect [attr.width]="f.w" [attr.height]="f.h" rx="8" />
              <text [attr.x]="f.w / 2" [attr.y]="f.h / 2 + 8" text-anchor="middle">{{ FURNITURE[f.kind].he }}</text>
            </g>
          }
          @for (w of plan().walls; track w.id) {
            @if (dist(w.a, w.b) > 120) {
              <text class="dim" [attr.x]="(w.a[0] + w.b[0]) / 2" [attr.y]="(w.a[1] + w.b[1]) / 2 - 18" text-anchor="middle">{{ dist(w.a, w.b) / 100 | number: '1.2-2' }}</text>
            }
          }
          @for (r of plan().rooms; track r.id) {
            <text class="label" [attr.x]="centroid(r.points)[0]" [attr.y]="centroid(r.points)[1]" text-anchor="middle">{{ r.name }}</text>
            <text class="area" [attr.x]="centroid(r.points)[0]" [attr.y]="centroid(r.points)[1] + 34" text-anchor="middle">{{ area(r.points) | number: '1.1-1' }} מ״ר</text>
          }
          @if (draft().length) {
            <polyline [attr.points]="pts(draftWithCursor())" fill="none" stroke="var(--accent)" stroke-width="6" stroke-dasharray="14 8" />
            @for (p of draft(); track $index) { <circle [attr.cx]="p[0]" [attr.cy]="p[1]" r="10" fill="var(--accent)" /> }
            @if (cursor(); as c) {
              <text class="dim live" [attr.x]="c[0] + 20" [attr.y]="c[1] - 20">{{ dist(draft()[draft().length - 1], c) / 100 | number: '1.2-2' }} מ׳</text>
            }
          }
        </svg>
        <p class="muted">{{ hint() }}</p>
      </section>

      <div class="side">
        <section class="card">
          <h2>{{ plan().name }}</h2>
          <div class="kpis">
            <div><div class="num">{{ totalArea() | number: '1.0-0' }}</div><span class="muted">מ״ר נטו</span></div>
            <div><div class="num">{{ plan().rooms.length }}</div><span class="muted">חדרים</span></div>
            <div><div class="num">{{ estimate() }}</div><span class="muted">חומרים (הערכה)</span></div>
          </div>
          <label class="mt">גובה תקרה (ס״מ)<input type="number" [ngModel]="plan().ceilingHeight" (ngModelChange)="setCeiling($event)" /></label>
        </section>

        @if (selectedRoom(); as r) {
          <section class="card">
            <h2>חדר נבחר</h2>
            <label>שם<input [ngModel]="r.name" (ngModelChange)="updateRoom(r.id, { name: $event })" /></label>
            <label class="mt">סוג
              <select [ngModel]="r.type" (ngModelChange)="updateRoom(r.id, { type: $event })">
                @for (t of roomTypes; track t) { <option [value]="t">{{ ROOM_TYPES[t].he }}</option> }
              </select>
            </label>
            <label class="mt">ריצוף
              <select [ngModel]="r.floorMaterialId" (ngModelChange)="updateRoom(r.id, { floorMaterialId: $event })">
                @for (m of floorMaterials(); track m.id) { <option [value]="m.id">{{ m.name }}</option> }
              </select>
            </label>
            <button class="btn mt" (click)="removeSelected()">🗑 מחיקה</button>
          </section>
        }
        @if (selectedFurniture(); as f) {
          <section class="card">
            <h2>{{ FURNITURE[f.kind].he }}</h2>
            <div class="row"><button class="btn" (click)="rotate(f)">⟳ סיבוב 90°</button><button class="btn" (click)="removeSelected()">🗑 מחיקה</button></div>
            <p class="muted">גוררים את הרהיט על התכנית כדי להזיז אותו.</p>
          </section>
        }
        @if (selection()?.kind === 'wall' || selection()?.kind === 'opening') {
          <section class="card"><button class="btn" (click)="removeSelected()">🗑 מחיקת {{ selection()?.kind === 'wall' ? 'הקיר' : 'הפתח' }}</button></section>
        }

        <section class="card">
          <h2>בדיקת תקנות <span class="chip" [class.sage]="!failures()" [class.red]="failures()">{{ failures() ? failures() + ' חריגות' : 'תקין' }}</span></h2>
          <ul class="checks">
            @for (c of checks(); track $index) {
              <li [class.bad]="!c.ok"><span>{{ c.ok ? '✓' : '✗' }}</span><div><b>{{ c.room }}</b> · {{ c.rule }}<br /><small>{{ c.detail }}</small></div></li>
            }
          </ul>
          <p class="muted">כללי אצבע לפי תקנות התכנון והבנייה – להמחשה בלבד.</p>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
    @media (max-width: 1200px) { .layout { grid-template-columns: 1fr; } }
    .toolbar { margin-bottom: 12px; }
    .board { width: 100%; height: 66vh; background: var(--card); border-radius: 12px; border: 1px solid var(--line); touch-action: none; user-select: none; color: var(--ink); }
    polygon { stroke: none; cursor: pointer; }
    polygon.sel { stroke: var(--accent); stroke-width: 8; }
    .wall { stroke: #2a2622; stroke-linecap: square; cursor: pointer; }
    :host-context(.dark) .wall { stroke: #d9d0c4; }
    .wall.sel, .sel line { stroke: var(--accent) !important; }
    .furn rect { fill: color-mix(in srgb, var(--accent-2) 16%, white); stroke: var(--accent-2); stroke-width: 3; cursor: move; }
    .furn.sel rect { stroke: var(--accent); stroke-width: 6; }
    .furn text { font-size: 22px; fill: var(--accent-2); pointer-events: none; }
    .label { font: 600 30px 'Heebo'; fill: var(--ink); pointer-events: none; }
    .area { font: 26px 'Heebo'; fill: var(--muted); pointer-events: none; }
    .dim { font: 22px 'Heebo'; fill: var(--accent); pointer-events: none; }
    .dim.live { font-size: 30px; font-weight: 700; }
    .side { display: grid; gap: 16px; }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; .num { font-size: 22px; } }
    .checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; max-height: 320px; overflow: auto; font-size: 13px; }
    .checks li { display: flex; gap: 8px; span { color: var(--accent-2); font-weight: 700; } }
    .checks li.bad span, .checks li.bad b { color: #b42318; }
  `],
  host: { '(window:keydown)': 'key($event)' },
})
export class PlannerComponent {
  private readonly store = inject(StudioStore);
  private readonly svgRef = viewChild.required<ElementRef<SVGSVGElement>>('svg');

  readonly FURNITURE = FURNITURE;
  readonly ROOM_TYPES = ROOM_TYPES;
  readonly roomTypes = Object.keys(ROOM_TYPES) as RoomType[];
  readonly furnitureKinds = Object.keys(FURNITURE) as FurnitureKind[];
  readonly dist = dist;
  readonly centroid = centroid;
  readonly area = polygonArea;
  readonly tools: { id: Tool; icon: string; label: string; hint: string }[] = [
    { id: 'select', icon: '➶', label: 'בחירה', hint: 'בחירה וגרירה' },
    { id: 'wall', icon: '▬', label: 'קיר', hint: 'לחיצה לכל נקודה, דאבל-קליק לסיום' },
    { id: 'room', icon: '⬠', label: 'חדר', hint: 'לחיצה לכל פינה, דאבל-קליק לסגירה' },
    { id: 'door', icon: '◜', label: 'דלת', hint: 'לחיצה על קיר' },
    { id: 'window', icon: '▭', label: 'חלון', hint: 'לחיצה על קיר' },
    { id: 'furniture', icon: '▣', label: 'רהיט', hint: 'לחיצה למיקום' },
  ];

  readonly plan = this.store.plan;
  readonly tool = signal<Tool>('select');
  readonly selection = signal<Selection>(null);
  readonly draft = signal<Pt[]>([]);
  readonly cursor = signal<Pt | null>(null);
  readonly scale = signal(1);
  furnitureKind: FurnitureKind = 'sofa';
  past: Plan[] = [];
  future: Plan[] = [];
  private dragging: { id: string; dx: number; dy: number } | null = null;

  readonly viewBox = computed(() => {
    const s = this.scale();
    return `${-150 * s} ${-150 * s} ${1500 * s} ${1200 * s}`;
  });
  readonly totalArea = computed(() => this.plan().rooms.filter(r => r.type !== 'balcony').reduce((s, r) => s + polygonArea(r.points), 0));
  readonly checks = computed(() => checkRegulations(this.plan()));
  readonly failures = computed(() => this.checks().filter(c => !c.ok).length);
  readonly estimate = computed(() => ils(billOfQuantities(this.plan(), this.store.materials()).reduce((s, l) => s + l.total, 0)));
  readonly floorMaterials = computed(() => this.store.materials().filter(m => m.category === 'flooring' || m.category === 'tiles'));
  readonly selectedRoom = computed(() => { const s = this.selection(); return s?.kind === 'room' ? this.plan().rooms.find(r => r.id === s.id) : undefined; });
  readonly selectedFurniture = computed(() => { const s = this.selection(); return s?.kind === 'furniture' ? this.plan().furniture.find(f => f.id === s.id) : undefined; });
  readonly draftWithCursor = computed(() => (this.cursor() ? [...this.draft(), this.cursor()!] : this.draft()));
  readonly hint = computed(() => this.tools.find(t => t.id === this.tool())!.hint + ' · Delete למחיקה · Esc לביטול');

  readonly openingShapes = computed(() => this.plan().openings.map(o => {
    const w = this.plan().walls.find(x => x.id === o.wallId);
    if (!w) return null;
    const len = dist(w.a, w.b), half = o.width / 2 / len;
    const a = pointOnWall(w, Math.max(0, o.t - half)), b = pointOnWall(w, Math.min(1, o.t + half));
    const nx = -(w.b[1] - w.a[1]) / len, ny = (w.b[0] - w.a[0]) / len;
    const arc = `M ${a[0]} ${a[1]} L ${a[0] + nx * o.width} ${a[1] + ny * o.width} A ${o.width} ${o.width} 0 0 1 ${b[0]} ${b[1]}`;
    return { id: o.id, kind: o.kind, a, b, arc };
  }).filter((x): x is NonNullable<typeof x> => !!x));

  pts = (p: Pt[]) => p.map(x => x.join(',')).join(' ');
  roomColor = (t: RoomType) => ROOM_TYPES[t].color;
  isSel = (kind: string, id: string) => this.selection()?.kind === kind && this.selection()?.id === id;

  setTool(t: Tool) { this.tool.set(t); this.draft.set([]); this.selection.set(null); }
  zoom(f: number) { this.scale.update(s => Math.min(3, Math.max(0.4, s * f))); }

  private commit(next: Plan) {
    this.past.push(this.plan());
    if (this.past.length > 60) this.past.shift();
    this.future = [];
    this.store.savePlan(next);
  }
  undo() { const p = this.past.pop(); if (p) { this.future.push(this.plan()); this.store.savePlan(p); } }
  redo() { const p = this.future.pop(); if (p) { this.past.push(this.plan()); this.store.savePlan(p); } }

  private toPlan(e: PointerEvent | MouseEvent): Pt {
    const svg = this.svgRef().nativeElement;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [p.x, p.y];
  }

  pick(e: PointerEvent, kind: NonNullable<Selection>['kind'], id: string) {
    if (this.tool() !== 'select') return;
    e.stopPropagation();
    this.selection.set({ kind, id });
    if (kind === 'furniture') {
      const f = this.plan().furniture.find(x => x.id === id)!;
      const [x, y] = this.toPlan(e);
      this.past.push(this.plan());
      this.dragging = { id, dx: x - f.x, dy: y - f.y };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    }
  }

  down(e: PointerEvent) {
    const raw = this.toPlan(e);
    const t = this.tool();
    if (t === 'select') { this.selection.set(null); return; }
    if (t === 'wall' || t === 'room') {
      const d = this.draft();
      this.draft.set([...d, snap(raw, 10, d[d.length - 1])]);
      return;
    }
    if (t === 'door' || t === 'window') { this.addOpening(raw, t); return; }
    if (t === 'furniture') {
      const spec = FURNITURE[this.furnitureKind];
      const [x, y] = snap(raw, 10);
      const f: Furniture = { id: `f${Date.now()}`, kind: this.furnitureKind, x: x - spec.w / 2, y: y - spec.h / 2, w: spec.w, h: spec.h, rot: 0 };
      this.commit({ ...this.plan(), furniture: [...this.plan().furniture, f] });
    }
  }

  move(e: PointerEvent) {
    const p = this.toPlan(e);
    if (this.dragging) {
      const d = this.dragging;
      const [x, y] = snap([p[0] - d.dx, p[1] - d.dy], 5);
      this.store.savePlan({ ...this.plan(), furniture: this.plan().furniture.map(f => (f.id === d.id ? { ...f, x, y } : f)) });
      return;
    }
    if (this.draft().length) this.cursor.set(snap(p, 10, this.draft()[this.draft().length - 1]));
  }

  up() { if (this.dragging) { this.future = []; this.dragging = null; } }

  finishRoom() {
    const d = this.draft();
    if (this.tool() === 'wall' && d.length >= 2) {
      const walls = d.slice(1).map((b, i) => ({ id: `w${Date.now()}${i}`, a: d[i], b, thickness: 15 }));
      this.commit({ ...this.plan(), walls: [...this.plan().walls, ...walls] });
    }
    if (this.tool() === 'room' && d.length >= 3) {
      const n = this.plan().rooms.length + 1;
      this.commit({ ...this.plan(), rooms: [...this.plan().rooms, { id: `r${Date.now()}`, name: `חדר ${n}`, type: 'bedroom', points: d, floorMaterialId: 'm-parquet' }] });
    }
    this.draft.set([]);
    this.cursor.set(null);
  }

  private addOpening(p: Pt, kind: 'door' | 'window') {
    // Nearest wall + parametric position along it.
    let best: { id: string; t: number; d: number } | null = null;
    for (const w of this.plan().walls) {
      const len2 = (w.b[0] - w.a[0]) ** 2 + (w.b[1] - w.a[1]) ** 2;
      const t = Math.max(0.05, Math.min(0.95, ((p[0] - w.a[0]) * (w.b[0] - w.a[0]) + (p[1] - w.a[1]) * (w.b[1] - w.a[1])) / len2));
      const d = dist(p, pointOnWall(w, t));
      if (!best || d < best.d) best = { id: w.id, t, d };
    }
    if (!best || best.d > 60) return;
    this.commit({ ...this.plan(), openings: [...this.plan().openings, { id: `o${Date.now()}`, wallId: best.id, t: best.t, width: kind === 'door' ? 90 : 140, kind }] });
  }

  updateRoom(id: string, patch: Partial<{ name: string; type: RoomType; floorMaterialId: string }>) {
    this.commit({ ...this.plan(), rooms: this.plan().rooms.map(r => (r.id === id ? { ...r, ...patch } : r)) });
  }
  rotate(f: Furniture) {
    this.commit({ ...this.plan(), furniture: this.plan().furniture.map(x => (x.id === f.id ? { ...x, rot: (x.rot + 90) % 360 } : x)) });
  }
  setCeiling(v: number) { if (v > 150 && v < 600) this.commit({ ...this.plan(), ceilingHeight: v }); }

  removeSelected() {
    const s = this.selection();
    if (!s) return;
    const p = this.plan();
    const next: Plan = {
      ...p,
      walls: s.kind === 'wall' ? p.walls.filter(w => w.id !== s.id) : p.walls,
      openings: p.openings.filter(o => !(s.kind === 'opening' && o.id === s.id) && !(s.kind === 'wall' && o.wallId === s.id)),
      rooms: s.kind === 'room' ? p.rooms.filter(r => r.id !== s.id) : p.rooms,
      furniture: s.kind === 'furniture' ? p.furniture.filter(f => f.id !== s.id) : p.furniture,
    };
    this.commit(next);
    this.selection.set(null);
  }

  key(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.key === 'Escape') { this.draft.set([]); this.selection.set(null); }
    if (e.key === 'Delete' || e.key === 'Backspace') this.removeSelected();
    if (e.key === 'Enter') this.finishRoom();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); }
  }

  exportSvg() {
    const svg = this.svgRef().nativeElement.cloneNode(true) as SVGSVGElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'plan.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** Room under a point – used by tests and the 3D view to label spaces. */
  roomAt(p: Pt) { return this.plan().rooms.find(r => pointInPolygon(p, r.points)); }
}
