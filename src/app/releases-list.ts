import { Component, inject, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { GithubService } from './github';

@Component({
  selector: 'app-releases-list',
  imports: [DatePipe, DecimalPipe],
  template: `
    <!-- Release Asset Downloads Card -->
    <div class="data-card releases-card">
      <div class="card-header">
        <h3>Release Downloads Breakdown</h3>
        <span class="badge">Official Artifacts</span>
      </div>
      <div class="releases-list">
        @for (release of releases(); track release.id) {
          <div class="release-item">
            <div class="release-info-row">
              <div class="release-tag-group">
                <span class="release-badge">🏷️ {{ release.tag_name }}</span>
                <h4 class="release-title">{{ release.name || 'Release ' + release.tag_name }}</h4>
              </div>
              <span class="release-date">{{ release.published_at | date:'mediumDate' }}</span>
            </div>
            
            <ul class="asset-list">
              @for (asset of release.assets; track asset.browser_download_url) {
                <li class="asset-item">
                  <div class="asset-name-group">
                    <span class="asset-icon">💾</span>
                    <a [href]="asset.browser_download_url" target="_blank" class="asset-name" rel="noopener">
                      {{ asset.name }}
                    </a>
                    <span class="asset-size">({{ formatBytes(asset.size) }})</span>
                  </div>
                  <div class="asset-downloads">
                    <span class="download-badge">⬇️ {{ asset.download_count | number }} downloads</span>
                  </div>
                </li>
              } @empty {
                <li class="asset-empty">No assets compiled for this release (it may be source code only).</li>
              }
            </ul>
          </div>
        } @empty {
          <div class="empty-state-placeholder">
            <span class="empty-icon">📦</span>
            <span>No releases found for this repository.</span>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './releases-list.scss',
})
export class ReleasesList {
  protected readonly githubService = inject(GithubService);

  protected readonly releases = computed(() => this.githubService.summary()?.releases ?? []);

  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
