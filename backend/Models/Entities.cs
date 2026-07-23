namespace TournamentHub.Api.Models;

public enum MatchStage
{
    Group = 0,
    Knockout = 1
}

public enum MatchStatus
{
    Scheduled = 0,
    Completed = 1,
    Bye = 2
}

public class Tournament
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool KnockoutGenerated { get; set; }

    public int PointsWin { get; set; } = 3;
    public int PointsDraw { get; set; } = 1;
    public int PointsLoss { get; set; } = 0;
    public int AdvancePerGroup { get; set; } = 2;
    public int TargetGroupSize { get; set; } = 4;

    public ICollection<Team> Teams { get; set; } = new List<Team>();
    public ICollection<Group> Groups { get; set; } = new List<Group>();
    public ICollection<Match> Matches { get; set; } = new List<Match>();
}

public class Team
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string? ShortName { get; set; }

    public ICollection<GroupTeam> GroupTeams { get; set; } = new List<GroupTeam>();
}

public class Group
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public ICollection<GroupTeam> GroupTeams { get; set; } = new List<GroupTeam>();
}

public class GroupTeam
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public Group Group { get; set; } = null!;
    public int TeamId { get; set; }
    public Team Team { get; set; } = null!;
    public int Seed { get; set; }
}

public class Match
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
    public MatchStage Stage { get; set; }
    public MatchStatus Status { get; set; } = MatchStatus.Scheduled;

    public int? GroupId { get; set; }
    public Group? Group { get; set; }

    /// <summary>Knockout round: 1 = first KO round, higher = later rounds. Final is max.</summary>
    public int Round { get; set; }
    public int Position { get; set; }
    public string? Label { get; set; }

    public int? HomeTeamId { get; set; }
    public Team? HomeTeam { get; set; }
    public int? AwayTeamId { get; set; }
    public Team? AwayTeam { get; set; }

    public int? HomeScore { get; set; }
    public int? AwayScore { get; set; }
    public DateTime? ScheduledAt { get; set; }

    /// <summary>Next knockout match this winner feeds into.</summary>
    public int? NextMatchId { get; set; }
    public Match? NextMatch { get; set; }
    public bool FeedsAsHome { get; set; } = true;
}
