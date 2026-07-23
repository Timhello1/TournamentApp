import Link from "next/link";
import type { Bracket } from "@/lib/api";
import styles from "./BracketView.module.css";

export function BracketView({
  bracket,
  tournamentId,
}: {
  bracket: Bracket;
  tournamentId: number | string;
}) {
  if (!bracket.generated || bracket.rounds.length === 0) {
    return (
      <div className="panel">
        <h2 className={styles.emptyTitle}>Bracket locked</h2>
        <p className="muted">
          Finish every group-stage match to unlock the single-elimination knockout bracket.
          Top finishers advance automatically.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.scroller}>
      <div className={styles.rounds}>
        {bracket.rounds.map((round, ri) => (
          <div key={round.round} className={styles.round} style={{ animationDelay: `${ri * 80}ms` }}>
            <h3 className={styles.roundLabel}>{round.label}</h3>
            <div className={styles.matches}>
              {round.matches.map((m) => (
                <Link
                  key={m.id}
                  href={`/tournaments/${tournamentId}/matches/${m.id}`}
                  className={styles.match}
                >
                  <div className={styles.slot}>
                    <span>{m.homeTeamName || "TBD"}</span>
                    <em>{m.status === "Completed" ? m.homeScore : ""}</em>
                  </div>
                  <div className={styles.connector} aria-hidden />
                  <div className={styles.slot}>
                    <span>{m.awayTeamName || (m.status === "Bye" ? "BYE" : "TBD")}</span>
                    <em>{m.status === "Completed" ? m.awayScore : ""}</em>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
