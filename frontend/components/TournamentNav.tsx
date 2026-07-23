import Link from "next/link";

const links = [
  { href: "", label: "Overview" },
  { href: "/groups", label: "Groups" },
  { href: "/matches", label: "Matches" },
  { href: "/bracket", label: "Bracket" },
] as const;

export function TournamentNav({
  id,
  active,
}: {
  id: number | string;
  active: "overview" | "groups" | "matches" | "bracket";
}) {
  return (
    <nav className="subnav">
      {links.map((l) => {
        const key = l.href === "" ? "overview" : l.href.slice(1);
        return (
          <Link
            key={l.label}
            href={`/tournaments/${id}${l.href}`}
            data-active={active === key}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
