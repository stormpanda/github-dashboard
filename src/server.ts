import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

// Custom .env loader to run in pure Node during SSR
if (existsSync('.env')) {
  try {
    const envContent = readFileSync('.env', 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          const key = trimmed.substring(0, idx).trim();
          let value = trimmed.substring(idx + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }
          process.env[key] = value;
        }
      }
    }
    console.log('Loaded local .env configuration variables');
  } catch (err) {
    console.error('Error loading .env file:', err);
  }
}

import { getReposList, getRepoSummary } from './server-api.js';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine({
  allowedHosts: ['*']
});

// 1. GET /api/repos - Fetches configured repository lists & metadata
app.get('/api/repos', async (req, res) => {
  try {
    const results = await getReposList();
    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error fetching repository list', details: err.message });
  }
});

// 2. GET /api/repos/:owner/:repo/summary - Aggregated stats for the selected repository
app.get('/api/repos/:owner/:repo/summary', async (req, res) => {
  const { owner, repo } = req.params;
  try {
    const summary = await getRepoSummary(owner, repo);
    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch repository summary data', details: err.message });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
