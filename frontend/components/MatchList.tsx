import Link from "next/link";
import { useMemo } from "react";
import type { Match } from "@/lib/api";
import { formatWhen } from "@/lib/api";
import styles from "./MatchList.module.css";

export function MatchList({
  matches,
  tournamentId,
}: {
  matches: Match[];
  tournamentId: number | string;
}) {
  const sections = useMemo(() => {
    const groupMatches = matches.filter((m) => m.stage === "Group");
    const knockout = matches.filter((m) => m.stage !== "Group");

    const byRound = new Map<number, Match[]>();
    for (const m of groupMatches) {
      if (!byRound.has(m.round)) byRound.set(m.round, []);
      byRound.get(m.round)!.push(m);
    }

    const rounds = [...byRound.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, list]) => ({
        title: `Matchday ${round}`,
        matches: list.sort(
          (a, b) =>
            (a.groupName || "").localeCompare(b.groupName || "") ||
            a.position - b.position
        ),
      }));

    const result = [...rounds];
    if (knockout.length) {
      result.push({
        title: "Knockout",
        matches: [...knockout].sort(
          (a, b) => a.round - b.round || a.position - b.position
        ),
      });
    }
    return result;
  }, [matches]);

  if (matches.length === 0) {
    return <p className="muted">No matches yet.</p>;
  }

  return (
    <div className={styles.sections}>
      {sections.map((section) => (
        <section key={section.title} className={styles.section}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          <ul className={styles.list}>
            {section.matches.map((m) => (
              <li key={m.id} className={styles.row}>
                <div className={styles.meta}>
                  <span
                    className={`badge ${
                      m.status === "Completed" ? "badge--done" : "badge--live"
                    }`}
                  >
                    {m.status}
                  </span>
                  <span className="dim">
                    {m.groupName || m.label || m.stage} · {formatWhen(m.scheduledAt)}
                  </span>
                </div>
                <div className={styles.teams}>
                  <span>{m.homeTeamName || "TBD"}</span>
                  <strong className={styles.score}>
                    {m.status === "Completed" || m.status === "Bye"
                      ? `${m.homeScore ?? "—"} – ${m.awayScore ?? "—"}`
                      : "vs"}
                  </strong>
                  <span>{m.awayTeamName || "TBD"}</span>
                </div>
                <Link
                  className="btn btn--ghost"
                  href={`/tournaments/${tournamentId}/matches/${m.id}`}
                >
                  {m.status === "Completed" ? "View" : "Enter result"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}