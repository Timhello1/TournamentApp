namespace TournamentHub.Api.Models;

public record CreateTournamentRequest(
    string Name,
    string? Description,
    IReadOnlyList<string> TeamNames,
    int? PointsWin,
    int? PointsDraw,
    int? PointsLoss,
    int? AdvancePerGroup,
    int? TargetGroupSize
);

public record UpdateTournamentRequest(
    string? Name,
    string? Description,
    int? PointsWin,
    int? PointsDraw,
    int? PointsLoss,
    int? AdvancePerGroup
);

public record ScheduleMatchRequest(DateTime? ScheduledAt);

public record MatchResultRequest(int HomeScore, int AwayScore);

public record StandingRowDto(
    int Rank,
    int TeamId,
    string TeamName,
    int Played,
    int Won,
    int Drawn,
    int Lost,
    int GoalsFor,
    int GoalsAgainst,
    int GoalDifference,
    int Points
);

public record GroupStandingsDto(
    int GroupId,
    string GroupName,
    int SortOrder,
    IReadOnlyList<StandingRowDto> Standings
);

public record TeamDto(int Id, string Name, string? ShortName);

public record GroupDto(int Id, string Name, int SortOrder, IReadOnlyList<TeamDto> Teams);

public record MatchDto(
    int Id,
    string Stage,
    string Status,
    int? GroupId,
    string? GroupName,
    int Round,
    int Position,
    string? Label,
    int? HomeTeamId,
    string? HomeTeamName,
    int? AwayTeamId,
    string? AwayTeamName,
    int? HomeScore,
    int? AwayScore,
    DateTime? ScheduledAt,
    int? NextMatchId,
    bool FeedsAsHome
);

public record BracketRoundDto(int Round, string Label, IReadOnlyList<MatchDto> Matches);

public record BracketDto(bool Generated, IReadOnlyList<BracketRoundDto> Rounds);

public record TournamentSummaryDto(
    int Id,
    string Name,
    string? Description,
    DateTime CreatedAt,
    int TeamCount,
    int GroupCount,
    int MatchCount,
    bool KnockoutGenerated,
    int CompletedGroupMatches,
    int TotalGroupMatches
);

public record TournamentDetailDto(
    int Id,
    string Name,
    string? Description,
    DateTime CreatedAt,
    bool KnockoutGenerated,
    int PointsWin,
    int PointsDraw,
    int PointsLoss,
    int AdvancePerGroup,
    int TargetGroupSize,
    IReadOnlyList<TeamDto> Teams,
    IReadOnlyList<GroupDto> Groups,
    int CompletedGroupMatches,
    int TotalGroupMatches
);

public record MoveTeamRequest(int TeamId, int TargetGroupId);
public record AddGroupRequest(string? Name);
public record AddTeamRequest(string Name, int? GroupId);
public record RescheduleCalendarRequest(DateOnly? StartDate);

public record CalendarMatchDto(
    int MatchId,
    int TournamentId,
    string TournamentName,
    string Stage,
    string Status,
    string? GroupName,
    string? Label,
    string? HomeTeamName,
    string? AwayTeamName,
    int? HomeScore,
    int? AwayScore,
    DateTime? ScheduledAt
);

public record CalendarDayDto(string Date, IReadOnlyList<CalendarMatchDto> Matches);