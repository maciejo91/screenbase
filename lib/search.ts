import Fuse from "fuse.js";
import type { Screen } from "./types";

/** Words that, when typed on their own, mean "show me this screen type". */
const TYPE_ALIASES: Record<string, string[]> = {
  dashboard: ["dashboard", "dashboards", "overview"],
  "list/table": ["list", "lists", "table", "tables", "list/table"],
  "detail/record": ["detail", "details", "record", "records", "detail/record"],
  "pipeline/kanban": ["pipeline", "pipelines", "kanban", "board", "pipeline/kanban"],
  onboarding: ["onboarding"],
  pricing: ["pricing", "plans"],
  settings: ["settings", "setting", "preferences"],
  login: ["login", "log in", "sign in", "signin", "auth"],
  "empty state": ["empty", "empty state", "empty states"],
  modal: ["modal", "modals", "dialog"],
};

export function detectType(query: string, types: string[]): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const t of types) {
    if (t.toLowerCase() === q) return t;
    if (TYPE_ALIASES[t]?.includes(q)) return t;
  }
  return null;
}

export function makeFuse(screens: Screen[]) {
  return new Fuse(screens, {
    keys: [
      { name: "app", weight: 2 },
      { name: "screenType", weight: 2 },
      { name: "tags", weight: 1.5 },
      { name: "category", weight: 1 },
      { name: "description", weight: 0.8 },
    ],
    threshold: 0.34,
    ignoreLocation: true,
    useExtendedSearch: true,
    minMatchCharLength: 2,
  });
}

export type SearchResult = { items: Screen[]; detectedType: string | null; detectedApp: string | null };

/**
 * Query understanding:
 *  1. If the query contains an app name ("HubSpot pipeline"), scope to that app.
 *  2. If what's left is a screen type word ("dashboard"), show exactly that type.
 *  3. Otherwise fuzzy-match every remaining word (AND) across app, type, tags, description.
 * Results keep the library's own order (newest / flow order).
 */
export function runSearch(
  screens: Screen[],
  fuse: Fuse<Screen>,
  query: string,
  apps: string[],
  types: string[],
  typeOnly: boolean
): SearchResult {
  let rest = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!rest) return { items: screens, detectedType: null, detectedApp: null };

  let detectedApp: string | null = null;
  for (const a of [...apps].sort((x, y) => y.length - x.length)) {
    const al = a.toLowerCase();
    const re = new RegExp(`(^|\\s)${al.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
    if (re.test(rest)) {
      detectedApp = a;
      rest = rest.replace(re, " ").trim();
      break;
    }
  }
  const base = detectedApp ? screens.filter((s) => s.app === detectedApp) : screens;
  if (!rest) return { items: base, detectedType: null, detectedApp };

  const detectedType = typeOnly ? detectType(rest, types) : null;
  if (detectedType) return { items: base.filter((s) => s.screenType === detectedType), detectedType, detectedApp };

  const tokens = rest.split(" ").filter((t) => t.length >= 2);
  if (!tokens.length) return { items: base, detectedType: null, detectedApp };
  const hits = new Set(fuse.search(tokens.join(" ")).map((r) => r.item.id));
  return { items: base.filter((s) => hits.has(s.id)), detectedType: null, detectedApp };
}
