import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';

export interface Repository {
  id: number;
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
  id: number;
  tag_name: string;
  name: string;
  created_at: string;
  published_at: string;
  assets: ReleaseAsset[];
}

export interface StargazerUser {
  login: string;
  avatar_url: string;
  html_url: string;
  followers?: number;
  public_repos?: number;
  hasDetailedStats?: boolean;
}

export interface Stargazer {
  starred_at: string;
  user: StargazerUser;
}

export interface ForkUser {
  login: string;
  avatar_url: string;
  html_url: string;
  followers?: number;
  public_repos?: number;
  hasDetailedStats?: boolean;
}

export interface Fork {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  created_at: string;
  owner: ForkUser;
}

export interface RepoSummary {
  views: TrafficViewsSummary;
  clones: TrafficClonesSummary;
  referrers: Referrer[];
  paths: PopularPath[];
  releases: Release[];
  stargazers: Stargazer[];
  forks: Fork[];
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
}
