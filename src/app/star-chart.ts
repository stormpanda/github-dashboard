import { Component, inject, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { GithubService } from './github';

@Component({
  selector: 'app-star-chart',
  imports: [DatePipe],
  template: `
    <div class="data-card svg-chart-card">
      <div class="card-header">
        <div class="card-title-group">
          <h3>Cumulative Star Growth</h3>
          <p class="card-subtitle">Repository popularity trajectory over stargazer timelines</p>
        </div>
        <span class="badge">Star Growth Velocity</span>
      </div>
      <div class="chart-container">
        @if (starGrowthHistory().length > 1) {
          <div class="svg-chart-wrap">
            <svg viewBox="0 0 600 180" 
                 class="svg-chart" 
                 [class.has-hovered]="hoveredIndex() !== null"
                 preserveAspectRatio="none">
              <defs>
                <linearGradient id="starsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.00"/>
                </linearGradient>
              </defs>
              <!-- Horizontal Grid lines -->
              <line x1="0" y1="15" x2="600" y2="15" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
              <line x1="0" y1="85" x2="600" y2="85" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
              <line x1="0" y1="155" x2="600" y2="155" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
              
              <!-- Stars Area & Line -->
              <path [attr.d]="starChartPaths().area" fill="url(#starsGrad)" />
              <path [attr.d]="starChartPaths().line" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" />
              
              <!-- Interactive Hover Groups -->
              @for (pt of starChartPaths().points; track pt.date) {
                <g class="chart-point-group"
                   [class.active]="hoveredIndex() === $index"
                   (mouseenter)="hoveredIndex.set($index)"
                   (mouseleave)="hoveredIndex.set(null)">
                  <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="4" fill="#8b5cf6" stroke="#fff" stroke-width="1.5" class="chart-point" />
                  <text [attr.x]="pt.x" [attr.y]="pt.y - 10" text-anchor="middle" class="chart-value-label stars-label">{{ pt.count }}</text>
                </g>
              }
            </svg>

            <!-- Interactive X-Axis Labels -->
            <div class="chart-x-axis">
              @for (pt of starChartPaths().points; track pt.date) {
                @if ($first || $last || $index === Math.floor(starChartPaths().points.length / 2) || hoveredIndex() === $index) {
                  <span class="axis-label" 
                        [class.active]="hoveredIndex() === $index" 
                        [style.left.%]="(pt.x / 600) * 100">
                    {{ pt.date | date:'MM/dd' }}
                  </span>
                }
              }
            </div>
          </div>
          <div class="chart-legend">
            <div class="legend-item"><span class="legend-dot stars-dot"></span> Cumulative Stars</div>
          </div>
        } @else {
          <div class="empty-state-placeholder">
            <span>Not enough stargazer dates to plot star growth curve.</span>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './star-chart.scss',
})
export class StarChart {
  protected readonly githubService = inject(GithubService);
  protected readonly Math = Math;
  protected readonly hoveredIndex = signal<number | null>(null);

  protected readonly starGrowthHistory = computed(() => {
    const rawStargazers = this.githubService.summary()?.stargazers ?? [];
    // Stargazers are returned newest-first from server; reverse to chronological order
    const stargazers = [...rawStargazers].reverse();
    if (stargazers.length === 0) return [];
    
    const growth: { date: string; count: number }[] = [];
    let runningTotal = 0;
    
    // Group stargazers by date
    const dateMap = new Map<string, number>();
    for (const star of stargazers) {
      const dateStr = star.starred_at.substring(0, 10);
      dateMap.set(dateStr, (dateMap.get(dateStr) ?? 0) + 1);
    }
    
    const sortedDates = Array.from(dateMap.keys()).sort();
    for (const d of sortedDates) {
      runningTotal += dateMap.get(d)!;
      growth.push({ date: d, count: runningTotal });
    }
    
    return growth;
  });

  protected readonly starChartPaths = computed(() => {
    const history = this.starGrowthHistory();
    const N = history.length;
    if (N < 2) return { line: '', area: '', points: [] as any[] };
    
    const width = 600;
    const height = 180;
    const bottomY = height;
    const maxStars = Math.max(...history.map(h => h.count), 1);
    const dx = width / (N - 1);
    
    const points: string[] = [];
    const pointsList: any[] = [];
    
    for (let i = 0; i < N; i++) {
      const h = history[i];
      const x = i * dx;
      const y = height - (h.count / maxStars) * 140 - 15;
      
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      pointsList.push({
        date: h.date,
        x,
        y,
        count: h.count
      });
    }
    
    const line = 'M ' + points.join(' L ');
    const area = `${line} L ${width},${bottomY} L 0,${bottomY} Z`;
    
    return { line, area, points: pointsList };
  });
}
