import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Screen } from "./types";

export const DATA_FILE = path.join(process.cwd(), "data", "screens.json");

export async function readScreens(): Promise<Screen[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as Screen[];
  } catch {
    return [];
  }
}

/** Newest first (library view). */
export const byNewest = (a: Screen, b: Screen) => (b.addedAt || "").localeCompare(a.addedAt || "") || a.id.localeCompare(b.id);
/** Oldest first (app view — keeps a product's flow in import order). */
export const byOldest = (a: Screen, b: Screen) => -byNewest(a, b);

// Serialize writes so concurrent PATCH/upload requests can't clobber each other.
let queue: Promise<unknown> = Promise.resolve();
export function mutateScreens<T>(fn: (list: Screen[]) => Promise<T> | T): Promise<T> {
  const run = queue.then(async () => {
    const list = await readScreens();
    const result = await fn(list);
    const tmp = DATA_FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(list, null, 2) + "\n", "utf8");
    await fs.rename(tmp, DATA_FILE);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}
