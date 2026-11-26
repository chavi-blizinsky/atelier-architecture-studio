import { billOfQuantities, checkRegulations, perimeter, pointInPolygon, polygonArea, snap } from './geometry';
import { deltaE, kmeans, nearestPaint, Rgb, toHex } from './palette';
import { draftContractorSpec, draftProposal, localAssistant } from './agents';
import { createSeed, DEMO_TODAY, demoPlan } from './seed';
import { Plan } from './models';

describe('geometry', () => {
  const square: [number, number][] = [[0, 0], [400, 0], [400, 300], [0, 300]];

  it('computes area (shoelace) and perimeter in metres', () => {
    expect(polygonArea(square)).toBeCloseTo(12, 5);
    expect(polygonArea([...square].reverse())).toBeCloseTo(12, 5);
    expect(perimeter(square)).toBeCloseTo(14, 5);
  });

  it('point in polygon', () => {
    expect(pointInPolygon([100, 100], square)).toBeTrue();
    expect(pointInPolygon([500, 100], square)).toBeFalse();
  });

  it('snaps to grid and to orthogonal lines', () => {
    expect(snap([103, 97], 10)).toEqual([100, 100]);
    expect(snap([305, 112], 10, [0, 100])).toEqual([310, 100]); // nearly horizontal → horizontal
  });

  it('demo apartment is ~105 m²', () => {
    const total = demoPlan().rooms.reduce((s, r) => s + polygonArea(r.points), 0);
    expect(total).toBeCloseTo(108, 0);
  });
});

describe('bill of quantities', () => {
  const data = createSeed();
  const boq = billOfQuantities(demoPlan(), data.materials);

  it('adds 10% waste to flooring', () => {
    const floors = boq.filter(l => l.key.startsWith('floor-'));
    const area = demoPlan().rooms.reduce((s, r) => s + polygonArea(r.points), 0);
    expect(floors.reduce((s, l) => s + l.quantity, 0)).toBeGreaterThanOrEqual(Math.floor(area * 1.1));
  });

  it('prices every line from the catalogue', () => {
    for (const l of boq) expect(l.total).toBeCloseTo(l.quantity * (l.material?.price ?? 0), 5);
  });

  it('reacts to ceiling height', () => {
    const tall: Plan = { ...demoPlan(), ceilingHeight: 320 };
    const paint = (p: Plan) => billOfQuantities(p, data.materials).find(l => l.key === 'paint')!.quantity;
    expect(paint(tall)).toBeGreaterThan(paint(demoPlan()));
  });
});

describe('regulation checks', () => {
  it('flags a tiny bedroom and a low ceiling', () => {
    const plan: Plan = { ...demoPlan(), ceilingHeight: 240, rooms: [{ id: 'x', name: 'קטן', type: 'bedroom', floorMaterialId: 'm-parquet', points: [[0, 0], [250, 0], [250, 250], [0, 250]] }], openings: [] };
    const failed = checkRegulations(plan).filter(c => !c.ok).map(c => c.rule);
    expect(failed.some(r => r.includes('גובה'))).toBeTrue();
    expect(failed.some(r => r.includes('8 מ״ר'))).toBeTrue();
    expect(failed.some(r => r.includes('חלונות'))).toBeTrue();
  });
});

describe('palette', () => {
  it('k-means separates clear colour clusters', () => {
    const px: Rgb[] = [...Array(60).fill([200, 30, 30]), ...Array(40).fill([20, 20, 200])];
    const res = kmeans(px, 2);
    expect(res.length).toBe(2);
    expect(res[0].share).toBeCloseTo(0.6, 2);
    expect(toHex(res[0].color)).toBe('#c81e1e');
  });

  it('ΔE is zero for identical colours and matches the nearest paint', () => {
    expect(deltaE([10, 20, 30], [10, 20, 30])).toBe(0);
    const paints = createSeed().materials.filter(m => m.category === 'paint');
    expect(nearestPaint([180, 88, 48], paints)?.paint.id).toBe('m-paint-terracotta');
  });
});

describe('agents', () => {
  const data = createSeed();
  const p = data.projects.find(x => x.id === 'p5')!;
  const c = data.clients.find(x => x.id === p.clientId)!;

  it('proposal agent detects scope from the brief and explains the price', () => {
    const d = draftProposal(p, c, 'מטבח חדש כולל הדמיות ופיקוח');
    expect(d.scope).toContain('תכנון מטבח ונגרות מפורטת');
    expect(d.scope).toContain('הדמיות תלת-ממד פוטוריאליסטיות');
    expect(d.stages.reduce((s, x) => s + x.pct, 0)).toBe(100);
    expect(d.reasoning.length).toBeGreaterThan(2);
    expect(d.text).toContain(c.name);
  });

  it('contractor spec includes the bill of quantities', () => {
    const boq = billOfQuantities(demoPlan(), data.materials);
    const text = draftContractorSpec(p, c, boq, 'א.ב. בנייה', 60);
    expect(text).toContain('א.ב. בנייה');
    expect(text).toContain(boq[0].label);
  });

  it('assistant answers from data', () => {
    expect(localAssistant('מי עוד לא שילם?', data, DEMO_TODAY)).toContain('יתרות פתוחות');
    expect(localAssistant('מה הדדליינים הקרובים?', data, DEMO_TODAY)).toContain('אבני דרך');
  });
});
