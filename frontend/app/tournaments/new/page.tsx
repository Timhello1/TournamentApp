"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import styles from "./new.module.css";

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamsText, setTeamsText] = useState(
    "North Forge\nRiver Kings\nCoastal Blaze\nSummit FC\nIron District\nHarbor United\nPrairie Storm\nMetro Atlas"
  );
  const [pointsWin, setPointsWin] = useState(3);
  const [pointsDraw, setPointsDraw] = useState(1);
  const [pointsLoss, setPointsLoss] = useState(0);
  const [advancePerGroup, setAdvancePerGroup] = useState(2);
  const [targetGroupSize, setTargetGroupSize] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const teamNames = teamsText
      .split(/\r?\n|,/)
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const created = await api.createTournament({
        name,
        description: description || undefined,
        teamNames,
        pointsWin,
        pointsDraw,
        pointsLoss,
        advancePerGroup,
        targetGroupSize,
      });
      router.push(`/tournaments/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">New tournament</h1>
        <p className="page-lead">
          Name the event, list your teams, and we&apos;ll build groups plus round-robin fixtures.
        </p>

        <form className={`panel stack ${styles.form}`} onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="name">Tournament name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Friday Night Cup"
            />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes for players and spectators"
            />
          </div>

          <div className="field">
            <label htmlFor="teams">Teams (one per line)</label>
            <textarea
              id="teams"
              rows={10}
              value={teamsText}
              onChange={(e) => setTeamsText(e.target.value)}
              required
            />
          </div>

          <div className={`grid-2 ${styles.scoring}`}>
            <div className="field">
              <label htmlFor="win">Points win</label>
              <input
                id="win"
                type="number"
                value={pointsWin}
                onChange={(e) => setPointsWin(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="draw">Points draw</label>
              <input
                id="draw"
                type="number"
                value={pointsDraw}
                onChange={(e) => setPointsDraw(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="loss">Points loss</label>
              <input
                id="loss"
                type="number"
                value={pointsLoss}
                onChange={(e) => setPointsLoss(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="advance">Advance per group</label>
              <input
                id="advance"
                type="number"
                min={1}
                max={8}
                value={advancePerGroup}
                onChange={(e) => setAdvancePerGroup(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="gsize">Target group size</label>
              <input
                id="gsize"
                type="number"
                min={2}
                max={8}
                value={targetGroupSize}
                onChange={(e) => setTargetGroupSize(Number(e.target.value))}
              />
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <button className="btn btn--primary" type="submit" disabled={saving}>
            {saving ? "Building groups…" : "Create tournament"}
          </button>
        </form>
      </div>
    </div>
  );
}
