// Shared ingest logic used by the CLI (scripts/*.mjs) and the upload API route.
// Plain ESM JavaScript so Node scripts can import it without a TS build step.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

export const ROOT = process.env.SCREENBASE_ROOT || process.cwd();
export const SCREENS_DIR = path.join(ROOT, "public", "screens");
export const THUMBS_DIR = path.join(ROOT, "public", "thumbs");
export const DATA_FILE = path.join(ROOT, "data", "screens.json");

export const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"]);
export const THUMB_W = 1280;
export const THUMB_H = 800; // 16:10 canvas. The screenshot is centered at no more than its real size.

const TYPE_HINTS = [
  ["dashboard", ["dashboard", "overview", "home"]],
  ["pipeline/kanban", ["pipeline", "kanban", "board"]],
  ["list/table", ["list", "table", "index"]],
  ["detail/record", ["detail", "record", "profile"]],
  ["onboarding", ["onboarding", "welcome", "setup"]],
  ["pricing", ["pricing", "plans", "billing"]],
  ["settings", ["settings", "preferences", "account"]],
  ["login", ["login", "signin", "sign-in", "signup", "sign-up", "auth"]],
  ["empty state", ["empty"]],
  ["modal", ["modal", "dialog", "popup"]],
  ["reports", ["report", "analytics"]],
  ["inbox", ["inbox", "email", "conversation"]],
  ["calendar", ["calendar", "meeting", "schedule"]],
];

export function guessType(name) {
  const n = name.toLowerCase();
  for (const [t, keys] of TYPE_HINTS) if (keys.some((k) => n.includes(k))) return t;
  return "untagged";
}

export const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "screen";

export function readList() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

export function writeList(list) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2) + "\n");
  fs.renameSync(tmp, DATA_FILE);
}

/** Creates public/thumbs/<id>.webp and returns { thumb, width, height }. */
export async function makeThumb(buf, id) {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
  const meta = await sharp(buf, { animated: false, limitInputPixels: false }).metadata();
  const thumb = `${id}.webp`;
  const srcW = meta.width || THUMB_W;
  const srcH = meta.height || THUMB_H;
  const scale = Math.min(1, THUMB_W / srcW, THUMB_H / srcH);
  const w = Math.min(THUMB_W, Math.max(1, Math.round(srcW * scale)));
  const h = Math.min(THUMB_H, Math.max(1, Math.round(srcH * scale)));
  const fitted = await sharp(buf, { animated: false, limitInputPixels: false })
    .flatten({ background: "#ffffff" })
    .resize({ width: w, height: h, fit: "fill" })
    .toBuffer();
  await sharp({ create: { width: THUMB_W, height: THUMB_H, channels: 3, background: "#ffffff" } })
    .composite([{ input: fitted, left: Math.floor((THUMB_W - w) / 2), top: Math.floor((THUMB_H - h) / 2) }])
    .webp({ quality: 86, effort: 4 })
    .toFile(path.join(THUMBS_DIR, thumb));
  return { thumb, width: srcW, height: srcH };
}

/**
 * Adds one image to the library (does not write screens.json — caller does).
 * Returns the new entry, or null if the same image (content hash) already exists.
 */
export async function ingest(buf, originalName, opts = {}, existingIds = new Set()) {
  const ext = path.extname(originalName).toLowerCase();
  if (!IMAGE_EXT.has(ext)) throw new Error(`Unsupported file type: ${originalName}`);
  const id = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 12);
  if (existingIds.has(id)) return null;
  const app = (opts.app || "Untitled").trim();
  const file = `${slug(app)}-${id}${ext}`;
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
  fs.writeFileSync(path.join(SCREENS_DIR, file), buf);
  const t = await makeThumb(buf, id);
  return {
    id,
    file,
    thumb: t.thumb,
    width: t.width,
    height: t.height,
    app,
    category: opts.category || "CRM",
    screenType: opts.type || guessType(path.basename(originalName)),
    tags: opts.tags || [],
    description: opts.description || "",
    source: opts.source || "own",
    addedAt: opts.addedAt || new Date().toISOString(),
  };
}
