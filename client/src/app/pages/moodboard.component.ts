import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { StudioStore } from '../core/studio.store';
import { Material } from '../core/models';
import { harmony, kmeans, nearestPaint, Rgb, toHex } from '../core/palette';

interface Swatch { hex: string; share: number; paint: Material | null; delta: number; harmony: string[] }

/** Builds a demo "inspiration photo" procedurally so the page works before the user uploads anything. */
function demoImage(): string {
  const c = document.createElement('canvas');
  c.width = 480; c.height = 320;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 320);
  grad.addColorStop(0, '#e9dccb'); grad.addColorStop(1, '#d4bfa3');
  g.fillStyle = grad; g.fillRect(0, 0, 480, 320);
  g.fillStyle = '#9fae96'; g.fillRect(40, 60, 160, 200);   // sage cabinet
  g.fillStyle = '#b5562f'; g.beginPath(); g.arc(330, 170, 70, 0, Math.PI * 2); g.fill(); // terracotta vase
  g.fillStyle = '#3a3633'; g.fillRect(0, 280, 480, 40);    // charcoal floor strip
  g.fillStyle = '#f6f4ef'; g.fillRect(240, 40, 200, 40);   // white shelf
  return c.toDataURL();
}

@Component({
  selector: 'app-moodboard',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="page-head">
      <div><h1>לוח השראה וצבעים</h1><p>מעלים תמונת השראה. אלגוריתם k-means מחלץ את פלטת הצבעים, ומוצא לכל צבע את הגוון הקרוב בקטלוג הספקים (ΔE במרחב Lab)</p></div>
      <span class="spacer"></span>
      <label class="btn primary">⤒ העלאת תמונה<input type="file" accept="image/*" hidden (change)="upload($event)" /></label>
    </div>
    <div class="grid g2">
      <section class="card"><img [src]="image()" alt="תמונת השראה" (load)="analyse($event)" /></section>
      <section class="card">
        <h2>הפלטה שחולצה</h2>
        <div class="bar">@for (s of swatches(); track s.hex) { <span [style.background]="s.hex" [style.flex]="s.share"></span> }</div>
        @for (s of swatches(); track s.hex) {
          <div class="sw">
            <span class="dot" [style.background]="s.hex"></span>
            <div>
              <b dir="ltr">{{ s.hex }}</b> <span class="muted">· {{ s.share * 100 | number: '1.0-0' }}% מהתמונה</span>
              @if (s.paint) {
                <div class="match"><span class="dot sm" [style.background]="s.paint.hex"></span>{{ s.paint.name }}
                  <span class="chip" [class.sage]="s.delta < 12">ΔE {{ s.delta | number: '1.0-1' }}</span>
                  @if (store.supplier(s.paint.supplierId); as sup) { <a [href]="sup.url" target="_blank" rel="noopener">{{ sup.name }} ↗</a> }
                </div>
              }
              <div class="harm">הרמוניה: @for (h of s.harmony; track $index) { <span class="dot xs" [style.background]="h" [title]="h"></span> }</div>
            </div>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    img { width: 100%; border-radius: 10px; display: block; }
    .bar { display: flex; height: 46px; border-radius: 10px; overflow: hidden; margin-bottom: 14px; }
    .sw { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); }
    .dot { width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0; border: 1px solid var(--line); display: inline-block; }
    .dot.sm { width: 18px; height: 18px; border-radius: 5px; vertical-align: middle; margin-inline-end: 6px; }
    .dot.xs { width: 16px; height: 16px; border-radius: 50%; vertical-align: middle; margin-inline-start: 4px; }
    .match { font-size: 13px; margin-top: 4px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .harm { font-size: 12px; color: var(--muted); margin-top: 4px; }
  `],
})
export class MoodboardComponent {
  readonly store = inject(StudioStore);
  readonly image = signal(demoImage());
  readonly raw = signal<{ color: Rgb; share: number }[]>([]);
  readonly swatches = computed<Swatch[]>(() => {
    const paints = this.store.materials().filter(m => m.category === 'paint');
    return this.raw().map(({ color, share }) => {
      const n = nearestPaint(color, paints);
      return { hex: toHex(color), share, paint: n?.paint ?? null, delta: n?.delta ?? 0, harmony: harmony(color).map(toHex) };
    });
  });

  upload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.image.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  analyse(e: Event) {
    const img = e.target as HTMLImageElement;
    const c = document.createElement('canvas');
    const scale = 120 / Math.max(img.naturalWidth, img.naturalHeight);
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const px: Rgb[] = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) px.push([d[i], d[i + 1], d[i + 2]]);
    this.raw.set(kmeans(px, 6));
  }
}
