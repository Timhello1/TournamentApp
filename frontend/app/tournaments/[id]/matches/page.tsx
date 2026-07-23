"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MatchList } from "@/components/MatchList";
import { TournamentNav } from "@/components/TournamentNav";
import { api, type Match, type TournamentDetail } from "@/lib/api";

export default function MatchesPage() {
  const params = useParams();
  const id = String(params.id);
  const [t, setT] = useState<TournamentDetail | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<"All" | "Group" | "Knockout">("All");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getTournament(id), api.getMatches(id)])
      .then(([tournament, list]) => {
        setT(tournament);
        setMatches(list);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  const visible = useMemo(() => {
    if (filter === "All") return matches;
    return matches.filter((m) => m.stage === filter);
  }, [matches, filter]);

  if (error) {
    return (
      <div className="page container">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!t) {
    return (
      <div className="page container">
        <p className="muted">Loading matches…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">{t.name}</h1>
        <p className="page-lead">Schedule fixtures and enter scores. Standings update instantly.</p>
        <TournamentNav id={t.id} active="matches" />

        <div className="subnav" style={{ marginTop: 0 }}>
          {(["All", "Group", "Knockout"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className="btn btn--ghost"
              data-active={filter === f}
              onClick={() => setFilter(f)}
              style={
                filter === f
                  ? {
                      borderColor: "var(--color-brand)",
                      color: "var(--color-brand-hot)",
                      background: "var(--color-accent-glow)",
                    }
                  : undefined
              }
            >
              {f}
            </button>
          ))}
        </div>

        <MatchList matches={visible} tournamentId={t.id} />
      </div>
    </div>
  );
}
