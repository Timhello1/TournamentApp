using TournamentHub.Api.Models;

namespace TournamentHub.Api.Services;

/// <summary>
/// Circle-method round-robin matchdays.
/// 4 teams example — Matchday 1: 1v2 and 3v4, then rotate ("swapsies") for later days.
/// </summary>
public static class RoundRobin
{
    public static void AddGroupMatches(Tournament tournament, Group group, IReadOnlyList<Team> teamsInSeedOrder)
    {
        var ordered = teamsInSeedOrder.Where(t => t is not null).ToList();
        if (ordered.Count < 2)
            return;

        var hasBye = ordered.Count % 2 == 1;
        var n = hasBye ? ordered.Count + 1 : ordered.Count;
        var half = n / 2;
        var slots = new Team?[n];

        // Arrange so round 1 pairs consecutive seeds: 1v2, 3v4, …
        slots[0] = ordered[0];
        slots[n - 1] = ordered[1];
        for (var i = 1; i < half; i++)
        {
            var a = i * 2;
            var b = a + 1;
            if (a < ordered.Count) slots[i] = ordered[a];
            if (b < ordered.Count) slots[n - 1 - i] = ordered[b];
        }

        var rounds = n - 1;
        for (var round = 1; round <= rounds; round++)
        {
            var position = 0;
            for (var i = 0; i < half; i++)
            {
                var home = slots[i];
                var away = slots[n - 1 - i];
                if (home is null || away is null)
                    continue;

                tournament.Matches.Add(new Match
                {
                    Tournament = tournament,
                    Stage = MatchStage.Group,
                    Status = MatchStatus.Scheduled,
                    Group = group,
                    Round = round,
                    Position = position++,
                    Label = $"{group.Name} · Matchday {round}",
                    HomeTeam = home,
                    AwayTeam = away
                });
            }

            var last = slots[^1];
            for (var i = n - 1; i > 1; i--)
                slots[i] = slots[i - 1];
            slots[1] = last;
        }
    }
}