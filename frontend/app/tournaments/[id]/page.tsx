"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TournamentNav } from "@/components/TournamentNav";
import { api, progressLabel, type TournamentDetail } from "@/lib/api";
import styles from "./detail.module.css";

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [t, setT] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .getTournament(id)
      .then(setT)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  async function onDelete() {
    if (!confirm("Delete this tournament?")) return;
    setDeleting(true);
    try {
      await api.deleteTournament(id);
      router.push("/tournaments");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  if (error && !t) {
    return (
      <div className="page container">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!t) {
    return (
      <div className="page container">
        <p className="muted">Loading tournament…</p>
      </div>
    );
  }

  const pct =
    t.totalGroupMatches === 0
      ? 0
      : Math.round((t.completedGroupMatches / t.totalGroupMatches) * 100);

  return (
    <div className="page">
      <div className="container">
        <p className={`dim ${styles.eyebrow}`}>EVENT #{t.id}</p>
        <h1 className="page-title">{t.name}</h1>
        {t.description && <p className="page-lead">{t.description}</p>}

        <TournamentNav id={t.id} active="overview" />

        <div className={`grid-2 ${styles.stats}`}>
          <div className="panel">
            <h2 className={styles.statLabel}>Group stage</h2>
            <p className={styles.statValue}>{pct}%</p>
            <p className="muted">{progressLabel(t.completedGroupMatches, t.totalGroupMatches)}</p>
          </div>
          <div className="panel">
            <h2 className={styles.statLabel}>Knockout</h2>
            <p className={styles.statValue}>{t.knockoutGenerated ? "Live" : "Locked"}</p>
            <p className="muted">
              Top {t.advancePerGroup} per group · scoring {t.pointsWin}/{t.pointsDraw}/{t.pointsLoss}
            </p>
          </div>
        </div>

        <section className={`panel ${styles.groups}`}>
          <h2>Groups</h2>
          <div className={styles.groupGrid}>
            {t.groups.map((g) => (
              <div key={g.id}>
                <h3>{g.name}</h3>
                <ul>
                  {g.teams.map((team) => (
                    <li key={team.id}>{team.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.cta}>
          <Link href={`/tournaments/${t.id}/matches`} className="btn btn--primary">
            Enter results
          </Link>
          <Link href={`/tournaments/${t.id}/bracket`} className="btn btn--ghost">
            View bracket
          </Link>
          <button className="btn btn--danger" onClick={onDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
