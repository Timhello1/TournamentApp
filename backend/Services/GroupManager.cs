using Microsoft.EntityFrameworkCore;
using TournamentHub.Api.Data;
using TournamentHub.Api.Models;

namespace TournamentHub.Api.Services;

public class GroupManager
{
    private static readonly string[] GroupNames =
    [
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"
    ];

    private readonly AppDbContext _db;

    public GroupManager(AppDbContext db)
    {
        _db = db;
    }

    public async Task EnsureEditableAsync(Tournament tournament)
    {
        if (tournament.KnockoutGenerated)
            throw new InvalidOperationException("Cannot change groups after the knockout bracket was generated.");

        var hasResults = await _db.Matches.AnyAsync(m =>
            m.TournamentId == tournament.Id &&
            m.Stage == MatchStage.Group &&
            m.Status == MatchStatus.Completed);

        if (hasResults)
            throw new InvalidOperationException("Cannot change groups after group-stage results have been entered.");
    }

    public async Task MoveTeamAsync(Tournament tournament, int teamId, int targetGroupId)
    {
        await EnsureEditableAsync(tournament);

        var membership = tournament.Groups
            .SelectMany(g => g.GroupTeams)
            .FirstOrDefault(gt => gt.TeamId == teamId);

        if (membership is null)
            throw new InvalidOperationException("Team is not in this tournament's groups.");

        var target = tournament.Groups.FirstOrDefault(g => g.Id == targetGroupId);
        if (target is null)
            throw new InvalidOperationException("Target group not found.");

        if (membership.GroupId == targetGroupId)
            return;

        membership.GroupId = targetGroupId;
        membership.Group = target;
        membership.Seed = target.GroupTeams.Count + 1;

        RebuildGroupMatches(tournament);
        await _db.SaveChangesAsync();
    }

    public async Task ShuffleAsync(Tournament tournament)
    {
        await EnsureEditableAsync(tournament);

        var groups = tournament.Groups.OrderBy(g => g.SortOrder).ToList();
        if (groups.Count == 0)
            throw new InvalidOperationException("Add at least one group before shuffling.");

        var teams = tournament.Teams.OrderBy(_ => Random.Shared.Next()).ToList();
        var oldMemberships = groups.SelectMany(g => g.GroupTeams).ToList();
        _db.GroupTeams.RemoveRange(oldMemberships);
        foreach (var g in groups)
            g.GroupTeams.Clear();

        for (var i = 0; i < teams.Count; i++)
        {
            var group = groups[i % groups.Count];
            group.GroupTeams.Add(new GroupTeam
            {
                Group = group,
                Team = teams[i],
                Seed = (i / groups.Count) + 1
            });
        }

        RebuildGroupMatches(tournament);
        await _db.SaveChangesAsync();
    }

    public async Task<Group> AddGroupAsync(Tournament tournament, string? name)
    {
        await EnsureEditableAsync(tournament);

        var order = tournament.Groups.Count == 0
            ? 0
            : tournament.Groups.Max(g => g.SortOrder) + 1;

        var label = string.IsNullOrWhiteSpace(name)
            ? $"Group {GroupNames[order % GroupNames.Length]}"
            : name.Trim();

        var group = new Group
        {
            Name = label,
            SortOrder = order,
            Tournament = tournament
        };
        tournament.Groups.Add(group);
        await _db.SaveChangesAsync();
        return group;
    }

    public async Task<Team> AddTeamAsync(Tournament tournament, string name, int? groupId)
    {
        await EnsureEditableAsync(tournament);

        var trimmed = name.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new InvalidOperationException("Team name is required.");

        if (tournament.Teams.Any(t => t.Name.Equals(trimmed, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("A team with that name already exists.");

        Group? group;
        if (groupId is not null)
        {
            group = tournament.Groups.FirstOrDefault(g => g.Id == groupId.Value);
            if (group is null)
                throw new InvalidOperationException("Group not found.");
        }
        else
        {
            group = tournament.Groups.OrderBy(g => g.GroupTeams.Count).ThenBy(g => g.SortOrder).FirstOrDefault();
            if (group is null)
                throw new InvalidOperationException("Create a group before adding teams.");
        }

        var team = new Team
        {
            Name = trimmed,
            ShortName = MakeShortName(trimmed),
            Tournament = tournament
        };
        tournament.Teams.Add(team);
        group.GroupTeams.Add(new GroupTeam
        {
            Group = group,
            Team = team,
            Seed = group.GroupTeams.Count + 1
        });

        RebuildGroupMatches(tournament);
        await _db.SaveChangesAsync();
        return team;
    }

    private void RebuildGroupMatches(Tournament tournament)
    {
        var old = tournament.Matches.Where(m => m.Stage == MatchStage.Group).ToList();
        _db.Matches.RemoveRange(old);
        foreach (var m in old)
            tournament.Matches.Remove(m);

        foreach (var group in tournament.Groups.OrderBy(g => g.SortOrder))
        {
            var teams = group.GroupTeams.Select(gt => gt.Team).ToList();
            var position = 0;
            for (var i = 0; i < teams.Count; i++)
            {
                for (var j = i + 1; j < teams.Count; j++)
                {
                    tournament.Matches.Add(new Match
                    {
                        Tournament = tournament,
                        Stage = MatchStage.Group,
                        Status = MatchStatus.Scheduled,
                        Group = group,
                        Round = 1,
                        Position = position++,
                        Label = $"{group.Name} RR",
                        HomeTeam = teams[i],
                        AwayTeam = teams[j]
                    });
                }
            }
        }
    }

    private static string MakeShortName(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2)
            return string.Concat(parts.Take(3).Select(p => char.ToUpperInvariant(p[0])));
        return name.Length <= 3 ? name.ToUpperInvariant() : name[..3].ToUpperInvariant();
    }
}