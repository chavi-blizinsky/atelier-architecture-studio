// Domain model – mirrors the ASP.NET Core entities in /server. All plan coordinates are in centimetres.

export type Stage = 'lead' | 'concept' | 'design' | 'permit' | 'construction' | 'handover';
export const STAGES: { id: Stage; he: string }[] = [
  { id: 'lead', he: 'ליד' }, { id: 'concept', he: 'קונספט' }, { id: 'design', he: 'תכנון מפורט' },
  { id: 'permit', he: 'היתר' }, { id: 'construction', he: 'ביצוע' }, { id: 'handover', he: 'מסירה' },
];

export interface Client { id: string; name: string; phone: string; email: string; city: string; source: string }

export type ProjectType = 'apartment' | 'house' | 'office' | 'kids' | 'kitchen';
export const PROJECT_TYPES: Record<ProjectType, string> = {
  apartment: 'שיפוץ דירה', house: 'בית פרטי', office: 'משרד', kids: 'חדרי ילדים', kitchen: 'מטבח',
};

export interface Project {
  id: string; clientId: string; name: string; type: ProjectType; city: string;
  areaSqm: number; budget: number; stage: Stage; start: string; end: string;
  fee: number; paid: number; planId?: string;
}

export interface Milestone { id: string; projectId: string; name: string; start: string; end: string; done: boolean }

export type Pt = [number, number];
export interface Wall { id: string; a: Pt; b: Pt; thickness: number }
export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'bath' | 'mamad' | 'balcony' | 'hall';
export const ROOM_TYPES: Record<RoomType, { he: string; color: string; habitable: boolean }> = {
  living: { he: 'סלון', color: '#efe3d3', habitable: true },
  bedroom: { he: 'חדר שינה', color: '#e6ecdf', habitable: true },
  kitchen: { he: 'מטבח', color: '#f3e7d9', habitable: true },
  bath: { he: 'רחצה', color: '#dfe9ee', habitable: false },
  mamad: { he: 'ממ״ד', color: '#e5e2ee', habitable: true },
  balcony: { he: 'מרפסת', color: '#eef0e4', habitable: false },
  hall: { he: 'מבואה', color: '#f1ede7', habitable: false },
};
export interface Room { id: string; name: string; type: RoomType; points: Pt[]; floorMaterialId: string }
export interface Opening { id: string; wallId: string; t: number; width: number; kind: 'door' | 'window' }
export type FurnitureKind = 'sofa' | 'bed' | 'table' | 'wardrobe' | 'desk' | 'kitchen' | 'toilet' | 'shower' | 'bunk';
export interface Furniture { id: string; kind: FurnitureKind; x: number; y: number; w: number; h: number; rot: number }

export interface Plan { id: string; name: string; ceilingHeight: number; walls: Wall[]; rooms: Room[]; openings: Opening[]; furniture: Furniture[] }

export type MaterialCategory = 'paint' | 'tiles' | 'flooring' | 'board' | 'sanitary' | 'lighting' | 'kitchen' | 'skirting';
export interface Supplier { id: string; name: string; url: string; categories: MaterialCategory[]; note: string }
export interface Material {
  id: string; name: string; category: MaterialCategory; unit: string; price: number; supplierId: string;
  /** m² covered per unit (paint litre ≈ 10 m² per coat). */
  coverage?: number; hex?: string;
}

export interface Proposal {
  id: string; projectId: string; createdAt: string; scope: string[]; total: number;
  stages: { name: string; pct: number }[]; text: string; signature?: string; signedAt?: string;
}

export interface StudioData {
  clients: Client[]; projects: Project[]; milestones: Milestone[]; plans: Plan[];
  suppliers: Supplier[]; materials: Material[]; proposals: Proposal[];
}
