using TournamentHub.Api.Models;

namespace TournamentHub.Api.Services;

public static class Mapper
{
    public static MatchDto ToDto(Match m) => new(
        m.Id,
        m.Stage.ToString(),
        m.Status.ToString(),
        m.GroupId,
        m.Group?.Name,
        m.Round,
        m.Position,
        m.Label,
        m.HomeTeamId,
        m.HomeTeam?.Name,
        m.AwayTeamId,
        m.AwayTeam?.Name,
        m.HomeScore,
        m.AwayScore,
        m.ScheduledAt,
        m.NextMatchId,
        m.FeedsAsHome
    );

    public static TournamentSummaryDto ToSummary(Tournament t)
    {
        var groupMatches = t.Matches.Where(m => m.Stage == MatchStage.Group).ToList();
        return new TournamentSummaryDto(
            t.Id,
            t.Name,
            t.Description,
            t.CreatedAt,
            t.Teams.Count,
            t.Groups.Count,
            t.Matches.Count,
            t.KnockoutGenerated,
            groupMatches.Count(m => m.Status == MatchStatus.Completed),
            groupMatches.Count
        );
    }

    public static TournamentDetailDto ToDetail(Tournament t)
    {
        var groupMatches = t.Matches.Where(m => m.Stage == MatchStage.Group).ToList();
        return new TournamentDetailDto(
            t.Id,
            t.Name,
            t.Description,
            t.CreatedAt,
            t.KnockoutGenerated,
            t.PointsWin,
            t.PointsDraw,
            t.PointsLoss,
            t.AdvancePerGroup,
            t.TargetGroupSize,
            t.Teams.OrderBy(x => x.Name).Select(x => new TeamDto(x.Id, x.Name, x.ShortName)).ToList(),
            t.Groups.OrderBy(g => g.SortOrder).Select(g => new GroupDto(
                g.Id,
                g.Name,
                g.SortOrder,
                g.GroupTeams.OrderBy(gt => gt.Seed)
                    .Select(gt => new TeamDto(gt.Team.Id, gt.Team.Name, gt.Team.ShortName))
                    .ToList()
            )).ToList(),
            groupMatches.Count(m => m.Status == MatchStatus.Completed),
            groupMatches.Count
        );
    }
}
