"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, progressLabel, type TournamentSummary } from "@/lib/api";
import styles from "./tournaments.module.css";

export default function TournamentsPage() {
  const [items, setItems] = useState<TournamentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.listTournaments());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function seedDemo() {
    setSeeding(true);
    setError(null);
    try {
      await api.seed();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className={styles.head}>
          <div>
            <h1 className="page-title">Tournaments</h1>
            <p className="page-lead">Every arena on the board — groups, results, and knockout paths.</p>
          </div>
          <div className={styles.actions}>
            <button className="btn btn--ghost" onClick={seedDemo} disabled={seeding}>
              {seeding ? "Seeding…" : "Load demo"}
            </button>
            <Link href="/tournaments/new" className="btn btn--primary">
              Create
            </Link>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {loading && <p className="muted">Loading…</p>}

        {!loading && items.length === 0 && (
          <div className="panel">
            <p className="muted">No tournaments yet. Create one or load the Arena Cup demo.</p>
          </div>
        )}

        <ul className={styles.list}>
          {items.map((t) => {
            const pct =
              t.totalGroupMatches === 0
                ? 0
                : Math.round((t.completedGroupMatches / t.totalGroupMatches) * 100);
            return (
              <li key={t.id}>
                <Link href={`/tournaments/${t.id}`} className={styles.item}>
                  <div>
                    <h2>{t.name}</h2>
                    <p className="muted">
                      {t.teamCount} teams · {t.groupCount} groups ·{" "}
                      {progressLabel(t.completedGroupMatches, t.totalGroupMatches)}
                      {t.knockoutGenerated ? " · Bracket live" : ""}
                    </p>
                  </div>
                  <div className={styles.progress}>
                    <div className={styles.bar}>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <span className="dim">{pct}%</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
