import { BoqLine } from './geometry';
import { Client, PROJECT_TYPES, Project, StudioData, STAGES } from './models';

/**
 * Domain agents. Each agent is deterministic and works offline; when the visitor supplies a Claude API key,
 * the assistant becomes a tool-using LLM agent over the same tools.
 */

const ils = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;

// ---------- Proposal agent ----------

export interface ProposalDraft { scope: string[]; total: number; stages: { name: string; pct: number }[]; text: string; reasoning: string[] }

const SCOPE_RULES: { re: RegExp; scope: string; perSqm: number }[] = [
  { re: /היתר|ועדה|תוספת בנייה|הרחבה/, scope: 'הכנת תיק היתר וליווי מול הוועדה', perSqm: 120 },
  { re: /מטבח/, scope: 'תכנון מטבח ונגרות מפורטת', perSqm: 90 },
  { re: /ילדים|חדרי/, scope: 'עיצוב חדרי ילדים כולל נגרות', perSqm: 110 },
  { re: /הדמי|תלת/, scope: 'הדמיות תלת-ממד פוטוריאליסטיות', perSqm: 35 },
  { re: /פיקוח|ליווי|ביצוע/, scope: 'פיקוח עליון וליווי ביצוע', perSqm: 80 },
  { re: /תאור|חשמל/, scope: 'תכנית תאורה וחשמל', perSqm: 25 },
  { re: /רהיט|ריהוט|שופינג|קניות/, scope: 'ליווי בבחירת ריהוט וחומרי גמר', perSqm: 30 },
];

export function draftProposal(project: Project, client: Client, brief: string): ProposalDraft {
  const reasoning: string[] = [];
  const scope = ['פגישת אפיון ופרוגרמה', 'תכנית העמדה ותכנון אדריכלי'];
  let perSqm = project.type === 'office' ? 160 : project.type === 'house' ? 240 : 180;
  reasoning.push(`בסיס: ${PROJECT_TYPES[project.type]} → ${ils(perSqm)} למ״ר`);
  for (const r of SCOPE_RULES) if (r.re.test(brief)) { scope.push(r.scope); perSqm += r.perSqm; reasoning.push(`"${brief.match(r.re)![0]}" בבריף → ${r.scope} (+${ils(r.perSqm)}/מ״ר)`); }

  // Economies of scale on large projects, minimum fee on small ones.
  const scale = project.areaSqm > 300 ? 0.75 : project.areaSqm > 150 ? 0.88 : 1;
  if (scale < 1) reasoning.push(`הנחת היקף ${Math.round((1 - scale) * 100)}% על ${project.areaSqm} מ״ר`);
  const total = Math.max(9000, Math.round((perSqm * project.areaSqm * scale) / 500) * 500);
  if (total === 9000) reasoning.push('הופעל שכר טרחה מינימלי');

  const stages = [{ name: 'חתימה ותחילת עבודה', pct: 20 }, { name: 'אישור תכנית העמדה', pct: 30 }, { name: 'מסירת תכניות לביצוע', pct: 30 }, { name: 'סיום פיקוח ומסירה', pct: 20 }];
  const text = [
    `לכבוד ${client.name}`,
    `הנדון: הצעת מחיר – ${project.name}, ${project.city}`,
    '',
    `תודה על הפגישה. בהמשך לבקשתכם, להלן הצעתנו לתכנון ${PROJECT_TYPES[project.type]} בשטח של כ-${project.areaSqm} מ״ר.`,
    '',
    'השירותים הכלולים:',
    ...scope.map((s, i) => `${i + 1}. ${s}`),
    '',
    `שכר הטרחה הכולל: ${ils(total)} בתוספת מע״מ.`,
    '',
    'פריסת תשלומים:',
    ...stages.map(s => `• ${s.name} – ${s.pct}% (${ils((total * s.pct) / 100)})`),
    '',
    'ההצעה בתוקף ל-30 יום. נשמח להתחיל לתכנן את הבית שלכם!',
  ].join('\n');
  return { scope, total, stages, text, reasoning };
}

// ---------- Contractor contract & work specification agent ----------

export function draftContractorSpec(project: Project, client: Client, boq: BoqLine[], contractor: string, days: number): string {
  const total = boq.reduce((s, l) => s + l.total, 0);
  return [
    `חוזה התקשרות ומפרט עבודות לקבלן`,
    `פרויקט: ${project.name} · ${project.city}`,
    `המזמין: ${client.name}        הקבלן: ${contractor || '__________'}`,
    '',
    '1. היקף העבודה – לפי המפרט וכתב הכמויות שלהלן, ולפי התכניות המעודכנות של המתכננת.',
    `2. לוח זמנים – ${days} ימי עבודה מיום קבלת החזקה באתר. עיכוב שאינו באחריות המזמין יזכה בפיצוי מוסכם של 0.1% לכל יום.`,
    '3. איכות – כל העבודות יבוצעו לפי התקנים הישראליים העדכניים ולשביעות רצון המפקחת.',
    '4. תשלומים – לפי אבני דרך, 5% עכבון עד תום תקופת הבדק (12 חודשים).',
    '5. שינויים – רק בהוראת שינוי חתומה בידי המזמין והמתכננת.',
    '',
    'כתב כמויות:',
    ...boq.map((l, i) => `${String(i + 1).padStart(2, '0')}. ${l.label} – ${l.quantity} ${l.unit}${l.material ? ` × ${ils(l.material.price)}` : ''} = ${ils(l.total)}`),
    '',
    `סה״כ חומרים לפי כתב הכמויות: ${ils(total)} (לא כולל עבודה ומע״מ)`,
    '',
    'חתימת המזמין: ____________      חתימת הקבלן: ____________      חתימת המתכננת: ____________',
  ].join('\n');
}

// ---------- Office assistant (tools) ----------

export interface Tool { name: string; description: string; run: (d: StudioData, today: Date) => string }

export const TOOLS: Tool[] = [
  {
    name: 'pipeline', description: 'Projects grouped by stage with fees',
    run: d => STAGES.map(s => {
      const ps = d.projects.filter(p => p.stage === s.id);
      return ps.length ? `${s.he}: ${ps.map(p => p.name).join(', ')}` : null;
    }).filter(Boolean).join('\n'),
  },
  {
    name: 'open_balances', description: 'Clients with unpaid architecture fees',
    run: d => {
      const rows = d.projects.filter(p => p.fee > p.paid);
      return rows.length ? 'יתרות פתוחות:\n' + rows.map(p => `• ${d.clients.find(c => c.id === p.clientId)?.name} – ${p.name}: ${ils(p.fee - p.paid)}`).join('\n') + `\nסה״כ: ${ils(rows.reduce((s, p) => s + p.fee - p.paid, 0))}` : 'אין יתרות פתוחות.';
    },
  },
  {
    name: 'deadlines', description: 'Milestones due in the next 30 days',
    run: (d, today) => {
      const in30 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
      const due = d.milestones.filter(m => !m.done && new Date(m.end) <= in30).sort((a, b) => a.end.localeCompare(b.end));
      return due.length ? 'אבני דרך קרובות:\n' + due.map(m => `• ${m.end} – ${m.name} (${d.projects.find(p => p.id === m.projectId)?.name})`).join('\n') : 'אין אבני דרך ב-30 הימים הקרובים.';
    },
  },
  {
    name: 'workload', description: 'Office summary: active projects, total fees, collected',
    run: d => {
      const active = d.projects.filter(p => p.stage !== 'handover' && p.stage !== 'lead');
      const fee = d.projects.reduce((s, p) => s + p.fee, 0), paid = d.projects.reduce((s, p) => s + p.paid, 0);
      return `${active.length} פרויקטים פעילים, ${d.projects.filter(p => p.stage === 'lead').length} לידים. שכר טרחה כולל ${ils(fee)}, נגבה ${ils(paid)} (${Math.round((paid / Math.max(1, fee)) * 100)}%).`;
    },
  },
];

export function localAssistant(q: string, d: StudioData, today: Date): string {
  const run = (n: string) => TOOLS.find(t => t.name === n)!.run(d, today);
  if (/חוב|יתר|שילם|תשלום|גבי/.test(q)) return run('open_balances');
  if (/דדליין|מועד|קרוב|אבני דרך|השבוע|החודש/.test(q)) return run('deadlines');
  if (/שלב|פייפליין|סטטוס|איפה עומד/.test(q)) return run('pipeline');
  if (/סיכום|כמה|מצב|עומס/.test(q)) return run('workload');
  return 'אני יכולה לעזור עם: יתרות פתוחות, אבני דרך קרובות, סטטוס הפרויקטים לפי שלבים וסיכום עומס. נסי: "מי עוד לא שילם?"';
}

export async function claudeAssistant(question: string, key: string, d: StudioData, today: Date): Promise<string> {
  const tools = TOOLS.map(t => ({ name: t.name, description: t.description, input_schema: { type: 'object', properties: {} } }));
  const messages: unknown[] = [{ role: 'user', content: question }];
  for (let i = 0; i < 4; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 800, system: 'You are the studio manager assistant of an architecture & interior design office. Answer in Hebrew, concise. Use tools for facts.', tools, messages }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}`);
    const body = await res.json() as { stop_reason: string; content: { type: string; text?: string; id?: string; name?: string }[] };
    messages.push({ role: 'assistant', content: body.content });
    if (body.stop_reason !== 'tool_use') return body.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
    messages.push({ role: 'user', content: body.content.filter(c => c.type === 'tool_use').map(c => ({ type: 'tool_result', tool_use_id: c.id, content: TOOLS.find(t => t.name === c.name)?.run(d, today) ?? '' })) });
  }
  return 'לא הצלחתי להשלים את התשובה.';
}

export { ils };
