import { Component, inject, computed } from '@angular/core';
import { DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';
import { GithubService, GitHubUser } from './github';

@Component({
  selector: 'app-stargazers-list',
  imports: [DatePipe, DecimalPipe, LowerCasePipe],
  template: `
    <!-- Stargazers & Forks Tabbed Log Card (with Influence Levels) -->
    <div class="data-card stargazers-card tabbed-card">
      <div class="card-header tabbed-header">
        <div class="card-tabs">
          <button class="tab-btn" 
                  [class.active]="githubService.activeTab() === 'stargazers'" 
                  (click)="githubService.activeTab.set('stargazers')">
            ⭐ Stargazers
          </button>
          <button class="tab-btn" 
                  [class.active]="githubService.activeTab() === 'forks'" 
                  (click)="githubService.activeTab.set('forks')">
            🔱 Forks
          </button>
        </div>
        <span class="badge">
          @if (githubService.activeTab() === 'stargazers') {
            Advocate Followers
          } @else {
            Repository Copies
          }
        </span>
      </div>

      @if (githubService.activeTab() === 'stargazers') {
        <div class="stargazers-container">
          <div class="sort-bar">
            <span class="sort-label">Sort by:</span>
            <div class="sort-options">
              <button class="sort-btn" 
                      [class.active]="githubService.stargazersSort() === 'date_desc'" 
                      (click)="githubService.stargazersSort.set('date_desc')">
                📅 Newest
              </button>
              <button class="sort-btn" 
                      [class.active]="githubService.stargazersSort() === 'date_asc'" 
                      (click)="githubService.stargazersSort.set('date_asc')">
                📅 Oldest
              </button>
              <button class="sort-btn" 
                      [class.active]="githubService.stargazersSort() === 'followers'" 
                      (click)="githubService.stargazersSort.set('followers')">
                👥 Followers
              </button>
              <button class="sort-btn" 
                      [class.active]="githubService.stargazersSort() === 'repos'" 
                      (click)="githubService.stargazersSort.set('repos')">
                💻 Repositories
              </button>
              <button class="sort-btn" 
                      [class.active]="githubService.stargazersSort() === 'stars'" 
                      (click)="githubService.stargazersSort.set('stars')">
                ⭐ Stars
              </button>
            </div>
          </div>
          <div class="stargazers-grid">
            @for (star of stargazersList(); track star.user.login) {
              <a [href]="star.user.html_url" target="_blank" class="stargazer-item" [class.profiled]="star.user.hasDetailedStats" rel="noopener">
                <img [src]="star.user.avatar_url" [alt]="star.user.login" class="user-avatar" />
                <div class="user-info">
                  <div class="user-name-row">
                    <span class="user-name">{{ star.user.login }}</span>
                    @if (getInfluenceLabel(star.user); as label) {
                      <span class="influence-badge" [class]="label | lowercase">
                        {{ label }}
                      </span>
                    }
                  </div>
                  
                  @if (star.user.hasDetailedStats) {
                    <div class="user-stats-row">
                      <span class="stat-badge">👥 {{ star.user.followers | number }} followers</span>
                      <span class="stat-badge">💻 {{ star.user.public_repos }} repos</span>
                      <span class="stat-badge">⭐ {{ (star.user.earned_stars ?? 0) | number }} stars</span>
                    </div>
                  }
                  <span class="starred-date">Starred {{ star.starred_at | date:'shortDate' }}</span>
                </div>
              </a>
            } @empty {
              <div class="empty-state-placeholder">
                <span class="empty-icon">⭐</span>
                <span>No stargazers logged yet. Be the first to star!</span>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="stargazers-container">
          <div class="sort-bar">
            <span class="sort-label">Sort by:</span>
            <div class="sort-options">
              <button class="sort-btn" 
                      [class.active]="githubService.forksSort() === 'date_desc'" 
                      (click)="githubService.forksSort.set('date_desc')">
                📅 Newest
              </button>
              <button class="sort-btn" 
                      [class.active]="githubService.forksSort() === 'date_asc'" 
                      (click)="githubService.forksSort.set('date_asc')">
                📅 Oldest
              </button>
              <button class="sort-btn" 
                      [class.active]="githubService.forksSort() === 'followers'" 
                      (click)="githubService.forksSort.set('followers')">
                👥 Followers
              </button>
              <button class="sort-btn" 
                      [class.active]="githubService.forksSort() === 'repos'" 
                      (click)="githubService.forksSort.set('repos')">
                💻 Repositories
              </button>
            </div>
          </div>
          <div class="stargazers-grid">
            @for (fork of forksList(); track fork.id) {
              <a [href]="fork.html_url" target="_blank" class="stargazer-item" [class.profiled]="fork.owner.hasDetailedStats" rel="noopener">
                <img [src]="fork.owner.avatar_url" [alt]="fork.owner.login" class="user-avatar" />
                <div class="user-info">
                  <div class="user-name-row">
                    <span class="user-name">{{ fork.owner.login }}</span>
                    @if (getInfluenceLabel(fork.owner); as label) {
                      <span class="influence-badge" [class]="label | lowercase">
                        {{ label }}
                      </span>
                    }
                  </div>
                  
                  @if (fork.owner.hasDetailedStats) {
                    <div class="user-stats-row">
                      <span class="stat-badge">👥 {{ fork.owner.followers | number }} followers</span>
                      <span class="stat-badge">💻 {{ fork.owner.public_repos }} repos</span>
                    </div>
                  }
                  <span class="starred-date">Forked {{ fork.created_at | date:'shortDate' }}</span>
                </div>
              </a>
            } @empty {
              <div class="empty-state-placeholder">
                <span class="empty-icon">🔱</span>
                <span>No forks created yet. Be the first to fork/copy!</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './stargazers-list.scss',
})
export class StargazersList {
  protected readonly githubService = inject(GithubService);
  protected readonly Math = Math;

  protected readonly stargazersList = computed(() => {
    const list = [...(this.githubService.summary()?.stargazers ?? [])];
    const sort = this.githubService.stargazersSort();
    if (sort === 'date_desc') {
      return list.sort((a, b) => new Date(b.starred_at).getTime() - new Date(a.starred_at).getTime());
    }
    if (sort === 'date_asc') {
      return list.sort((a, b) => new Date(a.starred_at).getTime() - new Date(b.starred_at).getTime());
    }
    if (sort === 'followers') {
      return list.sort((a, b) => (b.user.followers ?? 0) - (a.user.followers ?? 0));
    }
    if (sort === 'repos') {
      return list.sort((a, b) => (b.user.public_repos ?? 0) - (a.user.public_repos ?? 0));
    }
    if (sort === 'stars') {
      return list.sort((a, b) => (b.user.earned_stars ?? 0) - (a.user.earned_stars ?? 0));
    }
    return list;
  });

  protected readonly forksList = computed(() => {
    const list = [...(this.githubService.summary()?.forks ?? [])];
    const sort = this.githubService.forksSort();
    if (sort === 'date_desc') {
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    if (sort === 'date_asc') {
      return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    if (sort === 'followers') {
      return list.sort((a, b) => (b.owner.followers ?? 0) - (a.owner.followers ?? 0));
    }
    if (sort === 'repos') {
      return list.sort((a, b) => (b.owner.public_repos ?? 0) - (a.owner.public_repos ?? 0));
    }
    return list;
  });

  protected getInfluenceScore(user: GitHubUser): number {
    return (user.followers ?? 0) * 2 + (user.public_repos ?? 0) * 0.5 + (user.earned_stars ?? 0) * 1.5;
  }

  protected getInfluenceLabel(user: GitHubUser): string | null {
    if (!user.hasDetailedStats) return null;
    const score = this.getInfluenceScore(user);
    if (score > 500) return 'Titan';
    if (score > 100) return 'Catalyst';
    if (score > 20) return 'Advocate';
    return null;
  }
}
