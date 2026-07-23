# Tournament Hub

Two-stage tournament hosting: group stage (round-robin) to single-elimination knockout.

Backend: ASP.NET Core 8 Web API + EF Core + SQLite  
Frontend: Next.js App Router + React + TypeScript

## Quick start

### Prerequisites

- .NET 8 SDK
- Node.js 20+

### Backend

```
cd backend
dotnet restore
dotnet run
```

API: http://localhost:5080  
Swagger: http://localhost:5080/swagger

### Frontend

```
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

Optional env in `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5080
```

### Optional admin key

If `ADMIN_API_KEY` is set on the backend, write endpoints require header `X-Admin-Api-Key`.  
Read endpoints stay public. Leave unset for open demo mode.

## MVP features

- Create named tournaments with many teams
- Auto group stage (~4 teams per group, round-robin)
- Configurable scoring (default 3/1/0) and top-N advancement (default 2)
- Tiebreakers: points, goal difference, goals for
- Schedule matches and enter results
- Standings recalculate automatically
- Knockout bracket auto-generates when group stage completes
- Screens: list, detail, groups, matches, bracket, match result entry

## Free hosting ($0)

Stack: **GitHub** (source) + **Render** (API) + **Vercel** (Next.js).

SQLite on Render free is **ephemeral** (no free persistent disk) — data can reset on redeploy. Fine for demos.

### 1. Put the code on GitHub

Create a public repo, then from this folder:

```
git add .
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "Initial Tournament Hub app"
git branch -M main
git remote add origin https://github.com/YOUR_USER/tournament-hub.git
git push -u origin main
```

### 2. Backend on Render (free)

1. Sign up at https://render.com with GitHub
2. **New → Web Service** → select this repo
3. Root directory: `backend`
4. Runtime: **Docker** (uses `backend/Dockerfile`)
5. Instance type: **Free**
6. Environment variables:
   - `CORS_ORIGINS` = `https://YOUR_APP.vercel.app` (update after step 3)
   - Optional: `ADMIN_API_KEY` = a secret string
7. Deploy → copy the service URL, e.g. `https://tournament-hub-api.onrender.com`

Cold starts: free services sleep after idle; first request can take ~30–60s.

### 3. Frontend on Vercel (free)

1. Sign up at https://vercel.com with GitHub
2. **Add New Project** → import the same repo
3. Root Directory: `frontend`
4. Framework: Next.js (auto)
5. Environment variable:
   - `NEXT_PUBLIC_API_URL` = your Render URL (no trailing slash)
6. Deploy → copy the Vercel URL
7. On Render: set `CORS_ORIGINS` to that Vercel URL and redeploy the API

### 4. Smoke test

Open the Vercel site → **Load demo** or create a tournament.

## Seed sample data

```
curl -X POST http://localhost:5080/api/seed
```

## License

MIT