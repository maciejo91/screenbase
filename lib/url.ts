export type ViewState = { q: string; type: string[]; app: string[]; tag: string[]; s: string | null };

export function parseView(sp: Record<string, string | string[] | undefined>): ViewState {
  const arr = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]).filter(Boolean);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";
  return { q: one(sp.q), type: arr(sp.type), app: arr(sp.app), tag: arr(sp.tag), s: one(sp.s) || null };
}

export function viewToSearch(v: ViewState) {
  const p = new URLSearchParams();
  if (v.q) p.set("q", v.q);
  v.type.forEach((x) => p.append("type", x));
  v.app.forEach((x) => p.append("app", x));
  v.tag.forEach((x) => p.append("tag", x));
  if (v.s) p.set("s", v.s);
  const str = p.toString();
  return str ? `?${str}` : "";
}
