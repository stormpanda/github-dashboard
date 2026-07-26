import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';

export interface Repository {
  id: number | string;
  owner: string;
  name: string;
  fullName: string;
  description: string;
  starsCount: number;
  forksCount: number;
  openIssuesCount: number;
  avatarUrl: string;
  htmlUrl: string;
  error?: boolean;
}

export interface TrafficViewDay {
  timestamp: string;
  count: number;
  uniques: number;
}

export interface TrafficViewsSummary {
  count: number;
  uniques: number;
  views: TrafficViewDay[];
}

export interface ClonesDay {
  timestamp: string;
  count: number;
  uniques: number;
}

export interface TrafficClonesSummary {
  count: number;
  uniques: number;
  clones: ClonesDay[];
}

export interface Referrer {
  referrer: string;
  count: number;
  uniques: number;
}

export interface PopularPath {
  path: string;
  title: string;
  count: number;
  uniques: number;
}

export interface ReleaseAsset {
  name: string;
  download_count: number;
  size: number;
  browser_download_url: string;
}

export interface Release {
  url: string;
  html_url: string;
  id: number | string;
  tag_name: string;
  name: string;
  created_at: string;
  published_at: string;
  assets: ReleaseAsset[];
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
  followers?: number;
  public_repos?: number;
  earned_stars?: number;
  hasDetailedStats?: boolean;
}

export interface Stargazer {
  starred_at: string;
  user: GitHubUser;
}

export interface Fork {
  id: number | string;
  name: string;
  full_name: string;
  html_url: string;
  created_at: string;
  owner: GitHubUser;
}

export interface RepoSummary {
  views: TrafficViewsSummary;
  clones: TrafficClonesSummary;
  referrers: Referrer[];
  paths: PopularPath[];
  releases: Release[];
  stargazers: Stargazer[];
  forks: Fork[];
  totalStargazerStars?: number;
  fetchedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private readonly http = inject(HttpClient);

  // Read-only signals representing local state
  readonly repos = signal<Repository[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Active dashboard state signals
  readonly selectedRepo = signal<Repository | null>(null);
  readonly summary = signal<RepoSummary | null>(null);
  readonly loadingSummary = signal<boolean>(false);
  readonly summaryError = signal<string | null>(null);
  readonly activeTab = signal<'stargazers' | 'forks'>('stargazers');
  readonly stargazersSort = signal<'date_desc' | 'date_asc' | 'followers' | 'repos' | 'stars'>('date_desc');
  readonly forksSort = signal<'date_desc' | 'date_asc' | 'followers' | 'repos'>('date_desc');

  constructor() {
    effect(() => {
      const currentRepos = this.repos();
      const selected = this.selectedRepo();
      if (currentRepos.length > 0 && !selected) {
        this.selectRepo(currentRepos[0]);
      }
    });
  }

  /**
   * Load the list of configured repositories from the server .env
   */
  loadRepos(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<Repository[]>('/api/repos')
      .pipe(
        tap((data) => this.repos.set(data)),
        catchError((err) => {
          console.error('Failed to load repositories:', err);
          const errMsg = err.error?.error || 'Failed to retrieve repository configurations. Verify that your .env file is set up and gh CLI is authenticated.';
          this.error.set(errMsg);
          return throwError(() => err);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe();
  }

  /**
   * Fetch the summary metrics for a given owner and repository name
   */
  getRepoSummary(owner: string, name: string): Observable<RepoSummary> {
    return this.http.get<RepoSummary>(`/api/repos/${owner}/${name}/summary`).pipe(
      catchError((err) => {
        console.error(`Failed to load summary for ${owner}/${name}:`, err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Set active repository and trigger metrics retrieval
   */
  selectRepo(repo: Repository): void {
    this.selectedRepo.set(repo);
    this.activeTab.set('stargazers');
    this.fetchSummary(repo);
  }

  /**
   * Refresh metrics for the currently selected repository
   */
  refreshActive(): void {
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

    this.getRepoSummary(repo.owner, repo.name).subscribe({
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
}
