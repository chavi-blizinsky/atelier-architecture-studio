import { Injectable, computed, effect, signal } from '@angular/core';
import { Plan, Project, Proposal, StudioData } from './models';
import { createSeed, DEMO_TODAY } from './seed';

/**
 * Signal-based store. In the live demo state persists to localStorage; in the full stack setup the same
 * operations are served by the ASP.NET Core API (/server, see README).
 */
@Injectable({ providedIn: 'root' })
export class StudioStore {
  private static readonly KEY = 'atelier-demo-v1';
  readonly today = DEMO_TODAY;
  readonly data = signal<StudioData>(this.load());

  readonly clients = computed(() => this.data().clients);
  readonly projects = computed(() => this.data().projects);
  readonly materials = computed(() => this.data().materials);
  readonly suppliers = computed(() => this.data().suppliers);
  readonly plan = computed(() => this.data().plans[0]);

  constructor() {
    effect(() => {
      const d = this.data();
      try { localStorage.setItem(StudioStore.KEY, JSON.stringify(d)); } catch { /* storage unavailable */ }
    });
  }

  private load(): StudioData {
    try {
      const raw = localStorage.getItem(StudioStore.KEY);
      if (raw) return JSON.parse(raw) as StudioData;
    } catch { /* ignore */ }
    return createSeed();
  }

  client(id: string) { return this.data().clients.find(c => c.id === id)!; }
  project(id: string) { return this.data().projects.find(p => p.id === id); }
  supplier(id: string) { return this.data().suppliers.find(s => s.id === id); }

  updateProject(p: Project) { this.data.update(d => ({ ...d, projects: d.projects.map(x => (x.id === p.id ? p : x)) })); }
  savePlan(plan: Plan) { this.data.update(d => ({ ...d, plans: d.plans.map(x => (x.id === plan.id ? plan : x)) })); }
  addProposal(p: Proposal) { this.data.update(d => ({ ...d, proposals: [p, ...d.proposals.filter(x => x.id !== p.id)] })); }
  toggleMilestone(id: string) { this.data.update(d => ({ ...d, milestones: d.milestones.map(m => (m.id === id ? { ...m, done: !m.done } : m)) })); }

  reset() {
    try { localStorage.removeItem(StudioStore.KEY); } catch { /* ignore */ }
    this.data.set(createSeed());
  }
}
