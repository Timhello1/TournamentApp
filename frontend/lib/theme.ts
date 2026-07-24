export const THEMES = [
  {
    id: "meadow",
    name: "Soft meadow",
    blurb: "Pastel peach sky, purple hills, lime CTAs",
    swatches: ["#ffe4ec", "#7b6bb0", "#9fc12f"],
  },
  {
    id: "chalk",
    name: "Court chalk",
    blurb: "Paper courts, forest green, clay accent",
    swatches: ["#f4f1ea", "#1f6b45", "#c95c3e"],
  },
  {
    id: "scoreboard",
    name: "Night scoreboard",
    blurb: "Navy ink, ice cyan, broadcast energy",
    swatches: ["#071422", "#4de1ff", "#e8f3ff"],
  },
  {
    id: "poster",
    name: "Poster pop",
    blurb: "Cream paper, bold black, electric blue",
    swatches: ["#f6f0e4", "#121212", "#2557ff"],
  },
  {
    id: "clinic",
    name: "Alpine clinic",
    blurb: "Cool gray UI, teal primary, calm SaaS",
    swatches: ["#f3f6f8", "#0f8f8a", "#1b2a33"],
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "meadow";
export const THEME_STORAGE_KEY = "tournament-hub-theme";

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}