import { Routes } from '@angular/router';

// Every screen is lazy-loaded; Three.js only downloads when the 3D view opens.
export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'projects', loadComponent: () => import('./pages/projects.component').then(m => m.ProjectsComponent) },
  { path: 'planner', loadComponent: () => import('./pages/planner.component').then(m => m.PlannerComponent) },
  { path: '3d', loadComponent: () => import('./pages/viewer3d.component').then(m => m.Viewer3dComponent) },
  { path: 'estimate', loadComponent: () => import('./pages/estimate.component').then(m => m.EstimateComponent) },
  { path: 'suppliers', loadComponent: () => import('./pages/suppliers.component').then(m => m.SuppliersComponent) },
  { path: 'moodboard', loadComponent: () => import('./pages/moodboard.component').then(m => m.MoodboardComponent) },
  { path: 'proposals', loadComponent: () => import('./pages/proposals.component').then(m => m.ProposalsComponent) },
  { path: 'contracts', loadComponent: () => import('./pages/contracts.component').then(m => m.ContractsComponent) },
  { path: 'assistant', loadComponent: () => import('./pages/assistant.component').then(m => m.AssistantComponent) },
  { path: '**', redirectTo: '' },
];
