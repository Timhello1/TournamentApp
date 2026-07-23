import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.inner}`}>
        <p className={`${styles.kicker} animate-rise`}>TOURNAMENT HUB</p>
        <h1 className={`${styles.title} animate-rise`}>
          Arena nights.
          <br />
          Clean brackets.
        </h1>
        <p className={`${styles.lead} animate-rise-delay`}>
          Spin up group stages, track standings, and unlock knockout drama — sports-agnostic
          hosting built for zero-friction demos.
        </p>
        <div className={`${styles.actions} animate-rise-delay`}>
          <Link href="/tournaments/new" className="btn btn--primary">
            Host a tournament
          </Link>
          <Link href="/tournaments" className="btn btn--ghost">
            Browse events
          </Link>
        </div>
      </div>
      <div className={styles.field} aria-hidden>
        <div className={styles.stripe} />
        <div className={styles.glow} />
      </div>
    </section>
  );
}
