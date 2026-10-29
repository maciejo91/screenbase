import { promises as fs } from "fs";
import path from "path";

// Serves images that were added after `next build` (production only serves files
// that existed in /public at build time). Wired up via a fallback rewrite in next.config.mjs.
const TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const [dir, ...rest] = parts;
  if (!["screens", "thumbs"].includes(dir) || rest.some((p) => p.includes("..") || p.includes("/"))) {
    return new Response("Not found", { status: 404 });
  }
  const file = path.join(process.cwd(), "public", dir, ...rest);
  try {
    const buf = await fs.readFile(file);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
        // file names contain a content hash → safe to cache forever
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
