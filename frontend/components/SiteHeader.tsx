import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand">
          TOURNAMENT <span>HUB</span>
        </Link>
        <nav className="nav-links">
          <Link href="/tournaments">Tournaments</Link>
          <Link href="/calendar">Calendar</Link>
          <Link href="/tournaments/new" className="btn btn--primary">
            New tournament
          </Link>
        </nav>
      </div>
    </header>
  );
}