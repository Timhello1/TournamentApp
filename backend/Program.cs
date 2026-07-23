using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using TournamentHub.Api.Data;
using TournamentHub.Api.Models;
using TournamentHub.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var cs = builder.Configuration.GetConnectionString("Default")
             ?? Environment.GetEnvironmentVariable("DATABASE_URL")
             ?? "Data Source=tournament.db";

    if (IsPostgresConnectionString(cs))
        options.UseNpgsql(NormalizePostgresConnectionString(cs));
    else
        options.UseSqlite(cs);
});

builder.Services.AddScoped<TournamentFactory>();
builder.Services.AddScoped<StandingsCalculator>();
builder.Services.AddScoped<BracketGenerator>();
builder.Services.AddScoped<GroupManager>();
builder.Services.AddScoped<CalendarScheduler>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var corsOrigins = (builder.Configuration["CORS_ORIGINS"]
                   ?? builder.Configuration["CorsOrigins"]
                   ?? "http://localhost:3000,http://127.0.0.1:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var provider = db.Database.ProviderName ?? "";
    if (provider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
        db.Database.Migrate();
    else
        db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");

app.Use(async (ctx, next) =>
{
    var adminKey = Environment.GetEnvironmentVariable("ADMIN_API_KEY")
                   ?? app.Configuration["ADMIN_API_KEY"];

    var isWrite = HttpMethods.IsPost(ctx.Request.Method)
                  || HttpMethods.IsPut(ctx.Request.Method)
                  || HttpMethods.IsDelete(ctx.Request.Method)
                  || HttpMethods.IsPatch(ctx.Request.Method);

    if (isWrite && !string.IsNullOrWhiteSpace(adminKey))
    {
        if (!ctx.Request.Headers.TryGetValue("X-Admin-Api-Key", out var provided) ||
            provided != adminKey)
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await ctx.Response.WriteAsJsonAsync(new { error = "Invalid or missing X-Admin-Api-Key." });
            return;
        }
    }

    await next();
});

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", service = "tournament-hub" }));

app.MapGet("/api/tournaments", async (AppDbContext db) =>
{
    var list = await db.Tournaments
        .Include(t => t.Teams)
        .Include(t => t.Groups)
        .Include(t => t.Matches)
        .OrderByDescending(t => t.CreatedAt)
        .ToListAsync();
    return Results.Ok(list.Select(Mapper.ToSummary));
});

app.MapGet("/api/tournaments/{id:int}", async (int id, AppDbContext db) =>
{
    var t = await LoadTournamentAsync(db, id);
    return t is null ? Results.NotFound() : Results.Ok(Mapper.ToDetail(t));
});

app.MapPost("/api/tournaments", async (
    CreateTournamentRequest req,
    AppDbContext db,
    TournamentFactory factory) =>
{
    if (string.IsNullOrWhiteSpace(req.Name))
        return Results.BadRequest(new { error = "Name is required." });
    if (req.TeamNames is null || req.TeamNames.Count < 2)
        return Results.BadRequest(new { error = "At least 2 teams are required." });

    var tournament = new Tournament
    {
        Name = req.Name.Trim(),
        Description = req.Description?.Trim(),
        PointsWin = req.PointsWin ?? 3,
        PointsDraw = req.PointsDraw ?? 1,
        PointsLoss = req.PointsLoss ?? 0,
        AdvancePerGroup = Math.Clamp(req.AdvancePerGroup ?? 2, 1, 8),
        TargetGroupSize = Math.Clamp(req.TargetGroupSize ?? 4, 2, 8)
    };

    try
    {
        factory.BuildGroupStage(tournament, req.TeamNames);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }

    db.Tournaments.Add(tournament);
    await db.SaveChangesAsync();

    var created = await LoadTournamentAsync(db, tournament.Id);
    return Results.Created($"/api/tournaments/{tournament.Id}", Mapper.ToDetail(created!));
});

app.MapPut("/api/tournaments/{id:int}", async (int id, UpdateTournamentRequest req, AppDbContext db) =>
{
    var t = await db.Tournaments.FindAsync(id);
    if (t is null) return Results.NotFound();

    if (!string.IsNullOrWhiteSpace(req.Name)) t.Name = req.Name.Trim();
    if (req.Description is not null) t.Description = req.Description.Trim();
    if (req.PointsWin is not null) t.PointsWin = req.PointsWin.Value;
    if (req.PointsDraw is not null) t.PointsDraw = req.PointsDraw.Value;
    if (req.PointsLoss is not null) t.PointsLoss = req.PointsLoss.Value;
    if (req.AdvancePerGroup is not null && !t.KnockoutGenerated)
        t.AdvancePerGroup = Math.Clamp(req.AdvancePerGroup.Value, 1, 8);

    await db.SaveChangesAsync();
    var updated = await LoadTournamentAsync(db, id);
    return Results.Ok(Mapper.ToDetail(updated!));
});

app.MapDelete("/api/tournaments/{id:int}", async (int id, AppDbContext db) =>
{
    var t = await db.Tournaments.FindAsync(id);
    if (t is null) return Results.NotFound();
    db.Tournaments.Remove(t);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapGet("/api/tournaments/{id:int}/standings", async (
    int id,
    AppDbContext db,
    StandingsCalculator standings) =>
{
    var t = await LoadTournamentAsync(db, id);
    if (t is null) return Results.NotFound();

    var result = t.Groups
        .OrderBy(g => g.SortOrder)
        .Select(g => new GroupStandingsDto(
            g.Id,
            g.Name,
            g.SortOrder,
            standings.Calculate(t, g, t.Matches)))
        .ToList();

    return Results.Ok(result);
});

app.MapGet("/api/tournaments/{id:int}/matches", async (int id, string? stage, AppDbContext db) =>
{
    var query = db.Matches
        .AsNoTracking()
        .Include(m => m.HomeTeam)
        .Include(m => m.AwayTeam)
        .Include(m => m.Group)
        .Where(m => m.TournamentId == id);

    if (!string.IsNullOrWhiteSpace(stage) &&
        Enum.TryParse<MatchStage>(stage, true, out var parsed))
    {
        query = query.Where(m => m.Stage == parsed);
    }

    var matches = await query
        .OrderBy(m => m.Stage)
        .ThenBy(m => m.Round)
        .ThenBy(m => m.GroupId)
        .ThenBy(m => m.Position)
        .ToListAsync();

    return Results.Ok(matches.Select(Mapper.ToDto));
});

app.MapGet("/api/matches/{matchId:int}", async (int matchId, AppDbContext db) =>
{
    var m = await db.Matches
        .AsNoTracking()
        .Include(x => x.HomeTeam)
        .Include(x => x.AwayTeam)
        .Include(x => x.Group)
        .FirstOrDefaultAsync(x => x.Id == matchId);
    return m is null ? Results.NotFound() : Results.Ok(Mapper.ToDto(m));
});

app.MapPut("/api/matches/{matchId:int}/schedule", async (
    int matchId,
    ScheduleMatchRequest req,
    AppDbContext db) =>
{
    var m = await db.Matches.FindAsync(matchId);
    if (m is null) return Results.NotFound();
    if (m.Status == MatchStatus.Bye)
        return Results.BadRequest(new { error = "Cannot schedule a bye." });

    m.ScheduledAt = req.ScheduledAt;
    await db.SaveChangesAsync();

    var updated = await db.Matches
        .Include(x => x.HomeTeam)
        .Include(x => x.AwayTeam)
        .Include(x => x.Group)
        .FirstAsync(x => x.Id == matchId);
    return Results.Ok(Mapper.ToDto(updated));
});

app.MapPut("/api/matches/{matchId:int}/result", async (
    int matchId,
    MatchResultRequest req,
    AppDbContext db,
    BracketGenerator bracket) =>
{
    if (req.HomeScore < 0 || req.AwayScore < 0)
        return Results.BadRequest(new { error = "Scores must be non-negative." });

    var m = await db.Matches
        .Include(x => x.HomeTeam)
        .Include(x => x.AwayTeam)
        .Include(x => x.NextMatch)
        .FirstOrDefaultAsync(x => x.Id == matchId);

    if (m is null) return Results.NotFound();
    if (m.Status == MatchStatus.Bye)
        return Results.BadRequest(new { error = "Cannot enter a result for a bye." });
    if (m.HomeTeamId is null || m.AwayTeamId is null)
        return Results.BadRequest(new { error = "Both teams must be assigned before entering a result." });

    if (m.Stage == MatchStage.Knockout && req.HomeScore == req.AwayScore)
        return Results.BadRequest(new { error = "Knockout matches cannot end in a draw. Enter a decisive score." });

    m.HomeScore = req.HomeScore;
    m.AwayScore = req.AwayScore;
    m.Status = MatchStatus.Completed;

    if (m.Stage == MatchStage.Knockout)
    {
        var winner = req.HomeScore > req.AwayScore ? m.HomeTeam! : m.AwayTeam!;
        BracketGenerator.PlaceWinner(m, winner);
    }

    await db.SaveChangesAsync();

    if (m.Stage == MatchStage.Group)
    {
        var tournament = await LoadTournamentAsync(db, m.TournamentId);
        if (tournament is not null && !tournament.KnockoutGenerated)
        {
            try
            {
                bracket.GenerateIfReady(tournament);
                await db.SaveChangesAsync();
            }
            catch (InvalidOperationException)
            {
                // Not enough qualifiers — leave knockout ungenerated
            }
        }
    }

    var updated = await db.Matches
        .Include(x => x.HomeTeam)
        .Include(x => x.AwayTeam)
        .Include(x => x.Group)
        .FirstAsync(x => x.Id == matchId);
    return Results.Ok(Mapper.ToDto(updated));
});

app.MapGet("/api/tournaments/{id:int}/bracket", async (int id, AppDbContext db) =>
{
    var t = await db.Tournaments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
    if (t is null) return Results.NotFound();

    var matches = await db.Matches
        .AsNoTracking()
        .Include(m => m.HomeTeam)
        .Include(m => m.AwayTeam)
        .Where(m => m.TournamentId == id && m.Stage == MatchStage.Knockout)
        .OrderBy(m => m.Round)
        .ThenBy(m => m.Position)
        .ToListAsync();

    if (matches.Count == 0)
        return Results.Ok(new BracketDto(t.KnockoutGenerated, Array.Empty<BracketRoundDto>()));

    var rounds = matches
        .GroupBy(m => m.Round)
        .OrderBy(g => g.Key)
        .Select(g => new BracketRoundDto(
            g.Key,
            g.First().Label ?? $"Round {g.Key}",
            g.OrderBy(m => m.Position).Select(Mapper.ToDto).ToList()))
        .ToList();

    return Results.Ok(new BracketDto(t.KnockoutGenerated, rounds));
});

app.MapPost("/api/tournaments/{id:int}/bracket/generate", async (
    int id,
    AppDbContext db,
    BracketGenerator bracket) =>
{
    var t = await LoadTournamentAsync(db, id);
    if (t is null) return Results.NotFound();
    if (t.KnockoutGenerated)
        return Results.BadRequest(new { error = "Knockout bracket already generated." });

    var groupMatches = t.Matches.Where(m => m.Stage == MatchStage.Group).ToList();
    if (groupMatches.Any(m => m.Status != MatchStatus.Completed))
        return Results.BadRequest(new { error = "All group matches must be completed first." });

    try
    {
        bracket.GenerateIfReady(t);
        await db.SaveChangesAsync();
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }

    return Results.Ok(new { generated = t.KnockoutGenerated });
});

app.MapPost("/api/seed", async (AppDbContext db, TournamentFactory factory) =>
{
    if (await db.Tournaments.AnyAsync(t => t.Name == "Arena Cup Demo"))
    {
        var existing = await LoadTournamentAsync(db, (await db.Tournaments.FirstAsync(t => t.Name == "Arena Cup Demo")).Id);
        return Results.Ok(Mapper.ToDetail(existing!));
    }

    var teams = new[]
    {
        "North Forge", "River Kings", "Coastal Blaze", "Summit FC",
        "Iron District", "Harbor United", "Prairie Storm", "Metro Atlas",
        "Canyon Roar", "Lakefront SC", "Eastgate Elite", "Western Pulse",
        "Central Volt", "Bayfront Tigers", "Highland Sparks", "Valley Thunder"
    };

    var tournament = new Tournament
    {
        Name = "Arena Cup Demo",
        Description = "Sample 16-team tournament with group stage and knockout bracket.",
        PointsWin = 3,
        PointsDraw = 1,
        PointsLoss = 0,
        AdvancePerGroup = 2,
        TargetGroupSize = 4
    };

    factory.BuildGroupStage(tournament, teams);
    db.Tournaments.Add(tournament);
    await db.SaveChangesAsync();

    var created = await LoadTournamentAsync(db, tournament.Id);
    return Results.Created($"/api/tournaments/{tournament.Id}", Mapper.ToDetail(created!));
});


app.MapPost("/api/tournaments/{id:int}/groups/move", async (
    int id,
    MoveTeamRequest req,
    AppDbContext db,
    GroupManager groups) =>
{
    var t = await LoadTournamentAsync(db, id);
    if (t is null) return Results.NotFound();
    try
    {
        await groups.MoveTeamAsync(t, req.TeamId, req.TargetGroupId);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    var updated = await LoadTournamentAsync(db, id);
    return Results.Ok(Mapper.ToDetail(updated!));
});

app.MapPost("/api/tournaments/{id:int}/groups/shuffle", async (
    int id,
    AppDbContext db,
    GroupManager groups) =>
{
    var t = await LoadTournamentAsync(db, id);
    if (t is null) return Results.NotFound();
    try
    {
        await groups.ShuffleAsync(t);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    var updated = await LoadTournamentAsync(db, id);
    return Results.Ok(Mapper.ToDetail(updated!));
});

app.MapPost("/api/tournaments/{id:int}/groups", async (
    int id,
    AddGroupRequest req,
    AppDbContext db,
    GroupManager groups) =>
{
    var t = await LoadTournamentAsync(db, id);
    if (t is null) return Results.NotFound();
    try
    {
        await groups.AddGroupAsync(t, req.Name);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    var updated = await LoadTournamentAsync(db, id);
    return Results.Ok(Mapper.ToDetail(updated!));
});

app.MapPost("/api/tournaments/{id:int}/teams", async (
    int id,
    AddTeamRequest req,
    AppDbContext db,
    GroupManager groups) =>
{
    var t = await LoadTournamentAsync(db, id);
    if (t is null) return Results.NotFound();
    try
    {
        await groups.AddTeamAsync(t, req.Name, req.GroupId);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    var updated = await LoadTournamentAsync(db, id);
    return Results.Ok(Mapper.ToDetail(updated!));
});

app.MapGet("/api/calendar", async (CalendarScheduler calendar) =>
    Results.Ok(await calendar.GetCalendarAsync()));

app.MapPost("/api/calendar/reschedule", async (
    RescheduleCalendarRequest? req,
    CalendarScheduler calendar) =>
{
    var days = await calendar.RescheduleAsync(req?.StartDate);
    return Results.Ok(days);
});

app.Run();

static async Task<Tournament?> LoadTournamentAsync(AppDbContext db, int id)
{
    return await db.Tournaments
        .Include(t => t.Teams)
        .Include(t => t.Groups)
            .ThenInclude(g => g.GroupTeams)
                .ThenInclude(gt => gt.Team)
        .Include(t => t.Matches)
            .ThenInclude(m => m.HomeTeam)
        .Include(t => t.Matches)
            .ThenInclude(m => m.AwayTeam)
        .Include(t => t.Matches)
            .ThenInclude(m => m.Group)
        .Include(t => t.Matches)
            .ThenInclude(m => m.NextMatch)
        .FirstOrDefaultAsync(t => t.Id == id);
}

static bool IsPostgresConnectionString(string cs) =>
    cs.Contains("Host=", StringComparison.OrdinalIgnoreCase)
    || cs.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
    || cs.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);

static string NormalizePostgresConnectionString(string cs)
{
    if (!cs.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
        && !cs.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        return cs;
    }

    var uri = new Uri(cs);
    var userInfo = uri.UserInfo.Split(':', 2);
    var user = Uri.UnescapeDataString(userInfo[0]);
    var pass = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
    var database = uri.AbsolutePath.Trim('/');
    var port = uri.IsDefaultPort ? 5432 : uri.Port;

    return $"Host={uri.Host};Port={port};Database={database};Username={user};Password={pass};SSL Mode=Require;Trust Server Certificate=true";
}
