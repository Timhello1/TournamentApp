"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/Skeleton";
import { StandingsTables } from "@/components/StandingsTable";
import { TournamentNav } from "@/components/TournamentNav";
import { api, type GroupStandings, type TournamentDetail } from "@/lib/api";

export default function GroupsPage() {
  const params = useParams();
  const id = String(params.id);
  const [t, setT] = useState<TournamentDetail | null>(null);
  const [groups, setGroups] = useState<GroupStandings[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getTournament(id), api.getStandings(id)])
      .then(([tournament, standings]) => {
        setT(tournament);
        setGroups(standings);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (error) {
    return (
      <div className="page container">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!t) {
    return <PageSkeleton rows={4} />;
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">{t.name}</h1>
        <p className="page-lead">
          Standings sorted by points, then goal difference, then goals for.
        </p>
        <TournamentNav id={t.id} active="groups" />
        <StandingsTables groups={groups} advancePerGroup={t.advancePerGroup} />
      </div>
    </div>
  );
}
