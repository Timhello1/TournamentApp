using TournamentHub.Api.Models;

namespace TournamentHub.Api.Services;

public class TournamentFactory
{
    private static readonly string[] GroupNames =
    [
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"
    ];

    public void BuildGroupStage(Tournament tournament, IReadOnlyList<string> teamNames)
    {
        var names = teamNames
            .Select(n => n.Trim())
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (names.Count < 2)
            throw new InvalidOperationException("At least 2 unique team names are required.");

        var teams = names.Select(n => new Team
        {
            Name = n,
            ShortName = MakeShortName(n),
            Tournament = tournament
        }).ToList();

        foreach (var team in teams)
            tournament.Teams.Add(team);

        var target = Math.Clamp(tournament.TargetGroupSize, 2, 8);
        var groupCount = Math.Max(1, (int)Math.Ceiling(teams.Count / (double)target));

        while (groupCount > 1 && teams.Count / groupCount < 2)
            groupCount--;

        var shuffled = teams.OrderBy(_ => Random.Shared.Next()).ToList();
        var groups = new List<Group>();

        for (var i = 0; i < groupCount; i++)
        {
            var group = new Group
            {
                Name = $"Group {GroupNames[i % GroupNames.Length]}",
                SortOrder = i,
                Tournament = tournament
            };
            groups.Add(group);
            tournament.Groups.Add(group);
        }

        for (var i = 0; i < shuffled.Count; i++)
        {
            var group = groups[i % groupCount];
            group.GroupTeams.Add(new GroupTeam
            {
                Group = group,
                Team = shuffled[i],
                Seed = (i / groupCount) + 1
            });
        }

        foreach (var group in groups)
        {
            var groupTeams = group.GroupTeams.OrderBy(gt => gt.Seed).Select(gt => gt.Team).ToList();
            RoundRobin.AddGroupMatches(tournament, group, groupTeams);
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