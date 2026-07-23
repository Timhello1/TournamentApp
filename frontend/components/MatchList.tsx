import Link from "next/link";
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
  if (matches.length === 0) {
    return <p className="muted">No matches yet.</p>;
  }

  return (
    <ul className={styles.list}>
      {matches.map((m) => (
        <li key={m.id} className={styles.row}>
          <div className={styles.meta}>
            <span className={`badge ${m.status === "Completed" ? "badge--done" : "badge--live"}`}>
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
  );
}
