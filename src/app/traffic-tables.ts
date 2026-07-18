import { Component, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GithubService } from './github';

@Component({
  selector: 'app-traffic-tables',
  imports: [DecimalPipe],
  template: `
    <!-- Section 2: Popular Content Paths & Top Traffic Referrers -->
    <div class="grid-section split-2">
      <!-- Popular Paths Card -->
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

      <!-- Top Traffic Referral Sources -->
      <div class="data-card referrers-card">
        <div class="card-header">
          <h3>Top Traffic Referral Sources</h3>
          <span class="badge">Marketing Referrers</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Referrer Domain</th>
                <th class="text-right">Views</th>
                <th class="text-right">Uniques</th>
              </tr>
            </thead>
            <tbody>
              @for (item of referrers(); track item.referrer) {
                <tr>
                  <td class="file-path-cell">
                    <span class="referrer-icon">🔗</span>
                    <span class="file-path font-bold">{{ item.referrer }}</span>
                  </td>
                  <td class="text-right num-highlight-blue">{{ item.count | number }}</td>
                  <td class="text-right num-highlight-secondary">{{ item.uniques | number }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3" class="table-empty">No referral domains logged in the last 14 days.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styleUrl: './traffic-tables.scss',
})
export class TrafficTables {
  protected readonly githubService = inject(GithubService);

  protected readonly paths = computed(() => this.githubService.summary()?.paths ?? []);
  protected readonly referrers = computed(() => this.githubService.summary()?.referrers ?? []);
}
