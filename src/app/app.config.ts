import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors, HttpResponse } from '@angular/common/http';
import { from, switchMap, map } from 'rxjs';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        (req, next) => {
          if (typeof window === 'undefined' && req.url.startsWith('/api/')) {
            if (req.url === '/api/repos') {
              return from(import('../server-api.js')).pipe(
                switchMap((api) => from(api.getReposList())),
                map((data) => new HttpResponse({ status: 200, body: data }))
              );
            }
            const match = req.url.match(/\/api\/repos\/([^\/]+)\/([^\/]+)\/summary/);
            if (match) {
              const [, owner, repo] = match;
              return from(import('../server-api.js')).pipe(
                switchMap((api) => from(api.getRepoSummary(owner, repo))),
                map((data) => new HttpResponse({ status: 200, body: data }))
              );
            }
          }
          return next(req);
        }
      ])
    ),
    provideClientHydration(withEventReplay(), withHttpTransferCacheOptions({})),
  ],
};
