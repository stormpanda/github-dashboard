import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

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

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// In-Memory API Caching (5-minute duration)
const cache: Record<string, { data: any; expiry: number }> = {};
const CACHE_DURATION_MS = 5 * 60 * 1000;

// GitHub CLI execution helper
async function runGhApi(endpoint: string, headers: string[] = []): Promise<any> {
  const headerFlags = headers.map(h => `-H "${h.replace(/"/g, '\\"')}"`).join(' ');
  const token = process.env['GITHUB_TOKEN'];
  
  const env = { ...process.env };
  if (token) {
    env['GITHUB_TOKEN'] = token;
  }
  
  const cmd = `gh api "${endpoint}" ${headerFlags}`;
  try {
    const { stdout } = await execAsync(cmd, { env, maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (error: any) {
    console.error(`GitHub API error on endpoint ${endpoint}:`, error.message);
    throw error;
  }
}

// GitHub GraphQL execution helper
async function runGhGraphql(query: string, variables: Record<string, string>): Promise<any> {
  const token = process.env['GITHUB_TOKEN'];
  const env = { ...process.env };
  if (token) {
    env['GITHUB_TOKEN'] = token;
  }

  const args: string[] = [];
  args.push(`-f query="${query.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`);
  
  for (const [key, value] of Object.entries(variables)) {
    args.push(`-f "${key}=${value.replace(/"/g, '\\"')}"`);
  }

  const cmd = `gh api graphql ${args.join(' ')}`;
  try {
    const { stdout } = await execAsync(cmd, { env, maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (error: any) {
    console.error(`GitHub GraphQL API error:`, error.message);
    throw error;
  }
}

// 1. GET /api/repos - Fetches configured repository lists & metadata
app.get('/api/repos', async (req, res) => {
  const rawRepos = process.env['GITHUB_REPOS'] || '';
  const repos = rawRepos
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
  
  if (repos.length === 0) {
    return res.status(404).json({ error: 'No repositories configured in GITHUB_REPOS.' });
  }

  const cacheKey = 'repos_list_metadata';
  const now = Date.now();
  if (cache[cacheKey] && cache[cacheKey].expiry > now) {
    return res.json(cache[cacheKey].data);
  }

  try {
    const repoQueries = repos.map((repoStr, index) => {
      const [owner, name] = repoStr.split('/');
      return `
        repo_${index}: repository(owner: "${owner}", name: "${name}") {
          id
          name
          description
          url
          stargazerCount
          forkCount
          issues(states: OPEN) {
            totalCount
          }
          owner {
            login
            avatarUrl
          }
        }
      `;
    }).join('\n');

    const query = `
      query {
        ${repoQueries}
      }
    `;

    const gqlResult = await runGhGraphql(query, {});

    const results = repos.map((repoStr, index) => {
      const alias = `repo_${index}`;
      const repoData = gqlResult?.data?.[alias];
      const [owner, name] = repoStr.split('/');

      if (!repoData) {
        return {
          id: `err_${index}_${Math.random()}`,
          owner: owner || 'unknown',
          name: name || repoStr,
          fullName: repoStr,
          description: 'Failed to fetch repository metadata. Please verify your credentials and network connection.',
          starsCount: 0,
          forksCount: 0,
          openIssuesCount: 0,
          avatarUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
          htmlUrl: `https://github.com/${repoStr}`,
          error: true
        };
      }

      return {
        id: repoData.id,
        owner: repoData.owner.login,
        name: repoData.name,
        fullName: `${repoData.owner.login}/${repoData.name}`,
        description: repoData.description || '',
        starsCount: repoData.stargazerCount,
        forksCount: repoData.forkCount,
        openIssuesCount: repoData.issues?.totalCount ?? 0,
        avatarUrl: repoData.owner.avatarUrl,
        htmlUrl: repoData.url
      };
    });

    cache[cacheKey] = {
      data: results,
      expiry: now + CACHE_DURATION_MS
    };

    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error fetching repository list', details: err.message });
  }
});

// 2. GET /api/repos/:owner/:repo/summary - Aggregated stats for the selected repository (Phase 2 Expanded)
app.get('/api/repos/:owner/:repo/summary', async (req, res) => {
  const { owner, repo } = req.params;
  const repoStr = `${owner}/${repo}`;

  // Validate security (only allow repos specified in .env)
  const rawRepos = process.env['GITHUB_REPOS'] || '';
  const allowedRepos = rawRepos
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);

  if (!allowedRepos.includes(repoStr)) {
    return res.status(403).json({ error: `Access to repository ${repoStr} is not allowed.` });
  }

  const cacheKey = `summary_${owner}_${repo}`;
  const now = Date.now();
  if (cache[cacheKey] && cache[cacheKey].expiry > now) {
    return res.json(cache[cacheKey].data);
  }

  try {
    const graphqlQuery = `
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          stargazers(first: 100, orderBy: {field: STARRED_AT, direction: DESC}) {
            edges {
              starredAt
              node {
                login
                avatarUrl
                url
                followers {
                  totalCount
                }
                repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
                  totalCount
                  nodes {
                    stargazerCount
                  }
                }
              }
            }
          }
          forks(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              id
              name
              nameWithOwner
              url
              createdAt
              owner {
                login
                avatarUrl
                url
                repositories(privacy: PUBLIC) {
                  totalCount
                }
                ... on User {
                  followers {
                    totalCount
                  }
                }
              }
            }
          }
          releases(first: 10, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              id
              url
              tagName
              name
              createdAt
              publishedAt
              releaseAssets(first: 20) {
                nodes {
                  name
                  downloadCount
                  size
                  downloadUrl
                }
              }
            }
          }
        }
      }
    `;

    const [viewsData, clonesData, referrersData, pathsData, gqlData] = await Promise.allSettled([
      runGhApi(`repos/${repoStr}/traffic/views`),
      runGhApi(`repos/${repoStr}/traffic/clones`),
      runGhApi(`repos/${repoStr}/traffic/popular/referrers`),
      runGhApi(`repos/${repoStr}/traffic/popular/paths`),
      runGhGraphql(graphqlQuery, { owner, name: repo })
    ]);

    let stargazers: any[] = [];
    let forks: any[] = [];
    let releases: any[] = [];
    let totalStargazerStars = 0;

    if (gqlData.status === 'fulfilled' && gqlData.value && gqlData.value.data && gqlData.value.data.repository) {
      const repoData = gqlData.value.data.repository;
      
      if (repoData.stargazers && Array.isArray(repoData.stargazers.edges)) {
        stargazers = repoData.stargazers.edges.map((edge: any) => {
          const userRepos = edge.node.repositories?.nodes || [];
          const userEarnedStars = userRepos.reduce((acc: number, r: any) => acc + (r.stargazerCount ?? 0), 0);
          totalStargazerStars += userEarnedStars;

          return {
            starred_at: edge.starredAt,
            user: {
              login: edge.node.login,
              avatar_url: edge.node.avatarUrl,
              html_url: edge.node.url,
              followers: edge.node.followers?.totalCount ?? 0,
              public_repos: edge.node.repositories?.totalCount ?? 0,
              earned_stars: userEarnedStars,
              hasDetailedStats: true
            }
          };
        });
      }

      if (repoData.forks && Array.isArray(repoData.forks.nodes)) {
        forks = repoData.forks.nodes.map((node: any) => ({
          id: node.id,
          name: node.name,
          full_name: node.nameWithOwner,
          html_url: node.url,
          created_at: node.createdAt,
          owner: {
            login: node.owner?.login ?? '',
            avatar_url: node.owner?.avatarUrl ?? '',
            html_url: node.owner?.url ?? '',
            followers: node.owner?.followers?.totalCount ?? 0,
            public_repos: node.owner?.repositories?.totalCount ?? 0,
            hasDetailedStats: true
          }
        }));
      }

      if (repoData.releases && Array.isArray(repoData.releases.nodes)) {
        releases = repoData.releases.nodes.map((node: any) => ({
          id: node.id,
          url: node.url,
          html_url: node.url,
          tag_name: node.tagName,
          name: node.name || node.tagName,
          created_at: node.createdAt,
          published_at: node.publishedAt,
          assets: Array.isArray(node.releaseAssets?.nodes)
            ? node.releaseAssets.nodes.map((asset: any) => ({
                name: asset.name,
                download_count: asset.downloadCount ?? 0,
                size: asset.size ?? 0,
                browser_download_url: asset.downloadUrl ?? ''
              }))
            : []
        }));
      }
    }

    const summary = {
      views: viewsData.status === 'fulfilled' ? viewsData.value : { count: 0, uniques: 0, views: [] },
      clones: clonesData.status === 'fulfilled' ? clonesData.value : { count: 0, uniques: 0, clones: [] },
      referrers: referrersData.status === 'fulfilled' ? referrersData.value : [],
      paths: pathsData.status === 'fulfilled' ? pathsData.value : [],
      releases,
      stargazers,
      forks,
      totalStargazerStars,
      fetchedAt: now
    };

    cache[cacheKey] = {
      data: summary,
      expiry: now + CACHE_DURATION_MS
    };

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
