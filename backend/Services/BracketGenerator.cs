using TournamentHub.Api.Models;

namespace TournamentHub.Api.Services;

public class BracketGenerator
{
    private readonly StandingsCalculator _standings;

    public BracketGenerator(StandingsCalculator standings)
    {
        _standings = standings;
    }

    public void GenerateIfReady(Tournament tournament)
    {
        if (tournament.KnockoutGenerated)
            return;

        var groupMatches = tournament.Matches.Where(m => m.Stage == MatchStage.Group).ToList();
        if (groupMatches.Count == 0)
            return;

        if (groupMatches.Any(m => m.Status != MatchStatus.Completed))
            return;

        var qualifiers = new List<(Team Team, int GroupOrder, int Rank)>();
        foreach (var group in tournament.Groups.OrderBy(g => g.SortOrder))
        {
            var standings = _standings.Calculate(tournament, group, groupMatches);
            var take = Math.Min(tournament.AdvancePerGroup, standings.Count);
            for (var i = 0; i < take; i++)
            {
                var row = standings[i];
                var team = tournament.Teams.First(t => t.Id == row.TeamId);
                qualifiers.Add((team, group.SortOrder, row.Rank));
            }
        }

        if (qualifiers.Count < 2)
            throw new InvalidOperationException("Need at least 2 qualifying teams for knockout.");

        // Seed: alternate groups by rank for better bracket balance
        var seeded = SeedTeams(qualifiers);
        BuildBracket(tournament, seeded);
        tournament.KnockoutGenerated = true;
        ResolveByes(tournament);
    }

    private static List<Team> SeedTeams(List<(Team Team, int GroupOrder, int Rank)> qualifiers)
    {
        // Classic snake: rank1 from each group, then rank2, alternating direction
        var byRank = qualifiers
            .GroupBy(q => q.Rank)
            .OrderBy(g => g.Key)
            .ToList();

        var result = new List<Team>();
        var reverse = false;
        foreach (var rankGroup in byRank)
        {
            var ordered = reverse
                ? rankGroup.OrderByDescending(q => q.GroupOrder)
                : rankGroup.OrderBy(q => q.GroupOrder);
            result.AddRange(ordered.Select(q => q.Team));
            reverse = !reverse;
        }

        return result;
    }

    private static void BuildBracket(Tournament tournament, List<Team> seeded)
    {
        var n = seeded.Count;
        var bracketSize = 1;
        while (bracketSize < n)
            bracketSize *= 2;

        var totalRounds = (int)Math.Log2(bracketSize);
        var slots = new Team?[bracketSize];

        // order[pos] = seed index at that bracket position (1vsN, 2vsN-1, …)
        var seedAtPosition = BuildSeedOrder(bracketSize);
        for (var pos = 0; pos < bracketSize; pos++)
        {
            var seedIndex = seedAtPosition[pos];
            if (seedIndex < seeded.Count)
                slots[pos] = seeded[seedIndex];
        }

        // Create matches from final back to round 1 for linking, then fill round 1
        var rounds = new Dictionary<int, List<Match>>();
        for (var round = totalRounds; round >= 1; round--)
        {
            var matchCount = 1 << (totalRounds - round);
            var list = new List<Match>();
            for (var pos = 0; pos < matchCount; pos++)
            {
                var match = new Match
                {
                    Tournament = tournament,
                    Stage = MatchStage.Knockout,
                    Status = MatchStatus.Scheduled,
                    Round = round,
                    Position = pos,
                    Label = RoundLabel(round, totalRounds)
                };
                list.Add(match);
                tournament.Matches.Add(match);
            }
            rounds[round] = list;
        }

        // Wire next-match pointers
        for (var round = 1; round < totalRounds; round++)
        {
            var current = rounds[round];
            var next = rounds[round + 1];
            for (var i = 0; i < current.Count; i++)
            {
                var nextMatch = next[i / 2];
                current[i].NextMatch = nextMatch;
                current[i].FeedsAsHome = i % 2 == 0;
            }
        }

        // Assign round-1 teams
        var firstRound = rounds[1];
        for (var i = 0; i < firstRound.Count; i++)
        {
            var home = slots[i * 2];
            var away = slots[i * 2 + 1];
            firstRound[i].HomeTeam = home;
            firstRound[i].AwayTeam = away;

            if (home is null && away is null)
            {
                // Shouldn't happen with proper seeding
                firstRound[i].Status = MatchStatus.Bye;
            }
            else if (home is null || away is null)
            {
                firstRound[i].Status = MatchStatus.Bye;
                var winner = home ?? away;
                if (firstRound[i].NextMatch is not null && winner is not null)
                    PlaceWinner(firstRound[i], winner);
            }
        }
    }

    /// <summary>Returns seed index for each bracket slot (0 = #1 seed). Yields classic 1vN pairings.</summary>
    private static int[] BuildSeedOrder(int size)
    {
        var list = new List<int> { 0 };
        while (list.Count < size)
        {
            var next = new List<int>();
            var mirror = list.Count * 2 - 1;
            foreach (var s in list)
            {
                next.Add(s);
                next.Add(mirror - s);
            }
            list = next;
        }
        return list.ToArray();
    }

    private static string RoundLabel(int round, int totalRounds)
    {
        var fromEnd = totalRounds - round;
        return fromEnd switch
        {
            0 => "Final",
            1 => "Semi-finals",
            2 => "Quarter-finals",
            _ => $"Round of {1 << (totalRounds - round + 1)}"
        };
    }

    public static void PlaceWinner(Match match, Team winner)
    {
        if (match.NextMatch is null)
            return;

        if (match.FeedsAsHome)
            match.NextMatch.HomeTeam = winner;
        else
            match.NextMatch.AwayTeam = winner;
    }

    private static void ResolveByes(Tournament tournament)
    {
        // Already handled during build for first round; keep for clarity
        foreach (var match in tournament.Matches
                     .Where(m => m.Stage == MatchStage.Knockout && m.Status == MatchStatus.Bye)
                     .OrderBy(m => m.Round)
                     .ThenBy(m => m.Position))
        {
            var winner = match.HomeTeam ?? match.AwayTeam;
            if (winner is not null)
                PlaceWinner(match, winner);
        }
    }
}
