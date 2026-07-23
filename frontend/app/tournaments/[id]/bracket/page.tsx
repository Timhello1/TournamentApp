"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/Skeleton";
import { BracketView } from "@/components/BracketView";
import { TournamentNav } from "@/components/TournamentNav";
import { api, type Bracket, type TournamentDetail } from "@/lib/api";

export default function BracketPage() {
  const params = useParams();
  const id = String(params.id);
  const [t, setT] = useState<TournamentDetail | null>(null);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getTournament(id), api.getBracket(id)])
      .then(([tournament, b]) => {
        setT(tournament);
        setBracket(b);
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

  if (!t || !bracket) {
    return <PageSkeleton rows={3} />;
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">{t.name}</h1>
        <p className="page-lead">Single-elimination path from group qualifiers to the final.</p>
        <TournamentNav id={t.id} active="bracket" />
        <BracketView bracket={bracket} tournamentId={t.id} />
      </div>
    </div>
  );
}
