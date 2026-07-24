"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageSkeleton } from "@/components/Skeleton";
import { api, type CalendarDay, type CalendarMatch } from "@/lib/api";
import styles from "./calendar.module.css";

function monthMatrix(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const startPad = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function focusMonthFromDays(days: CalendarDay[], fallback: Date) {
  const first = days[0]?.date;
  if (!first) {
    return { year: fallback.getUTCFullYear(), month: fallback.getUTCMonth() };
  }
  const [y, m] = first.split("-").map(Number);
  return { year: y, month: m - 1 };
}

function MatchCard({ match }: { match: CalendarMatch }) {
  const played = match.status === "Completed";
  const score =
    played && match.homeScore != null && match.awayScore != null
      ? `${match.homeScore} – ${match.awayScore}`
      : null;

  return (
    <Link
      href={`/tournaments/${match.tournamentId}/matches/${match.matchId}`}
      className={`${styles.match} ${played ? styles.matchPlayed : ""}`}
    >
      <em>{match.tournamentName}</em>
      <span>
        {match.homeTeamName || "TBD"} vs {match.awayTeamName || "TBD"}
      </span>
      {score ? (
        <span className={styles.score}>{score}</span>
      ) : (
        <span className={styles.pending}>Scheduled</span>
      )}
      {match.groupName && <span className={styles.meta}>{match.groupName}</span>}
    </Link>
  );
}

export default function CalendarPage() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [startDate, setStartDate] = useState(() => now.toISOString().slice(0, 10));
  const [autoFocusMonth, setAutoFocusMonth] = useState(true);

  const jumpToFirstScheduled = useCallback(
    (next: CalendarDay[]) => {
      if (next.length === 0) return;
      const focused = focusMonthFromDays(next, now);
      setYear(focused.year);
      setMonth(focused.month);
    },
    [now]
  );

  const fetchCalendar = useCallback(async () => {
    return api.getCalendar();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchCalendar();
        if (cancelled) return;
        setDays(next);
        if (autoFocusMonth) {
          jumpToFirstScheduled(next);
          setAutoFocusMonth(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load calendar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // intentionally only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep calendar fresh: poll + refresh when tab becomes visible again
  useEffect(() => {
    const tick = async () => {
      try {
        const next = await fetchCalendar();
        setDays(next);
      } catch {
        /* keep existing view on background refresh errors */
      }
    };
    const id = window.setInterval(() => void tick(), 8000);
    const onFocus = () => void tick();
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchCalendar]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarMatch[]>();
    for (const d of days) map.set(d.date, d.matches);
    return map;
  }, [days]);

  const cells = useMemo(() => monthMatrix(year, month), [year, month]);
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const scheduledCount = useMemo(
    () => days.reduce((n, d) => n + d.matches.length, 0),
    [days]
  );
  const playedCount = useMemo(
    () =>
      days.reduce(
        (n, d) => n + d.matches.filter((m) => m.status === "Completed").length,
        0
      ),
    [days]
  );

  function prevMonth() {
    setAutoFocusMonth(false);
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  }

  function nextMonth() {
    setAutoFocusMonth(false);
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  }

  async function onReschedule(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.rescheduleCalendar(startDate);
      setAutoFocusMonth(false);
      setDays(result);
      jumpToFirstScheduled(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reschedule failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageSkeleton rows={6} />;

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Match calendar</h1>
        <p className="page-lead">
          Your saved queue loads automatically. One match per day, rotating tournaments.
          Played fixtures show their final score.
        </p>

        <div className={styles.stats}>
          <span>
            <strong>{scheduledCount}</strong> scheduled
          </span>
          <span>
            <strong>{playedCount}</strong> played
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              void (async () => {
                try {
                  setDays(await fetchCalendar());
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to load calendar");
                }
              })();
            }}
          >
            Refresh
          </button>
        </div>

        <form className={`panel ${styles.reschedule}`} onSubmit={onReschedule}>
          <div className="field">
            <label htmlFor="start">Queue start date</label>
            <input
              id="start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? "Rescheduling…" : "Reschedule all matches"}
          </button>
          <p className={`dim ${styles.hint}`}>
            Reschedule only when you want to rebuild the queue (e.g. after adding tournaments).
          </p>
        </form>

        {error && <p className="error">{error}</p>}

        <div className={styles.monthBar}>
          <button type="button" className="btn btn--ghost" onClick={prevMonth}>
            ←
          </button>
          <h2>{monthLabel}</h2>
          <button type="button" className="btn btn--ghost" onClick={nextMonth}>
            →
          </button>
        </div>

        <div className={styles.weekdays}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className={styles.grid}>
          {cells.map((day, i) => {
            if (day == null) return <div key={`e-${i}`} className={styles.cellEmpty} />;
            const key = isoDate(year, month, day);
            const dayMatches = byDate.get(key) || [];
            const hasPlayed = dayMatches.some((m) => m.status === "Completed");
            return (
              <div
                key={key}
                className={`${styles.cell} ${
                  dayMatches.length ? (hasPlayed ? styles.cellPlayed : styles.cellLive) : ""
                }`}
              >
                <span className={styles.dayNum}>{day}</span>
                {dayMatches.map((match) => (
                  <MatchCard key={match.matchId} match={match} />
                ))}
              </div>
            );
          })}
        </div>

        <section className={`panel ${styles.queue}`}>
          <h2>Full schedule</h2>
          {listEmpty(days) ? (
            <p className="muted">
              No scheduled matches yet. Set a start date and hit reschedule once to build the
              queue — it will stay saved and show up every time you open this page.
            </p>
          ) : (
            <ol className={styles.queueList}>
              {days.map((d) =>
                d.matches.map((m) => {
                  const played = m.status === "Completed";
                  return (
                    <li key={`${d.date}-${m.matchId}`} className={played ? styles.queuePlayed : ""}>
                      <time>{d.date}</time>
                      <Link href={`/tournaments/${m.tournamentId}/matches/${m.matchId}`}>
                        <strong>{m.tournamentName}</strong>
                        <span>
                          {m.homeTeamName || "TBD"} vs {m.awayTeamName || "TBD"}
                          {played && m.homeScore != null && m.awayScore != null
                            ? ` · ${m.homeScore}–${m.awayScore}`
                            : ""}
                        </span>
                        <span className="dim">
                          {played ? "Played" : "Upcoming"}
                          {m.groupName ? ` · ${m.groupName}` : ""}
                          {m.label ? ` · ${m.label}` : ` · ${m.stage}`}
                        </span>
                      </Link>
                    </li>
                  );
                })
              )}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function listEmpty(days: CalendarDay[]) {
  return days.length === 0 || days.every((d) => d.matches.length === 0);
}