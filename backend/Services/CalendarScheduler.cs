using Microsoft.EntityFrameworkCore;
using TournamentHub.Api.Data;
using TournamentHub.Api.Models;

namespace TournamentHub.Api.Services;

public class CalendarScheduler
{
    private readonly AppDbContext _db;

    public CalendarScheduler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<CalendarDayDto>> GetCalendarAsync()
    {
        var matches = await _db.Matches
            .AsNoTracking()
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Include(m => m.Tournament)
            .Include(m => m.Group)
            .Where(m => m.Status != MatchStatus.Bye && m.ScheduledAt != null)
            .OrderBy(m => m.ScheduledAt)
            .ThenBy(m => m.TournamentId)
            .ThenBy(m => m.Id)
            .ToListAsync();

        return matches
            .GroupBy(m => DateOnly.FromDateTime(DateTime.SpecifyKind(m.ScheduledAt!.Value, DateTimeKind.Utc).Date))
            .OrderBy(g => g.Key)
            .Select(g => new CalendarDayDto(
                g.Key.ToString("yyyy-MM-dd"),
                g.Select(m => ToCalendarMatch(m)).ToList()))
            .ToList();
    }

    public async Task<IReadOnlyList<CalendarDayDto>> RescheduleAsync(DateOnly? startDate)
    {
        var start = startDate ?? DateOnly.FromDateTime(DateTime.UtcNow.Date);

        var tournaments = await _db.Tournaments
            .Include(t => t.Matches)
                .ThenInclude(m => m.HomeTeam)
            .Include(t => t.Matches)
                .ThenInclude(m => m.AwayTeam)
            .Include(t => t.Matches)
                .ThenInclude(m => m.Group)
            .OrderBy(t => t.CreatedAt)
            .ThenBy(t => t.Id)
            .ToListAsync();

        // Order: group matchdays across groups (R1 P0 of every group, then R1 P1…), then KO.
        // Calendar then rotates tournaments: T1 next, T2 next, T3 next, …
        var queues = tournaments
            .Select(t => t.Matches
                .Where(m => m.Status != MatchStatus.Bye)
                .OrderBy(m => m.Stage)
                .ThenBy(m => m.Round)
                .ThenBy(m => m.Position)
                .ThenBy(m => m.Group?.SortOrder ?? m.GroupId ?? 0)
                .ThenBy(m => m.Id)
                .ToList())
            .Where(q => q.Count > 0)
            .ToList();

        // Clear existing schedules for non-bye matches
        foreach (var t in tournaments)
        {
            foreach (var m in t.Matches.Where(x => x.Status != MatchStatus.Bye))
                m.ScheduledAt = null;
        }

        var day = start;
        var indices = queues.Select(_ => 0).ToList();
        var remaining = queues.Sum(q => q.Count);

        while (remaining > 0)
        {
            var progressed = false;
            for (var qi = 0; qi < queues.Count; qi++)
            {
                if (indices[qi] >= queues[qi].Count)
                    continue;

                var match = queues[qi][indices[qi]];
                indices[qi]++;
                remaining--;
                match.ScheduledAt = day.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc);
                day = day.AddDays(1);
                progressed = true;
            }

            if (!progressed)
                break;
        }

        await _db.SaveChangesAsync();
        return await GetCalendarAsync();
    }

    private static CalendarMatchDto ToCalendarMatch(Match m) => new(
        m.Id,
        m.TournamentId,
        m.Tournament.Name,
        m.Stage.ToString(),
        m.Status.ToString(),
        m.Group?.Name,
        m.Label,
        m.HomeTeam?.Name,
        m.AwayTeam?.Name,
        m.HomeScore,
        m.AwayScore,
        m.ScheduledAt
    );
}