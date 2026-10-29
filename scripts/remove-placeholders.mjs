#!/usr/bin/env node
// Removes all entries with source "placeholder" and their image + thumbnail files.
import fs from "fs";
import path from "path";
import { SCREENS_DIR, THUMBS_DIR, readList, writeList } from "../lib/ingest.mjs";

const list = readList();
const ph = list.filter((x) => x.source === "placeholder");
for (const s of ph) {
  for (const f of [path.join(SCREENS_DIR, s.file), s.thumb && path.join(THUMBS_DIR, s.thumb)]) {
    try { if (f) fs.unlinkSync(f); } catch {}
  }
}
writeList(list.filter((x) => x.source !== "placeholder"));
console.log(`Removed ${ph.length} placeholder screens.`);
