export type Screen = {
  id: string;
  /** Full-size image, file name inside /public/screens */
  file: string;
  /** 640×400 webp thumbnail inside /public/thumbs (generated on import) */
  thumb?: string;
  /** Original image size in px (used for aspect ratio, no layout shift) */
  width?: number;
  height?: number;
  /** Product name, e.g. "HubSpot" */
  app: string;
  /** Product category, e.g. "CRM" */
  category: string;
  /** dashboard, onboarding, pricing, settings, list/table, detail/record, pipeline/kanban, login, empty state, modal, ... */
  screenType: string;
  /** Patterns / features, e.g. ["filters", "bulk actions"] */
  tags: string[];
  description: string;
  /** URL, "own", or "placeholder" */
  source: string;
  /** ISO date string */
  addedAt: string;
};

export const SCREEN_TYPES = [
  "dashboard",
  "list/table",
  "detail/record",
  "pipeline/kanban",
  "onboarding",
  "pricing",
  "settings",
  "login",
  "empty state",
  "error",
  "modal",
  "search",
  "reports",
  "inbox",
  "calendar",
  "other",
];

export const thumbUrl = (s: Screen) => (s.thumb ? `/thumbs/${s.thumb}` : `/screens/${s.file}`);
export const fullUrl = (s: Screen) => `/screens/${s.file}`;
export const appHref = (app: string) => `/apps/${encodeURIComponent(app)}`;
