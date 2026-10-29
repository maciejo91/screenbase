#!/usr/bin/env node
/**
 * Import screenshots into the library.
 *
 *   npm run import -- <folder> [--app "HubSpot"] [--type dashboard] [--category CRM] [--source <url|own>] [--tags "filters,charts"]
 *
 * - Recursively scans <folder> for images (png, jpg, jpeg, webp, gif, avif, svg).
 * - App name: --app, else the image's top-level sub-folder
 *   (screens/HubSpot/deals.png -> "HubSpot"), else "Untitled".
 * - Screen type: --type, else guessed from the file name ("pipedrive-pricing.png" -> "pricing"), else "untagged".
 * - Generates a 640×400 webp thumbnail per image in public/thumbs.
 * - Files are added in alphabetical order, which is the order the app view shows them
 *   (name flows 01-login.png, 02-onboarding.png, … to keep them in sequence).
 * - Duplicate images (same content hash) are skipped, so re-running is safe.
 */
import fs from "fs";
import path from "path";
import { IMAGE_EXT, ingest, readList, writeList } from "../lib/ingest.mjs";

const args = process.argv.slice(2);
const opts = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) opts[args[i].slice(2)] = args[++i];
  else positional.push(args[i]);
}
const src = positional[0];
if (!src || !fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
  console.error('Usage: npm run import -- <folder> [--app "Name"] [--type dashboard] [--category CRM] [--source url|own] [--tags "a,b"]');
  process.exit(1);
}
const srcAbs = path.resolve(src);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (d.name.startsWith(".")) return [];
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    return IMAGE_EXT.has(path.extname(d.name).toLowerCase()) ? [p] : [];
  });
}

const list = readList();
const ids = new Set(list.map((s) => s.id));
const files = walk(srcAbs).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const base = Date.now();
let added = 0, skipped = 0, failed = 0;

for (const [i, file] of files.entries()) {
  const rel = path.relative(srcAbs, file).split(path.sep);
  try {
    const entry = await ingest(fs.readFileSync(file), file, {
      app: opts.app || (rel.length > 1 ? rel[0] : "Untitled"),
      type: opts.type,
      category: opts.category,
      source: opts.source,
      tags: opts.tags ? opts.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
      addedAt: new Date(base + i).toISOString(),
    }, ids);
    if (!entry) { skipped++; continue; }
    list.push(entry);
    ids.add(entry.id);
    added++;
    console.log(`+ ${rel.join("/")}  ->  ${entry.file}  [${entry.app} · ${entry.screenType}]`);
  } catch (e) {
    failed++;
    console.error(`! ${rel.join("/")}: ${e.message}`);
  }
}

writeList(list);
console.log(`\nImported ${added} new screen(s), skipped ${skipped} duplicate(s)${failed ? `, ${failed} failed` : ""}. Library now has ${list.length}.`);
