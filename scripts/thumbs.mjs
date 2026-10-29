#!/usr/bin/env node
// (Re)generates thumbnails + width/height for entries that are missing them.
//   npm run thumbs            # only missing
//   npm run thumbs -- --all   # regenerate everything
import fs from "fs";
import path from "path";
import { SCREENS_DIR, THUMBS_DIR, makeThumb, readList, writeList } from "../lib/ingest.mjs";

const all = process.argv.includes("--all");
const list = readList();
const done = new Map();
let n = 0;
for (const s of list) {
  if (!all && s.thumb && s.width && fs.existsSync(path.join(THUMBS_DIR, s.thumb))) continue;
  const src = path.join(SCREENS_DIR, s.file);
  if (!fs.existsSync(src)) { console.error(`! missing ${s.file}`); continue; }
  const key = s.file;
  const t = done.get(key) || (await makeThumb(fs.readFileSync(src), s.id));
  done.set(key, t);
  Object.assign(s, t);
  n++;
}
writeList(list);
console.log(`Generated ${n} thumbnail(s).`);
