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
export const THUMB_W = 640;
export const THUMB_H = 400; // 16:10, cropped from the top — matches the grid cards

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
  const img = sharp(buf, { animated: false, limitInputPixels: false });
  const meta = await img.metadata();
  const thumb = `${id}.webp`;
  await img
    .resize(THUMB_W, THUMB_H, { fit: "cover", position: "top", withoutEnlargement: false })
    .webp({ quality: 78, effort: 4 })
    .toFile(path.join(THUMBS_DIR, thumb));
  return { thumb, width: meta.width || 1440, height: meta.height || 900 };
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
