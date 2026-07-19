import { Component, inject, computed, signal } from '@angular/core';
import { GithubService } from './github';

@Component({
  selector: 'app-downloads-chart',
  imports: [],
  template: `
    <div class="data-card svg-chart-card">
      <div class="card-header">
        <div class="card-title-group">
          <h3>Release Downloads Growth</h3>
          <p class="card-subtitle">Aggregated downloads across release versions</p>
        </div>
        <span class="badge">Downloads per Version</span>
      </div>
      <div class="chart-container">
        @if (releaseDownloads().length > 0) {
          <div class="svg-chart-wrap">
            <svg viewBox="0 0 600 180" 
                 class="svg-chart" 
                 [class.has-hovered]="hoveredIndex() !== null"
                 preserveAspectRatio="none">
              <defs>
                <linearGradient id="downloadsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.00"/>
                </linearGradient>
              </defs>
              <!-- Horizontal Grid lines -->
              <line x1="0" y1="15" x2="600" y2="15" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
              <line x1="0" y1="85" x2="600" y2="85" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
              <line x1="0" y1="155" x2="600" y2="155" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
              
              <!-- Area & Line (only if more than 1 point) -->
              @if (releaseDownloads().length > 1) {
                <path [attr.d]="chartPaths().area" fill="url(#downloadsGrad)" />
                <path [attr.d]="chartPaths().line" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" />
              }
              
              <!-- Interactive Hover Groups -->
              @for (pt of chartPaths().points; track pt.tag; let idx = $index) {
                <g class="chart-point-group"
                   [class.active]="hoveredIndex() === idx"
                   (mouseenter)="hoveredIndex.set(idx)"
                   (mouseleave)="hoveredIndex.set(null)">
                  <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="4" fill="#f59e0b" stroke="#fff" stroke-width="1.5" class="chart-point" />
                  <text [attr.x]="pt.x" [attr.y]="pt.y - 15" text-anchor="middle" class="chart-value-label downloads-label">{{ getPointLabel(idx) }}</text>
                </g>
              }
            </svg>

            <!-- Interactive X-Axis Labels -->
            <div class="chart-x-axis">
              @for (pt of chartPaths().points; track pt.tag; let idx = $index) {
                @if ($first || $last || idx === Math.floor(chartPaths().points.length / 2) || hoveredIndex() === idx) {
                  <span class="axis-label" 
                        [class.active]="hoveredIndex() === idx" 
                        [style.left.%]="(pt.x / 600) * 100">
                    {{ pt.tag }}
                  </span>
                }
              }
            </div>
          </div>
          <div class="chart-legend">
            <div class="legend-item"><span class="legend-dot downloads-dot"></span> Version Downloads</div>
          </div>
        } @else {
          <div class="empty-state-placeholder">
            <span>No release downloads found.</span>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './downloads-chart.scss',
})
export class DownloadsChart {
  protected readonly githubService = inject(GithubService);
  protected readonly Math = Math;
  protected readonly hoveredIndex = signal<number | null>(null);

  protected readonly releaseDownloads = computed(() => {
    const rawReleases = this.githubService.summary()?.releases ?? [];
    // Sort chronologically (oldest first) so growth trends left-to-right
    const releases = [...rawReleases].reverse();
    if (releases.length === 0) return [];

    return releases.map(r => {
      const totalDownloads = r.assets.reduce((sum, asset) => sum + asset.download_count, 0);
      return {
        tag: r.tag_name,
        name: r.name || r.tag_name,
        date: r.published_at,
        count: totalDownloads
      };
    });
  });

  protected readonly chartPaths = computed(() => {
    const history = this.releaseDownloads();
    const N = history.length;
    if (N === 0) return { line: '', area: '', points: [] as any[] };

    const width = 600;
    const height = 180;
    const bottomY = height;
    const maxDownloads = Math.max(...history.map(h => h.count), 1);
    const dx = N > 1 ? width / (N - 1) : 0;

    const points: string[] = [];
    const pointsList: any[] = [];

    for (let i = 0; i < N; i++) {
      const h = history[i];
      const x = N > 1 ? i * dx : width / 2;
      const y = height - (h.count / maxDownloads) * 140 - 15;

      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      pointsList.push({
        tag: h.tag,
        name: h.name,
        date: h.date,
        x,
        y,
        count: h.count
      });
    }

    const line = N > 1 ? 'M ' + points.join(' L ') : '';
    const area = N > 1 ? `${line} L ${width},${bottomY} L 0,${bottomY} Z` : '';

    return { line, area, points: pointsList };
  });

  protected getPointLabel(index: number): string {
    const history = this.releaseDownloads();
    const hovered = this.hoveredIndex();
    
    if (hovered === null || hovered === index) {
      return this.formatNumber(history[index].count);
    }
    
    const baseIdx = Math.min(index, hovered);
    const targetIdx = Math.max(index, hovered);
    
    const baseVal = history[baseIdx].count;
    const targetVal = history[targetIdx].count;
    
    if (baseVal === 0) {
      return targetVal > 0 ? '+100%' : '0%';
    }
    
    const growth = ((targetVal - baseVal) / baseVal) * 100;
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(0)}%`;
  }

  private formatNumber(val: number): string {
    return val.toLocaleString();
  }
}
