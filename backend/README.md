# Tournament Hub API

ASP.NET Core 8 + EF Core.

## Databases

- **Local:** SQLite (`ConnectionStrings:Default` = `Data Source=tournament.db`) — uses `EnsureCreated`
- **Production:** PostgreSQL (Neon / Supabase) — uses EF migrations via `Database.Migrate()` on startup

Set on Render:

```
ConnectionStrings__Default=<postgres connection URI>
```

For Supabase on Render, use the **Session pooler** URI (IPv4), not the direct `db.*` host.

## Migrations

```
dotnet ef migrations add <Name> --output-dir Migrations
```

Design-time factory targets Npgsql. After deploy, pending migrations apply automatically on boot.

If you previously created tables by hand in Supabase, either drop them and redeploy, or insert the migration row:

```sql
CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
  "MigrationId" varchar(150) NOT NULL PRIMARY KEY,
  "ProductVersion" varchar(32) NOT NULL
);
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260723222544_InitialPostgres', '8.0.11')
ON CONFLICT DO NOTHING;
```

(Only do the INSERT if your manual schema already matches the migration.)