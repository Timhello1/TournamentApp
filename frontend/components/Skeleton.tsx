import styles from "./Skeleton.module.css";

export function Skeleton({
  height = "1rem",
  width = "100%",
  className = "",
}: {
  height?: string;
  width?: string;
  className?: string;
}) {
  return (
    <span
      className={`${styles.bone} ${className}`}
      style={{ height, width }}
      aria-hidden
    />
  );
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className={`page container ${styles.stack}`} aria-busy aria-label="Loading">
      <Skeleton height="2.8rem" width="min(20rem, 70%)" />
      <Skeleton height="1rem" width="min(36rem, 90%)" />
      <div className={styles.block}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} height="3.5rem" />
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.grid} aria-busy aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height="12rem" />
      ))}
    </div>
  );
}