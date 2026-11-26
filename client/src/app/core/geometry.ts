import { Material, Opening, Plan, Pt, ROOM_TYPES, Room, Wall } from './models';

/** Plan geometry, bill of quantities (BOQ) and building-regulation checks. Units: cm in, m / m² out. */

export const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Shoelace formula – signed area → absolute, in m². */
export function polygonArea(points: Pt[]): number {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % points.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2 / 10000;
}

export const perimeter = (points: Pt[]) => points.reduce((s, p, i) => s + dist(p, points[(i + 1) % points.length]), 0) / 100;

export function centroid(points: Pt[]): Pt {
  const n = points.length;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

/** Point on a wall at parameter t ∈ [0,1]. */
export const pointOnWall = (w: Wall, t: number): Pt => [w.a[0] + (w.b[0] - w.a[0]) * t, w.a[1] + (w.b[1] - w.a[1]) * t];

/** Ray-casting point-in-polygon. */
export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Snap to grid and to 0/45/90° relative to an anchor – makes drawing walls feel like a CAD tool. */
export function snap(p: Pt, grid: number, anchor?: Pt): Pt {
  let [x, y] = [Math.round(p[0] / grid) * grid, Math.round(p[1] / grid) * grid];
  if (anchor) {
    const dx = x - anchor[0], dy = y - anchor[1];
    if (Math.abs(dx) < Math.abs(dy) * 0.25) x = anchor[0];
    else if (Math.abs(dy) < Math.abs(dx) * 0.25) y = anchor[1];
  }
  return [x, y];
}

/** Openings that lie on the boundary of a room (window/door centre close to a room edge). */
export function openingsOfRoom(room: Room, plan: Plan): Opening[] {
  return plan.openings.filter(o => {
    const w = plan.walls.find(x => x.id === o.wallId);
    if (!w) return false;
    const c = pointOnWall(w, o.t);
    return room.points.some((p, i) => distToSegment(c, p, room.points[(i + 1) % room.points.length]) < 15);
  });
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const l2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  if (!l2) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2));
  return dist(p, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
}

export interface BoqLine { key: string; label: string; quantity: number; unit: string; material?: Material; total: number; note?: string }

const WINDOW_H = 1.3, DOOR_H = 2.1;

/** Bill of quantities derived from the drawing – updates live while the architect draws. */
export function billOfQuantities(plan: Plan, materials: Material[], wallPaintId = 'm-paint-white'): BoqLine[] {
  const h = plan.ceilingHeight / 100;
  const mat = (id: string) => materials.find(m => m.id === id);
  const lines: BoqLine[] = [];

  const floorBy = new Map<string, number>();
  let wallArea = 0, ceilingArea = 0, skirting = 0;
  for (const r of plan.rooms) {
    const a = polygonArea(r.points);
    floorBy.set(r.floorMaterialId, (floorBy.get(r.floorMaterialId) ?? 0) + a);
    if (r.type !== 'balcony') ceilingArea += a;
    const ops = openingsOfRoom(r, plan);
    const openingArea = ops.reduce((s, o) => s + (o.width / 100) * (o.kind === 'door' ? DOOR_H : WINDOW_H), 0);
    const doorWidth = ops.filter(o => o.kind === 'door').reduce((s, o) => s + o.width / 100, 0);
    if (r.type !== 'bath') wallArea += perimeter(r.points) * h - openingArea; // wet rooms are tiled, not painted
    skirting += perimeter(r.points) - doorWidth;
  }

  // Flooring with 10% cutting waste.
  for (const [id, area] of floorBy) {
    const m = mat(id);
    const q = Math.ceil(area * 1.1);
    lines.push({ key: `floor-${id}`, label: `ריצוף – ${m?.name ?? id}`, quantity: q, unit: 'מ״ר', material: m, total: q * (m?.price ?? 0), note: `${area.toFixed(1)} מ״ר + 10% פחת` });
  }

  // Bathroom wall tiles up to the ceiling.
  const bathWalls = plan.rooms.filter(r => r.type === 'bath').reduce((s, r) => s + perimeter(r.points) * h, 0);
  if (bathWalls) {
    const m = mat('m-tile-bath'), q = Math.ceil(bathWalls * 1.1);
    lines.push({ key: 'bath-walls', label: 'חיפוי קירות חדר רטוב', quantity: q, unit: 'מ״ר', material: m, total: q * (m?.price ?? 0), note: 'עד התקרה + 10% פחת' });
  }

  // Paint: two coats, coverage per litre from the catalogue.
  const paint = mat(wallPaintId);
  const litres = Math.ceil(((wallArea + ceilingArea) * 2) / (paint?.coverage ?? 10));
  lines.push({ key: 'paint', label: `צבע קירות ותקרה – ${paint?.name ?? ''}`, quantity: litres, unit: 'ליטר', material: paint, total: litres * (paint?.price ?? 0), note: `${(wallArea + ceilingArea).toFixed(0)} מ״ר × 2 שכבות` });

  const sk = mat('m-skirting'), skq = Math.ceil(skirting);
  lines.push({ key: 'skirting', label: 'פאנלים', quantity: skq, unit: 'מטר', material: sk, total: skq * (sk?.price ?? 0), note: 'היקף החדרים פחות פתחי דלתות' });

  // Lighting: one recessed spot per ~2.5 m² of ceiling.
  const sp = mat('m-spot'), spots = Math.ceil(ceilingArea / 2.5);
  lines.push({ key: 'spots', label: 'ספוטים שקועים', quantity: spots, unit: 'יח׳', material: sp, total: spots * (sp?.price ?? 0), note: 'ספוט לכל 2.5 מ״ר' });

  const kitchenRun = plan.furniture.filter(f => f.kind === 'kitchen').reduce((s, f) => s + Math.max(f.w, f.h) / 100, 0);
  if (kitchenRun) {
    const q = mat('m-quartz'), len = Math.ceil(kitchenRun * 10) / 10;
    lines.push({ key: 'quartz', label: 'משטח עבודה למטבח', quantity: len, unit: 'מטר אורך', material: q, total: len * (q?.price ?? 0) });
  }
  return lines;
}

export interface RegulationCheck { roomId: string; room: string; rule: string; ok: boolean; detail: string }

/**
 * Rule-of-thumb checks inspired by Israeli planning & building regulations (demo, not legal advice):
 * habitable room ≥ 8 m², window area ≥ 10% of floor for habitable rooms, ceiling ≥ 2.50 m, wet room needs a window or vent.
 */
export function checkRegulations(plan: Plan): RegulationCheck[] {
  const out: RegulationCheck[] = [];
  out.push({ roomId: '-', room: 'כל הדירה', rule: 'גובה תקרה ≥ 2.50 מ׳', ok: plan.ceilingHeight >= 250, detail: `${(plan.ceilingHeight / 100).toFixed(2)} מ׳` });
  for (const r of plan.rooms) {
    const area = polygonArea(r.points);
    const windows = openingsOfRoom(r, plan).filter(o => o.kind === 'window');
    const windowArea = windows.reduce((s, o) => s + (o.width / 100) * WINDOW_H, 0);
    if (ROOM_TYPES[r.type].habitable) {
      out.push({ roomId: r.id, room: r.name, rule: 'שטח חדר מגורים ≥ 8 מ״ר', ok: area >= 8, detail: `${area.toFixed(1)} מ״ר` });
      out.push({ roomId: r.id, room: r.name, rule: 'שטח חלונות ≥ 10% משטח הרצפה', ok: windowArea >= area * 0.1, detail: `${windowArea.toFixed(2)} מ״ר מתוך ${(area * 0.1).toFixed(2)} נדרשים` });
    }
    if (r.type === 'bath') out.push({ roomId: r.id, room: r.name, rule: 'חדר רטוב – חלון או אוורור מכני', ok: windows.length > 0, detail: windows.length ? 'יש חלון' : 'נדרש מאוורר מכני' });
  }
  return out;
}
