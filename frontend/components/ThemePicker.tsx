"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  THEMES,
  applyTheme,
  readStoredTheme,
  type ThemeId,
} from "@/lib/theme";
import styles from "./ThemePicker.module.css";

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("meadow");
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function select(id: ThemeId) {
    setTheme(id);
    applyTheme(id);
    setOpen(false);
  }

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        title="Change style"
      >
        <span className={styles.dots} aria-hidden>
          {current.swatches.map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
        </span>
        <span className={styles.triggerLabel}>Style</span>
      </button>

      {open && (
        <div className={styles.panel} id={panelId} role="listbox" aria-label="App styles">
          <p className={styles.panelTitle}>Pick a look</p>
          <ul className={styles.list}>
            {THEMES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={t.id === theme}
                  className={`${styles.option} ${t.id === theme ? styles.optionActive : ""}`}
                  onClick={() => select(t.id)}
                >
                  <span className={styles.swatches} aria-hidden>
                    {t.swatches.map((c) => (
                      <i key={c} style={{ background: c }} />
                    ))}
                  </span>
                  <span className={styles.copy}>
                    <strong>{t.name}</strong>
                    <em>{t.blurb}</em>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}