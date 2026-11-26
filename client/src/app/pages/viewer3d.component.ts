import { AfterViewInit, Component, ElementRef, OnDestroy, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { StudioStore } from '../core/studio.store';
import { ROOM_TYPES } from '../core/models';
import { dist, pointOnWall } from '../core/geometry';

const FURNITURE_HEIGHT: Record<string, number> = { sofa: 80, bed: 55, table: 75, wardrobe: 240, desk: 75, kitchen: 90, toilet: 45, shower: 210, bunk: 170 };

@Component({
  selector: 'app-viewer3d',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div><h1>תצוגת תלת-ממד</h1><p>המודל נבנה אוטומטית מהתכנית: קירות, ריצוף, פתחים ורהיטים. סיבוב בעכבר, וגלגלת לזום.</p></div>
      <span class="spacer"></span>
      <button class="btn" (click)="preset('iso')">איזומטרי</button>
      <button class="btn" (click)="preset('top')">מבט על</button>
      <button class="btn" (click)="preset('eye')">גובה עיניים</button>
      <button class="btn primary" (click)="snapshot()">📷 צילום הדמיה</button>
    </div>
    <div class="card wrap">
      <div #host class="host"></div>
      <div class="sun no-print">
        <label>☀️ מיקום השמש – שעה {{ hour() }}:00
          <input type="range" min="6" max="19" [ngModel]="hour()" (ngModelChange)="hour.set(+$event)" />
        </label>
        <label>עונה
          <select [ngModel]="season()" (ngModelChange)="season.set($event)">
            <option value="summer">קיץ (21.6)</option><option value="winter">חורף (21.12)</option>
          </select>
        </label>
        <label class="row"><input type="checkbox" [ngModel]="cutaway()" (ngModelChange)="cutaway.set($event)" /> חתך – קירות נמוכים</label>
      </div>
    </div>
  `,
  styles: [`
    .wrap { position: relative; padding: 0; overflow: hidden; }
    .host { height: 72vh; }
    .sun { position: absolute; top: 16px; inset-inline-start: 16px; background: color-mix(in srgb, var(--card) 88%, transparent); backdrop-filter: blur(6px);
      border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; display: grid; gap: 10px; min-width: 240px; }
  `],
})
export class Viewer3dComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(StudioStore);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  readonly hour = signal(10);
  readonly season = signal<'summer' | 'winter'>('summer');
  readonly cutaway = signal(false);

  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 1, 20000);
  private controls!: OrbitControls;
  private sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  private model = new THREE.Group();
  private frame = 0;
  private resize = () => this.fit();

  constructor() {
    effect(() => this.placeSun(this.hour(), this.season()));
    effect(() => { this.cutaway(); this.store.plan(); if (this.renderer) this.build(); });
  }

  ngAfterViewInit() {
    const el = this.host().nativeElement;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0xf1ebe3);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd6c8b8, 1.1));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -1200, right: 1200, top: 1200, bottom: -1200, near: 10, far: 5000 });
    this.scene.add(this.sun, this.sun.target, this.model);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: 0xe4dccf }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.build();
    this.preset('iso');
    this.placeSun(this.hour(), this.season());
    this.fit();
    window.addEventListener('resize', this.resize);
    const loop = () => { this.frame = requestAnimationFrame(loop); this.controls.update(); this.renderer.render(this.scene, this.camera); };
    loop();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    this.renderer?.dispose();
  }

  private fit() {
    const el = this.host().nativeElement;
    this.renderer.setSize(el.clientWidth, el.clientHeight);
    this.camera.aspect = el.clientWidth / el.clientHeight;
    this.camera.updateProjectionMatrix();
  }

  /** Builds meshes from the 2D plan: plan (x, y) → world (x, z), heights in cm. */
  private build() {
    this.model.clear();
    const plan = this.store.plan();
    const h = this.cutaway() ? 110 : plan.ceilingHeight;

    for (const r of plan.rooms) {
      const shape = new THREE.Shape(r.points.map(([x, y]) => new THREE.Vector2(x, -y)));
      const floor = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: ROOM_TYPES[r.type].color, roughness: 0.8 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.model.add(floor);
    }

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xfbf8f3, roughness: 0.9 });
    for (const w of plan.walls) {
      const len = dist(w.a, w.b);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(len + w.thickness, h, w.thickness), wallMat);
      mesh.position.set((w.a[0] + w.b[0]) / 2, h / 2, (w.a[1] + w.b[1]) / 2);
      mesh.rotation.y = -Math.atan2(w.b[1] - w.a[1], w.b[0] - w.a[0]);
      mesh.castShadow = mesh.receiveShadow = true;
      this.model.add(mesh);
    }

    // Openings: glass for windows (lets the sun in visually), dark frame for doors.
    for (const o of plan.openings) {
      const w = plan.walls.find(x => x.id === o.wallId);
      if (!w) continue;
      const [x, y] = pointOnWall(w, o.t);
      const isWin = o.kind === 'window';
      const height = isWin ? Math.min(130, h - 20) : Math.min(210, h);
      const mat = isWin ? new THREE.MeshPhysicalMaterial({ color: 0x9ec5e0, transparent: true, opacity: 0.45, roughness: 0.05 }) : new THREE.MeshStandardMaterial({ color: 0x8a6a4a });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(o.width, height, w.thickness + 4), mat);
      mesh.position.set(x, isWin ? Math.min(h - height / 2 - 5, 90 + height / 2) : height / 2, y);
      mesh.rotation.y = -Math.atan2(w.b[1] - w.a[1], w.b[0] - w.a[0]);
      this.model.add(mesh);
    }

    const furnMat = new THREE.MeshStandardMaterial({ color: 0x2f5d50, roughness: 0.6 });
    for (const f of plan.furniture) {
      const fh = FURNITURE_HEIGHT[f.kind] ?? 80;
      const rot = (f.rot * Math.PI) / 180;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(f.w, fh, f.h), f.kind === 'kitchen' ? new THREE.MeshStandardMaterial({ color: 0xb5562f }) : furnMat);
      mesh.position.set(f.x + f.w / 2, fh / 2, f.y + f.h / 2);
      mesh.rotation.y = -rot;
      mesh.castShadow = mesh.receiveShadow = true;
      this.model.add(mesh);
    }
  }

  /** Simplified solar position for Israel (~31.8°N): azimuth from hour, altitude from season. */
  private placeSun(hour: number, season: 'summer' | 'winter') {
    const maxAlt = season === 'summer' ? 81 : 35;
    const t = (hour - 6) / 13; // 06:00 → 19:00
    const altitude = Math.max(4, Math.sin(Math.PI * t) * maxAlt) * (Math.PI / 180);
    const azimuth = (Math.PI * (t - 0.5)) * (season === 'summer' ? 1.3 : 0.9);
    const r = 3000;
    // Sun rises in the east (−x in plan), passes south (+y), sets in the west.
    this.sun.position.set(600 - r * Math.sin(azimuth) * Math.cos(altitude), r * Math.sin(altitude), 450 + r * Math.cos(azimuth) * Math.cos(altitude));
    this.sun.target.position.set(600, 0, 450);
    this.sun.intensity = 0.6 + Math.sin(altitude) * 2.2;
  }

  preset(kind: 'iso' | 'top' | 'eye') {
    const target = new THREE.Vector3(600, 0, 450);
    const pos = kind === 'top' ? new THREE.Vector3(600, 1900, 452) : kind === 'eye' ? new THREE.Vector3(250, 160, 300) : new THREE.Vector3(-500, 1300, 1700);
    this.camera.position.copy(pos);
    this.controls.target.copy(kind === 'eye' ? new THREE.Vector3(800, 120, 300) : target);
    this.controls.update();
  }

  snapshot() {
    const a = document.createElement('a');
    a.href = this.renderer.domElement.toDataURL('image/png');
    a.download = 'render.png';
    a.click();
  }
}
