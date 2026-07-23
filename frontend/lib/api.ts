export type Team = {
  id: number;
  name: string;
  shortName?: string | null;
};

export type Group = {
  id: number;
  name: string;
  sortOrder: number;
  teams: Team[];
};

export type TournamentSummary = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  teamCount: number;
  groupCount: number;
  matchCount: number;
  knockoutGenerated: boolean;
  completedGroupMatches: number;
  totalGroupMatches: number;
};

export type TournamentDetail = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  knockoutGenerated: boolean;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  advancePerGroup: number;
  targetGroupSize: number;
  teams: Team[];
  groups: Group[];
  completedGroupMatches: number;
  totalGroupMatches: number;
};

export type StandingRow = {
  rank: number;
  teamId: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type GroupStandings = {
  groupId: number;
  groupName: string;
  sortOrder: number;
  standings: StandingRow[];
};

export type Match = {
  id: number;
  stage: string;
  status: string;
  groupId?: number | null;
  groupName?: string | null;
  round: number;
  position: number;
  label?: string | null;
  homeTeamId?: number | null;
  homeTeamName?: string | null;
  awayTeamId?: number | null;
  awayTeamName?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  scheduledAt?: string | null;
  nextMatchId?: number | null;
  feedsAsHome: boolean;
};

export type BracketRound = {
  round: number;
  label: string;
  matches: Match[];
};

export type Bracket = {
  generated: boolean;
  rounds: BracketRound[];
};

export type CreateTournamentPayload = {
  name: string;
  description?: string;
  teamNames: string[];
  pointsWin?: number;
  pointsDraw?: number;
  pointsLoss?: number;
  advancePerGroup?: number;
  targetGroupSize?: number;
};


export type CalendarMatch = {
  matchId: number;
  tournamentId: number;
  tournamentName: string;
  stage: string;
  status: string;
  groupName?: string | null;
  label?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  scheduledAt?: string | null;
};

export type CalendarDay = {
  date: string;
  matches: CalendarMatch[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listTournaments: () => request<TournamentSummary[]>("/api/tournaments"),
  getTournament: (id: number | string) =>
    request<TournamentDetail>(`/api/tournaments/${id}`),
  createTournament: (payload: CreateTournamentPayload) =>
    request<TournamentDetail>("/api/tournaments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteTournament: (id: number | string) =>
    request<void>(`/api/tournaments/${id}`, { method: "DELETE" }),
  getStandings: (id: number | string) =>
    request<GroupStandings[]>(`/api/tournaments/${id}/standings`),
  getMatches: (id: number | string, stage?: string) =>
    request<Match[]>(
      `/api/tournaments/${id}/matches${stage ? `?stage=${stage}` : ""}`
    ),
  getMatch: (matchId: number | string) =>
    request<Match>(`/api/matches/${matchId}`),
  scheduleMatch: (matchId: number | string, scheduledAt: string | null) =>
    request<Match>(`/api/matches/${matchId}/schedule`, {
      method: "PUT",
      body: JSON.stringify({ scheduledAt }),
    }),
  setResult: (matchId: number | string, homeScore: number, awayScore: number) =>
    request<Match>(`/api/matches/${matchId}/result`, {
      method: "PUT",
      body: JSON.stringify({ homeScore, awayScore }),
    }),
  getBracket: (id: number | string) =>
    request<Bracket>(`/api/tournaments/${id}/bracket`),
  seed: () => request<TournamentDetail>("/api/seed", { method: "POST" }),
  moveTeam: (id: number | string, teamId: number, targetGroupId: number) =>
    request<TournamentDetail>(`/api/tournaments/${id}/groups/move`, {
      method: "POST",
      body: JSON.stringify({ teamId, targetGroupId }),
    }),
  shuffleGroups: (id: number | string) =>
    request<TournamentDetail>(`/api/tournaments/${id}/groups/shuffle`, {
      method: "POST",
    }),
  addGroup: (id: number | string, name?: string) =>
    request<TournamentDetail>(`/api/tournaments/${id}/groups`, {
      method: "POST",
      body: JSON.stringify({ name: name || null }),
    }),
  addTeam: (id: number | string, name: string, groupId?: number | null) =>
    request<TournamentDetail>(`/api/tournaments/${id}/teams`, {
      method: "POST",
      body: JSON.stringify({ name, groupId: groupId ?? null }),
    }),
  getCalendar: () => request<CalendarDay[]>("/api/calendar"),
  rescheduleCalendar: (startDate?: string | null) =>
    request<CalendarDay[]>("/api/calendar/reschedule", {
      method: "POST",
      body: JSON.stringify({ startDate: startDate || null }),
    }),
};

export function formatWhen(iso?: string | null) {
  if (!iso) return "TBD";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function progressLabel(done: number, total: number) {
  if (total === 0) return "No matches";
  return `${done}/${total} group matches`;
}
