import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { GithubService } from './github';
import { Sidebar } from './sidebar';
import { KpiCards } from './kpi-cards';
import { EngagementChart } from './engagement-chart';
import { StarChart } from './star-chart';
import { TrafficTables } from './traffic-tables';
import { ReleasesList } from './releases-list';
import { StargazersList } from './stargazers-list';

@Component({
  selector: 'app-root',
  imports: [
    DatePipe,
    Sidebar,
    KpiCards,
    EngagementChart,
    StarChart,
    TrafficTables,
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
