"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { CardGridSkeleton, PageSkeleton } from "@/components/Skeleton";
import { TournamentNav } from "@/components/TournamentNav";
import { api, type TournamentDetail } from "@/lib/api";
import styles from "./manage.module.css";

export default function ManageGroupsPage() {
  const params = useParams();
  const id = String(params.id);
  const [t, setT] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [targetGroupId, setTargetGroupId] = useState<number | "">("");
  const [dragTeamId, setDragTeamId] = useState<number | null>(null);
  const [overGroupId, setOverGroupId] = useState<number | null>(null);

  useEffect(() => {
    api
      .getTournament(id)
      .then((tournament) => {
        setT(tournament);
        setTargetGroupId((cur) =>
          cur === "" && tournament.groups.length ? tournament.groups[0].id : cur
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  async function run(action: () => Promise<TournamentDetail>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      setT(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  function onDragStart(teamId: number) {
    setDragTeamId(teamId);
  }

  async function onDrop(groupId: number) {
    if (dragTeamId == null) return;
    setOverGroupId(null);
    const teamId = dragTeamId;
    setDragTeamId(null);
    await run(() => api.moveTeam(id, teamId, groupId));
  }

  async function onShuffle() {
    await run(() => api.shuffleGroups(id));
  }

  async function onAddGroup(e: FormEvent) {
    e.preventDefault();
    await run(() => api.addGroup(id, groupName || undefined));
    setGroupName("");
  }

  async function onAddTeam(e: FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    const gid = targetGroupId === "" ? undefined : Number(targetGroupId);
    await run(() => api.addTeam(id, teamName.trim(), gid));
    setTeamName("");
  }

  if (!t && !error) {
    return <PageSkeleton rows={3} />;
  }

  if (!t) {
    return (
      <div className="page container">
        <p className="error">{error}</p>
      </div>
    );
  }

  const locked = t.knockoutGenerated || t.completedGroupMatches > 0;

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">{t.name}</h1>
        <p className="page-lead">
          Drag teams between groups, shuffle the draw, or add groups and participants.
          Fixtures rebuild automatically while the group stage is still editable.
        </p>
        <TournamentNav id={t.id} active="manage" />

        {locked && (
          <p className={`panel ${styles.warn}`}>
            Groups are locked after results are entered or the bracket is generated.
          </p>
        )}

        <div className={styles.toolbar}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onShuffle}
            disabled={busy || locked || t.groups.length === 0}
          >
            Shuffle into groups
          </button>
        </div>

        <div className={styles.board}>
          {t.groups.map((g) => (
            <section
              key={g.id}
              className={`${styles.column} ${overGroupId === g.id ? styles.columnOver : ""}`}
              onDragOver={(e: DragEvent) => {
                if (locked) return;
                e.preventDefault();
                setOverGroupId(g.id);
              }}
              onDragLeave={() => setOverGroupId((cur) => (cur === g.id ? null : cur))}
              onDrop={(e: DragEvent) => {
                e.preventDefault();
                if (!locked) void onDrop(g.id);
              }}
            >
              <header className={styles.columnHead}>
                <h2>{g.name}</h2>
                <span className="badge">{g.teams.length}</span>
              </header>
              <ul className={styles.teamList}>
                {g.teams.map((team) => (
                  <li
                    key={team.id}
                    className={styles.team}
                    draggable={!locked && !busy}
                    onDragStart={() => onDragStart(team.id)}
                    onDragEnd={() => {
                      setDragTeamId(null);
                      setOverGroupId(null);
                    }}
                  >
                    {team.name}
                  </li>
                ))}
                {g.teams.length === 0 && (
                  <li className={styles.empty}>Drop a team here</li>
                )}
              </ul>
            </section>
          ))}
        </div>

        <div className={`grid-2 ${styles.forms}`}>
          <form className="panel stack" onSubmit={onAddGroup}>
            <h2>Add group</h2>
            <div className="field">
              <label htmlFor="gname">Name (optional)</label>
              <input
                id="gname"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group E"
                disabled={locked || busy}
              />
            </div>
            <button className="btn btn--ghost" type="submit" disabled={locked || busy}>
              Add group
            </button>
          </form>

          <form className="panel stack" onSubmit={onAddTeam}>
            <h2>Add participant</h2>
            <div className="field">
              <label htmlFor="tname">Team name</label>
              <input
                id="tname"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                disabled={locked || busy}
              />
            </div>
            <div className="field">
              <label htmlFor="gselect">Group</label>
              <select
                id="gselect"
                value={targetGroupId}
                onChange={(e) =>
                  setTargetGroupId(e.target.value ? Number(e.target.value) : "")
                }
                disabled={locked || busy || t.groups.length === 0}
              >
                {t.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn btn--primary"
              type="submit"
              disabled={locked || busy || t.groups.length === 0}
            >
              Add team
            </button>
          </form>
        </div>

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}