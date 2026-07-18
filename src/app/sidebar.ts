import { Component, inject } from '@angular/core';
import { GithubService } from './github';

@Component({
  selector: 'app-sidebar',
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">📊</span>
          <h1>GitPulse</h1>
        </div>
        <p class="logo-subtitle">Marketing Analytics</p>
      </div>

      <!-- Repository Selector List -->
      <nav class="repo-nav">
        <div class="nav-title">Tracked Repositories</div>
        
        @if (githubService.loading()) {
          <div class="sidebar-loading">
            <div class="spinner"></div>
            <span>Loading configs...</span>
          </div>
        } @else if (githubService.error(); as err) {
          <div class="sidebar-error">
            <p class="error-msg">{{ err }}</p>
            <button id="retry-configs-btn" (click)="githubService.loadRepos()" class="retry-btn">Retry Setup</button>
          </div>
        } @else {
          <ul class="repo-list">
            @for (repo of githubService.repos(); track repo.id) {
              <li class="repo-item" 
                  [class.active]="githubService.selectedRepo()?.id === repo.id" 
                  (click)="githubService.selectRepo(repo)"
                  [attr.id]="'repo-select-' + repo.name">
                <div class="repo-avatar-wrap">
                  <img [src]="repo.avatarUrl" [alt]="repo.name" class="repo-avatar" />
                </div>
                <div class="repo-info">
                  <span class="repo-name">{{ repo.name }}</span>
                  <span class="repo-owner">{{ repo.owner }}</span>
                </div>
                <div class="repo-meta-quick">
                  <span class="meta-star">⭐ {{ repo.starsCount }}</span>
                </div>
              </li>
            } @empty {
              <li class="empty-state">No repositories configured. Add them to \`.env\`.</li>
            }
          </ul>
        }
      </nav>

      <!-- Sidebar Footer -->
      <footer class="sidebar-footer">
        <div class="auth-status">
          <span class="status-dot online"></span>
          <span class="status-text">Connected to local \`gh\`</span>
        </div>
        <p class="copyright">v1.1.0 · DevRel Expansion</p>
      </footer>
    </aside>
  `,
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly githubService = inject(GithubService);
}
