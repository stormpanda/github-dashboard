import { Component, inject, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { GithubService } from './github';

@Component({
  selector: 'app-engagement-chart',
  imports: [DatePipe],
  template: `
    <div class="data-card svg-chart-card">
      <div class="card-header">
        <div class="card-title-group">
          <h3>Daily Visitor Engagement</h3>
          <p class="card-subtitle">Views (Blue) vs. Clones (Emerald) over 14 days</p>
        </div>
        <span class="badge">Engagement Trends</span>
      </div>
      <div class="chart-container">
        @if (dailyTrends().length > 1) {
          <div class="svg-chart-wrap">
            <svg viewBox="0 0 600 180" class="svg-chart" preserveAspectRatio="none">
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.18"/>
                  <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.00"/>
                </linearGradient>
                <linearGradient id="clonesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#10b981" stop-opacity="0.18"/>
                  <stop offset="100%" stop-color="#10b981" stop-opacity="0.00"/>
                </linearGradient>
              </defs>
              <!-- Horizontal Grid lines -->
              <line x1="0" y1="15" x2="600" y2="15" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
              <line x1="0" y1="85" x2="600" y2="85" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
              <line x1="0" y1="155" x2="600" y2="155" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
              
              <!-- Views Area & Line -->
              <path [attr.d]="engagementChartPaths().viewsArea" fill="url(#viewsGrad)" />
              <path [attr.d]="engagementChartPaths().viewsLine" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" />
              
              <!-- Clones Area & Line -->
              <path [attr.d]="engagementChartPaths().clonesArea" fill="url(#clonesGrad)" />
              <path [attr.d]="engagementChartPaths().clonesLine" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" />
              
              <!-- Interactive Hover Groups -->
              @for (pt of engagementChartPaths().points; track pt.date) {
                <g class="chart-point-group"
                   [class.active]="hoveredIndex() === $index"
                   (mouseenter)="hoveredIndex.set($index)"
                   (mouseleave)="hoveredIndex.set(null)">
                  <circle [attr.cx]="pt.x" [attr.cy]="pt.yViews" r="4" fill="#3b82f6" stroke="#fff" stroke-width="1.5" class="chart-point" />
                  <text [attr.x]="pt.x" [attr.y]="pt.yViews - 10" text-anchor="middle" class="chart-value-label views-label">{{ pt.views }}</text>
                </g>
                <g class="chart-point-group"
                   [class.active]="hoveredIndex() === $index"
                   (mouseenter)="hoveredIndex.set($index)"
                   (mouseleave)="hoveredIndex.set(null)">
                  <circle [attr.cx]="pt.x" [attr.cy]="pt.yClones" r="4" fill="#10b981" stroke="#fff" stroke-width="1.5" class="chart-point" />
                  <text [attr.x]="pt.x" [attr.y]="pt.yClones - 10" text-anchor="middle" class="chart-value-label clones-label">{{ pt.clones }}</text>
                </g>
              }
            </svg>

            <!-- Interactive X-Axis Labels -->
            <div class="chart-x-axis">
              @for (pt of engagementChartPaths().points; track pt.date) {
                @if ($first || $last || $index === 4 || $index === 9 || hoveredIndex() === $index) {
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
            <div class="legend-item"><span class="legend-dot views-dot"></span> Page Views</div>
            <div class="legend-item"><span class="legend-dot clones-dot"></span> Code Clones</div>
          </div>
        } @else {
          <div class="empty-state-placeholder">
            <span>Not enough data points to plot engagement history.</span>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './engagement-chart.scss',
})
export class EngagementChart {
  protected readonly githubService = inject(GithubService);
  protected readonly hoveredIndex = signal<number | null>(null);

  protected readonly dailyTrends = computed(() => {
    const views = this.githubService.summary()?.views.views ?? [];
    const clones = this.githubService.summary()?.clones.clones ?? [];
    
    const map = new Map<string, { date: string; views: number; viewsUniques: number; clones: number; clonesUniques: number }>();
    
    for (const v of views) {
      const dStr = v.timestamp.substring(0, 10);
      map.set(dStr, { date: dStr, views: v.count, viewsUniques: v.uniques, clones: 0, clonesUniques: 0 });
    }
    
    for (const c of clones) {
      const dStr = c.timestamp.substring(0, 10);
      const existing = map.get(dStr);
      if (existing) {
        existing.clones = c.count;
        existing.clonesUniques = c.uniques;
      } else {
        map.set(dStr, { date: dStr, views: 0, viewsUniques: 0, clones: c.count, clonesUniques: c.uniques });
      }
    }
    
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  });

  protected readonly engagementChartPaths = computed(() => {
    const trends = this.dailyTrends();
    const N = trends.length;
    if (N < 2) return { viewsLine: '', viewsArea: '', clonesLine: '', clonesArea: '', points: [] as any[] };
    
    const width = 600;
    const height = 180;
    const bottomY = height;
    const maxVal = Math.max(...trends.map(t => Math.max(t.views, t.clones)), 1);
    const dx = width / (N - 1);
    
    const viewsPoints: string[] = [];
    const clonesPoints: string[] = [];
    const pointsList: any[] = [];
    
    for (let i = 0; i < N; i++) {
      const t = trends[i];
      const x = i * dx;
      const yViews = height - (t.views / maxVal) * 140 - 15;
      const yClones = height - (t.clones / maxVal) * 140 - 15;
      
      viewsPoints.push(`${x.toFixed(1)},${yViews.toFixed(1)}`);
      clonesPoints.push(`${x.toFixed(1)},${yClones.toFixed(1)}`);
      
      pointsList.push({
        date: t.date,
        x,
        yViews,
        yClones,
        views: t.views,
        viewsUniques: t.viewsUniques,
        clones: t.clones,
        clonesUniques: t.clonesUniques
      });
    }
    
    const viewsLine = 'M ' + viewsPoints.join(' L ');
    const viewsArea = `${viewsLine} L ${width},${bottomY} L 0,${bottomY} Z`;
    
    const clonesLine = 'M ' + clonesPoints.join(' L ');
    const clonesArea = `${clonesLine} L ${width},${bottomY} L 0,${bottomY} Z`;
    
    return { viewsLine, viewsArea, clonesLine, clonesArea, points: pointsList };
  });
}
