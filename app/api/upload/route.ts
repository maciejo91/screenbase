import { NextResponse } from "next/server";
import { ingest } from "@/lib/ingest.mjs";
import { mutateScreens } from "@/lib/store";
import type { Screen } from "@/lib/types";

export const runtime = "nodejs";

/**
 * multipart/form-data:
 *   files:  File[]            images
 *   paths:  string[]          optional relative path per file (from a dropped folder), e.g. "HubSpot/deals.png"
 *   app, type, category, source, tags (comma separated) — optional defaults
 * If `app` is empty, a file inside a dropped folder takes the folder name as app.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => typeof f !== "string");
  const paths = form.getAll("paths").map(String);
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const app = get("app");
  const tags = get("tags").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });

  const base = Date.now();
  const errors: string[] = [];
  const result = await mutateScreens(async (list) => {
    const ids = new Set(list.map((s) => s.id));
    const added: Screen[] = [];
    let skipped = 0;
    // keep folder / name order so the app view shows flows in sequence
    const order = files.map((f, i) => ({ f, rel: paths[i] || f.name })).sort((a, b) => a.rel.localeCompare(b.rel, undefined, { numeric: true }));
    for (const [i, { f, rel }] of order.entries()) {
      const parts = rel.split("/").filter(Boolean);
      try {
        const entry = (await ingest(Buffer.from(await f.arrayBuffer()), f.name, {
          app: app || (parts.length > 1 ? parts[0] : "Untitled"),
          type: get("type") || undefined,
          category: get("category") || undefined,
          source: get("source") || undefined,
          tags,
          addedAt: new Date(base + i).toISOString(),
        }, ids)) as Screen | null;
        if (!entry) { skipped++; continue; }
        ids.add(entry.id);
        list.push(entry);
        added.push(entry);
      } catch (e) {
        errors.push(`${rel}: ${(e as Error).message}`);
      }
    }
    return { added, skipped };
  });
  return NextResponse.json({ ...result, errors });
}
