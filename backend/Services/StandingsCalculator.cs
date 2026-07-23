using TournamentHub.Api.Models;

namespace TournamentHub.Api.Services;

public class StandingsCalculator
{
    public IReadOnlyList<StandingRowDto> Calculate(
        Tournament tournament,
        Group group,
        IEnumerable<Match> groupMatches)
    {
        var teamStats = group.GroupTeams
            .Select(gt => gt.Team)
            .ToDictionary(
                t => t.Id,
                t => new MutableStanding(t.Id, t.Name));

        foreach (var match in groupMatches.Where(m =>
                     m.Stage == MatchStage.Group &&
                     (m.GroupId == group.Id || m.Group?.Id == group.Id || ReferenceEquals(m.Group, group)) &&
                     m.Status == MatchStatus.Completed &&
                     m.HomeTeamId.HasValue &&
                     m.AwayTeamId.HasValue &&
                     m.HomeScore.HasValue &&
                     m.AwayScore.HasValue))
        {
            var home = teamStats[match.HomeTeamId!.Value];
            var away = teamStats[match.AwayTeamId!.Value];
            var hs = match.HomeScore!.Value;
            var as_ = match.AwayScore!.Value;

            home.Played++;
            away.Played++;
            home.GoalsFor += hs;
            home.GoalsAgainst += as_;
            away.GoalsFor += as_;
            away.GoalsAgainst += hs;

            if (hs > as_)
            {
                home.Won++;
                away.Lost++;
                home.Points += tournament.PointsWin;
                away.Points += tournament.PointsLoss;
            }
            else if (hs < as_)
            {
                away.Won++;
                home.Lost++;
                away.Points += tournament.PointsWin;
                home.Points += tournament.PointsLoss;
            }
            else
            {
                home.Drawn++;
                away.Drawn++;
                home.Points += tournament.PointsDraw;
                away.Points += tournament.PointsDraw;
            }
        }

        var ordered = teamStats.Values
            .OrderByDescending(s => s.Points)
            .ThenByDescending(s => s.GoalsFor - s.GoalsAgainst)
            .ThenByDescending(s => s.GoalsFor)
            .ThenBy(s => s.TeamName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return ordered
            .Select((s, i) => new StandingRowDto(
                i + 1,
                s.TeamId,
                s.TeamName,
                s.Played,
                s.Won,
                s.Drawn,
                s.Lost,
                s.GoalsFor,
                s.GoalsAgainst,
                s.GoalsFor - s.GoalsAgainst,
                s.Points))
            .ToList();
    }

    private sealed class MutableStanding(int teamId, string teamName)
    {
        public int TeamId { get; } = teamId;
        public string TeamName { get; } = teamName;
        public int Played { get; set; }
        public int Won { get; set; }
        public int Drawn { get; set; }
        public int Lost { get; set; }
        public int GoalsFor { get; set; }
        public int GoalsAgainst { get; set; }
        public int Points { get; set; }
    }
}
