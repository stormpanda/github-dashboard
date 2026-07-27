import { Component, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GithubService } from './github';

@Component({
  selector: 'app-kpi-cards',
  imports: [DecimalPipe],
  template: `
    <div class="metrics-row">
      <!-- Card 1: Page Views -->
      <div class="metric-card views">
        <div class="metric-header">
          <span class="metric-title">14-Day Page Views</span>
          <span class="metric-icon">👁️</span>
        </div>
        <div class="metric-value">{{ totalViews() | number }}</div>
        <p class="metric-sub"><b>{{ uniqueVisitors() | number }}</b> unique visitors</p>
      </div>

      <!-- Card 2: Code Clones -->
      <div class="metric-card uniques">
        <div class="metric-header">
          <span class="metric-title">14-Day Code Clones</span>
          <span class="metric-icon">📥</span>
        </div>
        <div class="metric-value">{{ totalClones() | number }}</div>
        <p class="metric-sub"><b>{{ uniqueCloners() | number }}</b> unique developers</p>
      </div>

      <!-- Card 3: Asset Downloads -->
      <div class="metric-card downloads">
        <div class="metric-header">
          <span class="metric-title">Asset Downloads</span>
          <span class="metric-icon">📦</span>
        </div>
        <div class="metric-value">{{ totalDownloads() | number }}</div>
        <p class="metric-sub"><b>{{ currentReleaseDownloads() | number }}</b> downloads of current release</p>
      </div>

      <!-- Card 4: Stars Count -->
      <div class="metric-card stars">
        <div class="metric-header">
          <span class="metric-title">GitHub Stars</span>
          <span class="metric-icon">⭐</span>
        </div>
        <div class="metric-value">{{ starsCount() | number }}</div>
        <p class="metric-sub"><b>{{ stargazerStarsCount() | number }}</b> stars earned by stargazers</p>
      </div>
    </div>
  `,
  styleUrl: './kpi-cards.scss',
})
export class KpiCards {
  protected readonly githubService = inject(GithubService);

  protected readonly totalViews = computed(() => this.githubService.summary()?.views.count ?? 0);
  protected readonly uniqueVisitors = computed(() => this.githubService.summary()?.views.uniques ?? 0);
  
  protected readonly totalClones = computed(() => this.githubService.summary()?.clones.count ?? 0);
  protected readonly uniqueCloners = computed(() => this.githubService.summary()?.clones.uniques ?? 0);
  
  protected readonly totalDownloads = computed(() => {
    const releases = this.githubService.summary()?.releases ?? [];
    let sum = 0;
    for (const rel of releases) {
      for (const asset of rel.assets) {
        sum += asset.download_count;
      }
    }
    return sum;
  });

  protected readonly currentReleaseDownloads = computed(() => {
    const releases = this.githubService.summary()?.releases ?? [];
    if (releases.length === 0) return 0;
    return releases[0].assets.reduce((sum, asset) => sum + asset.download_count, 0);
  });

  protected readonly starsCount = computed(() => this.githubService.selectedRepo()?.starsCount ?? 0);
  protected readonly stargazerStarsCount = computed(() => this.githubService.summary()?.totalStargazerStars ?? 0);
}
