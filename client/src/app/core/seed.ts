import { Plan, StudioData } from './models';

/** Demo office: invented clients and projects; supplier names link to the real public websites. */

export const DEMO_TODAY = new Date(2026, 10, 26);

/** A 4-room apartment (≈ 105 m²) drawn in centimetres. */
export function demoPlan(): Plan {
  const W = (id: string, a: [number, number], b: [number, number], thickness = 20) => ({ id, a, b, thickness });
  return {
    id: 'plan1', name: 'דירת 4 חדרים – קומה 3', ceilingHeight: 270,
    walls: [
      W('w1', [0, 0], [1200, 0], 25), W('w2', [1200, 0], [1200, 900], 25), W('w3', [1200, 900], [0, 900], 25), W('w4', [0, 900], [0, 0], 25),
      W('w5', [700, 0], [700, 520]), W('w6', [700, 520], [1200, 520]), W('w7', [950, 0], [950, 520]),
      W('w8', [0, 560], [420, 560]), W('w9', [420, 560], [420, 900]), W('w10', [420, 720], [700, 720]), W('w11', [700, 520], [700, 900]),
    ],
    rooms: [
      { id: 'r1', name: 'סלון ופינת אוכל', type: 'living', floorMaterialId: 'm-porc-60', points: [[0, 0], [700, 0], [700, 520], [700, 560], [420, 560], [0, 560]] },
      { id: 'r2', name: 'חדר הורים', type: 'bedroom', floorMaterialId: 'm-parquet', points: [[700, 0], [950, 0], [950, 520], [700, 520]] },
      { id: 'r3', name: 'חדר ילדים', type: 'bedroom', floorMaterialId: 'm-parquet', points: [[950, 0], [1200, 0], [1200, 520], [950, 520]] },
      { id: 'r4', name: 'ממ״ד / חדר עבודה', type: 'mamad', floorMaterialId: 'm-porc-60', points: [[700, 520], [1200, 520], [1200, 900], [700, 900]] },
      { id: 'r5', name: 'מטבח', type: 'kitchen', floorMaterialId: 'm-porc-60', points: [[0, 560], [420, 560], [420, 900], [0, 900]] },
      { id: 'r6', name: 'חדר רחצה', type: 'bath', floorMaterialId: 'm-tile-bath', points: [[420, 720], [700, 720], [700, 900], [420, 900]] },
      { id: 'r7', name: 'מבואה', type: 'hall', floorMaterialId: 'm-porc-60', points: [[420, 560], [700, 560], [700, 720], [420, 720]] },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', t: 0.25, width: 240, kind: 'window' }, { id: 'o2', wallId: 'w4', t: 0.7, width: 100, kind: 'door' },
      { id: 'o3', wallId: 'w1', t: 0.69, width: 140, kind: 'window' }, { id: 'o4', wallId: 'w1', t: 0.9, width: 140, kind: 'window' },
      { id: 'o5', wallId: 'w2', t: 0.78, width: 100, kind: 'window' }, { id: 'o6', wallId: 'w3', t: 0.82, width: 120, kind: 'window' },
      { id: 'o7', wallId: 'w5', t: 0.75, width: 80, kind: 'door' }, { id: 'o8', wallId: 'w6', t: 0.7, width: 80, kind: 'door' },
      { id: 'o9', wallId: 'w6', t: 0.2, width: 80, kind: 'door' }, { id: 'o10', wallId: 'w10', t: 0.5, width: 70, kind: 'door' },
      { id: 'o11', wallId: 'w8', t: 0.5, width: 90, kind: 'door' },
    ],
    furniture: [
      { id: 'f1', kind: 'sofa', x: 120, y: 120, w: 240, h: 90, rot: 0 },
      { id: 'f2', kind: 'table', x: 470, y: 60, w: 180, h: 90, rot: 0 },
      { id: 'f3', kind: 'bed', x: 760, y: 220, w: 160, h: 200, rot: 0 },
      { id: 'f4', kind: 'bunk', x: 1110, y: 300, w: 80, h: 190, rot: 0 },
      { id: 'f5', kind: 'desk', x: 980, y: 40, w: 140, h: 60, rot: 0 },
      { id: 'f6', kind: 'kitchen', x: 20, y: 820, w: 380, h: 60, rot: 0 },
      { id: 'f7', kind: 'shower', x: 590, y: 790, w: 90, h: 90, rot: 0 },
      { id: 'f8', kind: 'toilet', x: 440, y: 830, w: 40, h: 60, rot: 0 },
      { id: 'f9', kind: 'wardrobe', x: 720, y: 30, w: 210, h: 60, rot: 0 },
    ],
  };
}

export function createSeed(): StudioData {
  return {
    clients: [
      { id: 'c1', name: 'משפחת אורן', phone: '052-7714420', email: 'oren@mail.demo', city: 'בית שמש', source: 'המלצה' },
      { id: 'c2', name: 'משפחת דגן', phone: '054-6620193', email: 'dagan@mail.demo', city: 'ירושלים', source: 'אינסטגרם' },
      { id: 'c3', name: 'סטארטאפ "נובה"', phone: '03-5512300', email: 'office@nova.demo', city: 'תל אביב', source: 'אתר' },
      { id: 'c4', name: 'משפחת ברנר', phone: '050-3318842', email: 'brenner@mail.demo', city: 'מודיעין', source: 'המלצה' },
      { id: 'c5', name: 'משפחת שחר', phone: '053-9910027', email: 'shahar@mail.demo', city: 'בני ברק', source: 'פייסבוק' },
      { id: 'c6', name: 'משפחת לביא', phone: '058-4402211', email: 'lavi@mail.demo', city: 'רעננה', source: 'אתר' },
    ],
    projects: [
      { id: 'p1', clientId: 'c1', name: 'הרחבה ושיפוץ דירה קומפלט', type: 'apartment', city: 'בית שמש', areaSqm: 105, budget: 420000, stage: 'construction', start: '2026-07-01', end: '2027-01-31', fee: 48000, paid: 33600, planId: 'plan1' },
      { id: 'p2', clientId: 'c2', name: 'חדרי ילדים – 3 חדרים', type: 'kids', city: 'ירושלים', areaSqm: 36, budget: 85000, stage: 'design', start: '2026-10-15', end: '2027-01-15', fee: 14500, paid: 4350 },
      { id: 'p3', clientId: 'c3', name: 'משרדי נובה – 2 קומות', type: 'office', city: 'תל אביב', areaSqm: 640, budget: 1900000, stage: 'permit', start: '2026-08-01', end: '2027-06-30', fee: 152000, paid: 45600 },
      { id: 'p4', clientId: 'c4', name: 'בית פרטי – תכנון מלא', type: 'house', city: 'מודיעין', areaSqm: 240, budget: 2600000, stage: 'concept', start: '2026-11-01', end: '2028-02-28', fee: 210000, paid: 21000 },
      { id: 'p5', clientId: 'c5', name: 'מטבח ופינת אוכל', type: 'kitchen', city: 'בני ברק', areaSqm: 28, budget: 95000, stage: 'lead', start: '2026-12-10', end: '2027-03-01', fee: 0, paid: 0 },
      { id: 'p6', clientId: 'c6', name: 'שיפוץ דירת גן', type: 'apartment', city: 'רעננה', areaSqm: 130, budget: 520000, stage: 'handover', start: '2026-01-10', end: '2026-11-20', fee: 56000, paid: 56000 },
    ],
    milestones: [
      { id: 'ms1', projectId: 'p1', name: 'פירוק והריסה', start: '2026-07-01', end: '2026-07-20', done: true },
      { id: 'ms2', projectId: 'p1', name: 'אינסטלציה וחשמל', start: '2026-07-21', end: '2026-09-10', done: true },
      { id: 'ms3', projectId: 'p1', name: 'טיח וריצוף', start: '2026-09-11', end: '2026-11-15', done: true },
      { id: 'ms4', projectId: 'p1', name: 'נגרות ומטבח', start: '2026-11-16', end: '2026-12-31', done: false },
      { id: 'ms5', projectId: 'p1', name: 'צבע וגמרים', start: '2027-01-01', end: '2027-01-31', done: false },
      { id: 'ms6', projectId: 'p2', name: 'סקיצות ותכנית העמדה', start: '2026-10-15', end: '2026-11-10', done: true },
      { id: 'ms7', projectId: 'p2', name: 'הדמיות ונגרות', start: '2026-11-11', end: '2026-12-20', done: false },
      { id: 'ms8', projectId: 'p3', name: 'הגשה לוועדה', start: '2026-08-01', end: '2026-10-30', done: true },
      { id: 'ms9', projectId: 'p3', name: 'היתר בנייה', start: '2026-10-31', end: '2027-01-31', done: false },
      { id: 'ms10', projectId: 'p4', name: 'פרוגרמה וקונספט', start: '2026-11-01', end: '2027-01-15', done: false },
    ],
    plans: [demoPlan()],
    suppliers: [
      { id: 's1', name: 'טמבור', url: 'https://www.tambour.co.il', categories: ['paint'], note: 'צבעי קיר, גוונים ופרימרים' },
      { id: 's2', name: 'נירלט', url: 'https://www.nirlat.com', categories: ['paint'], note: 'צבעים, טיח דקורטיבי וחיפויים' },
      { id: 's3', name: 'הום סנטר', url: 'https://www.homecenter.co.il', categories: ['tiles', 'flooring', 'lighting', 'sanitary', 'skirting'], note: 'חומרי גמר, תאורה וכלים סניטריים' },
      { id: 's4', name: 'ACE', url: 'https://www.ace.co.il', categories: ['board', 'lighting', 'paint', 'skirting'], note: 'חומרי בנייה, גבס וכלים' },
      { id: 's5', name: 'אבן קיסר', url: 'https://www.caesarstone.co.il', categories: ['kitchen'], note: 'משטחי קוורץ למטבח ולאמבטיה' },
      { id: 's6', name: 'חמת', url: 'https://www.hamat.co.il', categories: ['sanitary'], note: 'ברזים, כיורים ואסלות' },
      { id: 's7', name: 'איקאה', url: 'https://www.ikea.co.il', categories: ['kitchen', 'lighting'], note: 'מטבחים, ארונות ותאורה' },
    ],
    materials: [
      { id: 'm-paint-white', name: 'צבע אקרילי מט – לבן שלג', category: 'paint', unit: 'ליטר', price: 32, supplierId: 's1', coverage: 10, hex: '#f6f4ef' },
      { id: 'm-paint-sand', name: 'צבע אקרילי – חול מדבר', category: 'paint', unit: 'ליטר', price: 38, supplierId: 's1', coverage: 10, hex: '#d8c3a5' },
      { id: 'm-paint-sage', name: 'צבע אקרילי – ירוק מרווה', category: 'paint', unit: 'ליטר', price: 38, supplierId: 's2', coverage: 10, hex: '#9fae96' },
      { id: 'm-paint-terracotta', name: 'צבע אקרילי – טרקוטה', category: 'paint', unit: 'ליטר', price: 41, supplierId: 's2', coverage: 10, hex: '#b5562f' },
      { id: 'm-paint-navy', name: 'צבע אקרילי – כחול לילה', category: 'paint', unit: 'ליטר', price: 41, supplierId: 's1', coverage: 10, hex: '#2c3e55' },
      { id: 'm-paint-blush', name: 'צבע אקרילי – ורוד פודרה', category: 'paint', unit: 'ליטר', price: 38, supplierId: 's2', coverage: 10, hex: '#e8c4bd' },
      { id: 'm-paint-charcoal', name: 'צבע אקרילי – פחם', category: 'paint', unit: 'ליטר', price: 41, supplierId: 's1', coverage: 10, hex: '#3a3633' },
      { id: 'm-paint-olive', name: 'צבע אקרילי – זית', category: 'paint', unit: 'ליטר', price: 38, supplierId: 's2', coverage: 10, hex: '#7a7a4a' },
      { id: 'm-porc-60', name: 'פורצלן 60×60 גימור אבן', category: 'flooring', unit: 'מ״ר', price: 119, supplierId: 's3' },
      { id: 'm-parquet', name: 'פרקט למינציה אלון טבעי', category: 'flooring', unit: 'מ״ר', price: 89, supplierId: 's3' },
      { id: 'm-tile-bath', name: 'קרמיקה לחדר רטוב 30×60', category: 'tiles', unit: 'מ״ר', price: 95, supplierId: 's3' },
      { id: 'm-skirting', name: 'פאנל ריצוף 8 ס״מ', category: 'skirting', unit: 'מטר', price: 22, supplierId: 's4' },
      { id: 'm-gypsum', name: 'לוח גבס ירוק 12.5 מ״מ', category: 'board', unit: 'מ״ר', price: 34, supplierId: 's4' },
      { id: 'm-quartz', name: 'משטח קוורץ למטבח', category: 'kitchen', unit: 'מטר אורך', price: 1450, supplierId: 's5' },
      { id: 'm-spot', name: 'ספוט LED שקוע 7W', category: 'lighting', unit: 'יח׳', price: 49, supplierId: 's3' },
      { id: 'm-mixer', name: 'סוללת מקלחת טרמוסטטית', category: 'sanitary', unit: 'יח׳', price: 890, supplierId: 's6' },
    ],
    proposals: [],
  };
}
