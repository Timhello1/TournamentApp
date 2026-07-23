# Tournament Hub

Two-stage tournament hosting: group stage (round-robin) to single-elimination knockout.

Backend: ASP.NET Core 8 Web API + EF Core (SQLite locally, PostgreSQL/Neon in production)  
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

Local default DB is SQLite (`tournament.db`).

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

## Free hosting ($0) with persistent data

Stack: **GitHub** + **Neon** (Postgres) + **Render** (API) + **Vercel** (Next.js).

### 1. Create a Neon database

1. Sign up at https://console.neon.tech (free)
2. Create a project (any name/region)
3. Open **Dashboard → Connection details**
4. Copy the connection string (URI). It looks like:
   `postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
5. Keep this secret — do not commit it to git

### 2. Put the code on GitHub

```
git add .
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "Use Neon Postgres for persistent hosting"
git push
```

### 3. Backend on Render

1. https://render.com → Web Service → this repo → root `backend` → Docker → Free
2. Environment variables:
   - `ConnectionStrings__Default` = paste the **Neon** connection string (full URI)
   - `CORS_ORIGINS` = `https://YOUR_APP.vercel.app` (exact frontend origin)
   - Optional: `ADMIN_API_KEY`
3. Deploy. On first boot the API creates tables automatically (`EnsureCreated`).
4. Copy the Render URL, e.g. `https://tournamentapp-xxxx.onrender.com`

Cold starts on free Render can take 30–60s after idle.

**If you already have a Render service:** open it → Environment → add/update `ConnectionStrings__Default` with the Neon URI → **Save** → Manual Deploy.

### 4. Frontend on Vercel

1. Import the same repo, root `frontend`
2. `NEXT_PUBLIC_API_URL` = Render URL with **no** trailing slash and **no** `/api` path
3. Deploy, then set Render `CORS_ORIGINS` to the Vercel URL and redeploy the API

### 5. Verify persistence

1. Create a tournament on the live site
2. Trigger a Render redeploy
3. Tournament should still be there (Neon survives redeploys; old SQLite-on-disk data does not migrate automatically)

## Seed sample data

```
curl -X POST http://localhost:5080/api/seed
```

## License

MIT