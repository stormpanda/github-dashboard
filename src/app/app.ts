import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { DecimalPipe, DatePipe, LowerCasePipe } from '@angular/common';
import { GithubService, Repository, RepoSummary } from './github';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, DatePipe, LowerCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly githubService = inject(GithubService);
  protected readonly Math = Math;

  // Expose signals from service
  protected readonly repos = this.githubService.repos;
  protected readonly globalLoading = this.githubService.loading;
  protected readonly globalError = this.githubService.error;

  // Local component states
  protected readonly selectedRepo = signal<Repository | null>(null);
  protected readonly summary = signal<RepoSummary | null>(null);
  protected readonly loadingSummary = signal<boolean>(false);
  protected readonly summaryError = signal<string | null>(null);

  // Derived metrics from summary data
  protected readonly totalViews = computed(() => this.summary()?.views.count ?? 0);
  protected readonly uniqueVisitors = computed(() => this.summary()?.views.uniques ?? 0);
  
  // Clones stats (Phase 2)
  protected readonly totalClones = computed(() => this.summary()?.clones.count ?? 0);
  protected readonly uniqueCloners = computed(() => this.summary()?.clones.uniques ?? 0);
  
  // Referrers list (Phase 2)
  protected readonly referrers = computed(() => this.summary()?.referrers ?? []);

  // Releases stats
  protected readonly totalDownloads = computed(() => {
    const releases = this.summary()?.releases ?? [];
    let sum = 0;
    for (const rel of releases) {
      for (const asset of rel.assets) {
        sum += asset.download_count;
      }
    }
    return sum;
  });
  protected readonly starsCount = computed(() => this.selectedRepo()?.starsCount ?? 0);

  // Stargazers log
  protected readonly stargazersList = computed(() => this.summary()?.stargazers ?? []);

  // --- CHART COMPUTATIONS (Phase 2 Native SVG Charts) ---

  // 1. Daily Engagement (Views vs. Clones) Combined Chronological Data
  protected readonly dailyTrends = computed(() => {
    const views = this.summary()?.views.views ?? [];
    const clones = this.summary()?.clones.clones ?? [];
    
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

  // SVG coordinate path generation for Daily Engagement
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

  // 2. Cumulative Star Growth Timeline Data
  protected readonly starGrowthHistory = computed(() => {
    const rawStargazers = this.stargazersList();
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

  // SVG coordinate path generation for Cumulative Star Growth
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

  constructor() {
    // Automatically select the first repository once the list loads
    effect(() => {
      const currentRepos = this.repos();
      const selected = this.selectedRepo();
      if (currentRepos.length > 0 && !selected) {
        this.selectRepo(currentRepos[0]);
      }
    });
  }

  ngOnInit(): void {
    this.githubService.loadRepos();
  }

  /**
   * Set active repository and trigger metrics retrieval
   */
  protected selectRepo(repo: Repository): void {
    this.selectedRepo.set(repo);
    this.fetchSummary(repo);
  }

  /**
   * Refresh metrics for the currently selected repository
   */
  protected refreshActive(): void {
    const active = this.selectedRepo();
    if (active) {
      this.fetchSummary(active);
    }
  }

  /**
   * Fetch the summary metrics for a given repository
   */
  private fetchSummary(repo: Repository): void {
    this.loadingSummary.set(true);
    this.summaryError.set(null);

    this.githubService.getRepoSummary(repo.owner, repo.name).subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loadingSummary.set(false);
      },
      error: (err) => {
        console.error('Error fetching repository summary:', err);
        const errMsg = err.error?.error || 'Failed to retrieve repository metrics. Please check your network and GITHUB_TOKEN credentials.';
        this.summaryError.set(errMsg);
        this.loadingSummary.set(false);
      }
    });
  }

  /**
   * Surfacing stargazer advocacy metrics based on followers and public repos
   */
  protected getInfluenceScore(user: any): number {
    return (user.followers ?? 0) * 2 + (user.public_repos ?? 0) * 0.5;
  }

  protected getInfluenceLabel(user: any): string | null {
    if (!user.hasDetailedStats) return null;
    const score = this.getInfluenceScore(user);
    if (score > 500) return 'Titan';
    if (score > 100) return 'Catalyst';
    if (score > 20) return 'Advocate';
    return null;
  }

  /**
   * Utility to format bytes into readable sizes
   */
  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
