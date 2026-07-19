import { Component, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GithubService } from './github';

@Component({
  selector: 'app-popular-paths',
  imports: [DecimalPipe],
  template: `
    <div class="data-card paths-card">
      <div class="card-header">
        <h3>Popular Content & File Visits</h3>
        <span class="badge">Top 10 Paths</span>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>File / Page Path</th>
              <th class="text-right">Views</th>
              <th class="text-right">Uniques</th>
            </tr>
          </thead>
          <tbody>
            @for (item of paths(); track item.path) {
              <tr>
                <td class="file-path-cell" [attr.title]="item.path">
                  <span class="file-icon">📄</span>
                  <span class="file-path">{{ item.path }}</span>
                </td>
                <td class="text-right num-highlight">{{ item.count | number }}</td>
                <td class="text-right num-highlight-secondary">{{ item.uniques | number }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3" class="table-empty">No file visits tracked in the last 14 days.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styleUrl: './popular-paths.scss',
})
export class PopularPaths {
  protected readonly githubService = inject(GithubService);
  protected readonly paths = computed(() => this.githubService.summary()?.paths ?? []);
}
