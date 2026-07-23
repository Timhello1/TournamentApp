# Tournament Hub API

ASP.NET Core 8 Web API with EF Core + SQLite.

## Run locally

```bash
dotnet restore
dotnet run
```

Base URL: http://localhost:5080

## Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/tournaments | List tournaments |
| POST | /api/tournaments | Create (auto groups + RR) |
| GET | /api/tournaments/{id} | Detail |
| GET | /api/tournaments/{id}/standings | Group standings |
| GET | /api/tournaments/{id}/matches | Matches (`?stage=Group\|Knockout`) |
| GET | /api/tournaments/{id}/bracket | Knockout bracket |
| PUT | /api/matches/{id}/schedule | Set datetime |
| PUT | /api/matches/{id}/result | Enter scores |
| POST | /api/seed | Sample 16-team tournament |

## Auth (optional)

Set `ADMIN_API_KEY` to require `X-Admin-Api-Key` on write methods. Reads stay public.
