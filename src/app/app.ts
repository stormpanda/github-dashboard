import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { GithubService } from './github';
import { Sidebar } from './sidebar';
import { KpiCards } from './kpi-cards';
import { EngagementChart } from './engagement-chart';
import { StarChart } from './star-chart';
import { PopularPaths } from './popular-paths';
import { TrafficReferrers } from './traffic-referrers';
import { ReleasesList } from './releases-list';
import { StargazersList } from './stargazers-list';
import { DownloadsChart } from './downloads-chart';

@Component({
  selector: 'app-root',
  imports: [
    DatePipe,
    Sidebar,
    KpiCards,
    EngagementChart,
    StarChart,
    DownloadsChart,
    PopularPaths,
    TrafficReferrers,
    ReleasesList,
    StargazersList,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly githubService = inject(GithubService);

  ngOnInit(): void {
    this.githubService.loadRepos();
  }
}
