"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, formatWhen, type Match } from "@/lib/api";
import styles from "./match.module.css";

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = String(params.id);
  const matchId = String(params.matchId);
  const [match, setMatch] = useState<Match | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getMatch(matchId)
      .then((m) => {
        setMatch(m);
        setHomeScore(m.homeScore ?? 0);
        setAwayScore(m.awayScore ?? 0);
        if (m.scheduledAt) {
          const d = new Date(m.scheduledAt);
          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setScheduledAt(local);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [matchId]);

  async function saveSchedule(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const iso = scheduledAt ? new Date(scheduledAt).toISOString() : null;
      const updated = await api.scheduleMatch(matchId, iso);
      setMatch(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schedule failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveResult(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await api.setResult(matchId, homeScore, awayScore);
      setMatch(updated);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Result failed");
    } finally {
      setSaving(false);
    }
  }

  if (error && !match) {
    return (
      <div className="page container">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="page container">
        <p className="muted">Loading match…</p>
      </div>
    );
  }

  const canEdit = match.status !== "Bye";

  return (
    <div className="page">
      <div className="container">
        <Link href={`/tournaments/${tournamentId}/matches`} className="dim">
          ← Back to matches
        </Link>
        <h1 className={`page-title ${styles.title}`}>
          {match.homeTeamName || "TBD"} <span>vs</span> {match.awayTeamName || "TBD"}
        </h1>
        <p className="page-lead">
          {match.groupName || match.label || match.stage} · {match.status} ·{" "}
          {formatWhen(match.scheduledAt)}
        </p>

        {match.status === "Bye" && (
          <div className="panel">
            <p className="muted">This slot is a bye — the assigned team advances automatically.</p>
          </div>
        )}

        {canEdit && (
          <div className={`grid-2 ${styles.forms}`}>
            <form className="panel stack" onSubmit={saveSchedule}>
              <h2>Schedule</h2>
              <div className="field">
                <label htmlFor="when">Kickoff</label>
                <input
                  id="when"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <button className="btn btn--ghost" type="submit" disabled={saving}>
                Save schedule
              </button>
            </form>

            <form className="panel stack" onSubmit={saveResult}>
              <h2>Result</h2>
              <div className={styles.scores}>
                <div className="field">
                  <label htmlFor="home">{match.homeTeamName || "Home"}</label>
                  <input
                    id="home"
                    type="number"
                    min={0}
                    value={homeScore}
                    onChange={(e) => setHomeScore(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="away">{match.awayTeamName || "Away"}</label>
                  <input
                    id="away"
                    type="number"
                    min={0}
                    value={awayScore}
                    onChange={(e) => setAwayScore(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
              {match.stage === "Knockout" && (
                <p className="dim">Knockout matches cannot draw — enter a decisive score.</p>
              )}
              <button className="btn btn--primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save result"}
              </button>
            </form>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
