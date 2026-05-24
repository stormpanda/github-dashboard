# 📊 GitPulse — A Simple Local GitHub Dashboard

**GitPulse** is a lightweight local dashboard utility built with Angular v21 and a simple Express.js SSR backend. It queries the local GitHub CLI (`gh`) to display basic traffic and marketing metrics for your repositories in a single local interface. 

---

## 🛠️ Features

* **Page Views & Clones**: Displays side-by-side total and unique side-by-side counts for views and clones over the last 14 days.
* **Top Referrals**: Lists the external domains (e.g., Google, Reddit, Twitter) that generated traffic to your repository.
* **Popular Paths**: Shows the top 10 visited files and subpages.
* **Release Downloads**: Lists your official releases and summarizes individual asset download counts.
* **Recent Stargazers**: Displays a list of recent stargazers. For the 5 most recent stargazers, it fetches basic follower and repository counts to show their developer reach.
* **Simple SVG Charts**: Uses lightweight, native SVG paths to draw basic daily views/clones curves and a cumulative star growth curve. (Done without installing any heavy external charting libraries to keep SSR hydration simple).
* **Caching & Security**: Caches local API requests on the server for 5 minutes to avoid rate-limiting issues, and validates repo parameters against a local `.env` whitelist.

---

## ⚙️ How it Works

1. **Backend** (`src/server.ts`): Express.js parses your local `.env` file and executes standard, promisified `gh api` child-process shell calls using your existing local GitHub CLI session.
2. **Frontend** (`src/app/`): A basic standalone Angular 21 application. It fetches the data via `HttpClient` and structures it using reactive Signals.

---

## 🚦 Prerequisites

You need the following installed and configured locally:
1. **Node.js** (v20.6.0+ recommended)
2. **GitHub CLI (`gh`)** fully logged in on your machine:
   ```bash
   gh auth login
   ```
   *(Your CLI session must have permissions to read repository traffic, typically standard `repo` scope).*

---

## 🔧 Configuration (`.env`)

Create a `.env` file in the project root:

```env
# Optional: Explicit GITHUB_TOKEN. If left blank, it automatically uses your active 'gh' CLI login.
GITHUB_TOKEN=

# Comma-separated list of whitelisted repositories to track (e.g., owner/repo)
GITHUB_REPOS=stormpanda/megingiard,stormpanda/megingiard-releases
```

---

## 🚀 Running the Project

### Start Local Development Server
To launch the Vite dev server with Express endpoints:
```bash
npm run start
```
Once started, open `http://localhost:4200/`.

### Compile Production Build
To compile the bundles:
```bash
npm run build
```

### Run in Production
To start the compiled Express SSR Node server:
```bash
node dist/github-dashboard/server/server.mjs
```
