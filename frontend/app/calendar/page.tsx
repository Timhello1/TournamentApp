"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type CalendarDay } from "@/lib/api";
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

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [startDate, setStartDate] = useState(() => now.toISOString().slice(0, 10));

  async function load() {
    try {
      setDays(await api.getCalendar());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load calendar");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const d of days) map.set(d.date, d);
    return map;
  }, [days]);

  const cells = useMemo(() => monthMatrix(year, month), [year, month]);
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  }

  function nextMonth() {
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
      setDays(result);
      if (result[0]?.date) {
        const [y, m] = result[0].date.split("-").map(Number);
        setYear(y);
        setMonth(m - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reschedule failed");
    } finally {
      setBusy(false);
    }
  }

  const list = days;

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Match calendar</h1>
        <p className="page-lead">
          Visual queue: one match per day, rotating across tournaments (T1, T2, T3… then back to T1).
        </p>

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
            const entry = byDate.get(key);
            const match = entry?.matches[0];
            return (
              <div key={key} className={`${styles.cell} ${match ? styles.cellLive : ""}`}>
                <span className={styles.dayNum}>{day}</span>
                {match && (
                  <Link
                    href={`/tournaments/${match.tournamentId}/matches/${match.matchId}`}
                    className={styles.match}
                  >
                    <em>{match.tournamentName}</em>
                    <span>
                      {match.homeTeamName || "TBD"} vs {match.awayTeamName || "TBD"}
                    </span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <section className={`panel ${styles.queue}`}>
          <h2>Queue</h2>
          {list.length === 0 ? (
            <p className="muted">No scheduled matches yet. Hit reschedule to build the queue.</p>
          ) : (
            <ol className={styles.queueList}>
              {list.map((d) =>
                d.matches.map((m) => (
                  <li key={`${d.date}-${m.matchId}`}>
                    <time>{d.date}</time>
                    <Link href={`/tournaments/${m.tournamentId}/matches/${m.matchId}`}>
                      <strong>{m.tournamentName}</strong>
                      <span>
                        {m.homeTeamName || "TBD"} vs {m.awayTeamName || "TBD"}
                      </span>
                      <span className="dim">{m.stage}{m.groupName ? ` · ${m.groupName}` : ""}</span>
                    </Link>
                  </li>
                ))
              )}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}