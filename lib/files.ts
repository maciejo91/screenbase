"use client";

export type QueuedFile = { file: File; path: string };

const IMG = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

type FsEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file?: (cb: (f: File) => void, err: (e: unknown) => void) => void;
  createReader?: () => { readEntries: (cb: (e: FsEntry[]) => void, err: (e: unknown) => void) => void };
};

async function walk(entry: FsEntry, out: QueuedFile[]) {
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((res, rej) => entry.file!(res, rej));
    if (IMG.test(file.name)) out.push({ file, path: entry.fullPath.replace(/^\//, "") });
  } else if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    // readEntries returns results in batches — keep reading until empty
    for (;;) {
      const batch = await new Promise<FsEntry[]>((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const e of batch) if (!e.name.startsWith(".")) await walk(e, out);
    }
  }
}

/** Collects image files from a drop event, including dropped folders (recursively). */
export async function filesFromDrop(dt: DataTransfer): Promise<QueuedFile[]> {
  const out: QueuedFile[] = [];
  const entries = [...dt.items]
    .map((it) => (it.kind === "file" ? (it as DataTransferItem & { webkitGetAsEntry?: () => FsEntry | null }).webkitGetAsEntry?.() : null))
    .filter(Boolean) as FsEntry[];
  if (entries.length) {
    for (const e of entries) await walk(e, out);
    return out;
  }
  for (const f of dt.files) if (IMG.test(f.name)) out.push({ file: f, path: f.name });
  return out;
}

export function filesFromInput(list: FileList | null): QueuedFile[] {
  return [...(list || [])]
    .filter((f) => IMG.test(f.name))
    .map((f) => ({ file: f, path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name }));
}
