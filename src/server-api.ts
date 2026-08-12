// In-Memory API Caching with Stale-While-Revalidate (SWR)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Record<string, CacheEntry<any>> = {};
const CACHE_FRESH_MS = 10 * 60 * 1000;     // 10 minutes fresh
const CACHE_MAX_STALE_MS = 60 * 60 * 1000; // 60 minutes stale

export async function getOrFetchCachedData<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = cache[cacheKey];

  if (cached) {
    const age = now - cached.timestamp;
    if (age < CACHE_FRESH_MS) {
      // Fresh cache hit
      return cached.data;
    } else if (age < CACHE_MAX_STALE_MS) {
      // Stale cache hit - return immediately, revalidate in background
      fetcher()
        .then((newData) => {
          cache[cacheKey] = { data: newData, timestamp: Date.now() };
        })
        .catch((err) => {
          console.error(`Background revalidation failed for ${cacheKey}:`, err.message);
        });
      return cached.data;
    }
  }

  // Cache miss or hard expiration
  const newData = await fetcher();
  cache[cacheKey] = { data: newData, timestamp: now };
  return newData;
}

// Token resolution helper: reads directly from process.env.GITHUB_TOKEN
export function getGitHubToken(): string | null {
  const token = process.env['GITHUB_TOKEN'];
  if (!token) {
    console.warn('Warning: GITHUB_TOKEN environment variable is not configured in .env.');
  }
  return token || null;
}

// Native fetch GitHub API helper
export async function fetchGitHubApi(endpoint: string): Promise<any> {
  const token = getGitHubToken();
  const headers: Record<string, string> = {
    'User-Agent': 'github-dashboard-app',
    'Accept': 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com/${endpoint}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`GitHub API HTTP ${response.status} on endpoint ${endpoint}:`, errorText);
    throw new Error(`GitHub API HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Native fetch GitHub GraphQL helper
export async function fetchGitHubGraphql(query: string, variables: Record<string, any> = {}): Promise<any> {
  const token = getGitHubToken();
  const headers: Record<string, string> = {
    'User-Agent': 'github-dashboard-app',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`GitHub GraphQL API HTTP ${response.status}:`, errorText);
    throw new Error(`GitHub GraphQL API HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch configured repository list & metadata
 */
export async function getReposList(): Promise<any[]> {
  const rawRepos = process.env['GITHUB_REPOS'] || '';
  const repos = rawRepos
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
  
  if (repos.length === 0) {
    throw new Error('No repositories configured in GITHUB_REPOS.');
  }

  const cacheKey = 'repos_list_metadata';

  return getOrFetchCachedData(cacheKey, async () => {
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

    const gqlResult = await fetchGitHubGraphql(query, {});

    return repos.map((repoStr, index) => {
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
  });
}

/**
 * Fetch aggregated stats summary for a repository
 */
export async function getRepoSummary(owner: string, repo: string): Promise<any> {
  const repoStr = `${owner}/${repo}`;
  const rawRepos = process.env['GITHUB_REPOS'] || '';
  const allowedRepos = rawRepos
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);

  if (!allowedRepos.includes(repoStr)) {
    throw new Error(`Access to repository ${repoStr} is not allowed.`);
  }

  const cacheKey = `summary_${owner}_${repo}`;

  return getOrFetchCachedData(cacheKey, async () => {
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
                repositories(privacy: PUBLIC) {
                  totalCount
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
      fetchGitHubApi(`repos/${repoStr}/traffic/views`),
      fetchGitHubApi(`repos/${repoStr}/traffic/clones`),
      fetchGitHubApi(`repos/${repoStr}/traffic/popular/referrers`),
      fetchGitHubApi(`repos/${repoStr}/traffic/popular/paths`),
      fetchGitHubGraphql(graphqlQuery, { owner, name: repo })
    ]);

    let stargazers: any[] = [];
    let forks: any[] = [];
    let releases: any[] = [];

    if (gqlData.status === 'fulfilled' && gqlData.value && gqlData.value.data && gqlData.value.data.repository) {
      const repoData = gqlData.value.data.repository;
      
      if (repoData.stargazers && Array.isArray(repoData.stargazers.edges)) {
        stargazers = repoData.stargazers.edges.map((edge: any) => ({
          starred_at: edge.starredAt,
          user: {
            login: edge.node.login,
            avatar_url: edge.node.avatarUrl,
            html_url: edge.node.url,
            followers: edge.node.followers?.totalCount ?? 0,
            public_repos: edge.node.repositories?.totalCount ?? 0,
            hasDetailedStats: true
          }
        }));
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

    return {
      views: viewsData.status === 'fulfilled' ? viewsData.value : { count: 0, uniques: 0, views: [] },
      clones: clonesData.status === 'fulfilled' ? clonesData.value : { count: 0, uniques: 0, clones: [] },
      referrers: referrersData.status === 'fulfilled' ? referrersData.value : [],
      paths: pathsData.status === 'fulfilled' ? pathsData.value : [],
      releases,
      stargazers,
      forks,
      fetchedAt: Date.now()
    };
  });
}
