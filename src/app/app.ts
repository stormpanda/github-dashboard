import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { GithubService, Repository, RepoSummary } from './github';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly githubService = inject(GithubService);

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

  // Chart computations
  protected readonly viewsHistory = computed(() => this.summary()?.views.views ?? []);
  protected readonly maxDayCount = computed(() => {
    const days = this.viewsHistory();
    if (days.length === 0) return 1;
    const max = Math.max(...days.map(d => d.count));
    return max > 0 ? max : 1;
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
