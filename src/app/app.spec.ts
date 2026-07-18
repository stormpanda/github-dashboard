import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { GithubService } from './github';
import { signal } from '@angular/core';

describe('App', () => {
  let mockGithubService: any;

  beforeEach(async () => {
    mockGithubService = {
      repos: signal([]),
      loading: signal(false),
      error: signal(null),
      selectedRepo: signal(null),
      summary: signal(null),
      loadingSummary: signal(false),
      summaryError: signal(null),
      activeTab: signal('stargazers'),
      stargazersSort: signal('date_desc'),
      forksSort: signal('date_desc'),
      loadRepos: () => {}
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: GithubService, useValue: mockGithubService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.logo h1')?.textContent).toContain('GitPulse');
  });
});
