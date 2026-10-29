import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { mutateScreens } from "@/lib/store";
import type { Screen } from "@/lib/types";

const EDITABLE = ["app", "category", "screenType", "tags", "description", "source"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Partial<Screen>;
  const updated = await mutateScreens((list) => {
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const next: Screen = { ...list[idx] };
    for (const key of EDITABLE) {
      if (!(key in body)) continue;
      if (key === "tags") {
        const tags = Array.isArray(body.tags) ? body.tags : [];
        next.tags = Array.from(new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)));
      } else {
        (next as Record<string, unknown>)[key] = String(body[key] ?? "").trim();
      }
    }
    list[idx] = next;
    return next;
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const removed = await mutateScreens((list) => {
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const [s] = list.splice(idx, 1);
    return { s, fileShared: list.some((x) => x.file === s.file), thumbShared: list.some((x) => x.thumb === s.thumb) };
  });
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pub = path.join(process.cwd(), "public");
  if (!removed.fileShared) await fs.rm(path.join(pub, "screens", removed.s.file), { force: true });
  if (removed.s.thumb && !removed.thumbShared) await fs.rm(path.join(pub, "thumbs", removed.s.thumb), { force: true });
  return NextResponse.json({ ok: true });
}
