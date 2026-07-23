import type { GroupStandings } from "@/lib/api";
import styles from "./StandingsTable.module.css";

export function StandingsTables({
  groups,
  advancePerGroup,
}: {
  groups: GroupStandings[];
  advancePerGroup: number;
}) {
  return (
    <div className={styles.wrap}>
      {groups.map((g) => (
        <section key={g.groupId} className={`panel animate-rise ${styles.block}`}>
          <h2 className={styles.title}>{g.groupName}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GF</th>
                  <th>GA</th>
                  <th>GD</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {g.standings.map((row) => (
                  <tr
                    key={row.teamId}
                    className={row.rank <= advancePerGroup ? "advance" : undefined}
                  >
                    <td>{row.rank}</td>
                    <td>{row.teamName}</td>
                    <td>{row.played}</td>
                    <td>{row.won}</td>
                    <td>{row.drawn}</td>
                    <td>{row.lost}</td>
                    <td>{row.goalsFor}</td>
                    <td>{row.goalsAgainst}</td>
                    <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                    <td>
                      <strong>{row.points}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={`dim ${styles.hint}`}>
            Highlighted rows advance (top {advancePerGroup})
          </p>
        </section>
      ))}
    </div>
  );
}
