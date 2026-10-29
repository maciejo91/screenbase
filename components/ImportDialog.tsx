"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FolderOpenIcon, ImagePlusIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import type { Screen } from "@/lib/types";
import { SCREEN_TYPES } from "@/lib/types";
import { filesFromDrop, filesFromInput, type QueuedFile } from "@/lib/files";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Combobox } from "./Combobox";

const BATCH = 8;

export default function ImportDialog({
  open, onOpenChange, queued, setQueued, apps, types, defaultApp, onImported,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  queued: QueuedFile[];
  setQueued: React.Dispatch<React.SetStateAction<QueuedFile[]>>;
  apps: string[];
  types: string[];
  defaultApp?: string;
  onImported: (added: Screen[]) => void;
}) {
  const [app, setApp] = useState(defaultApp || "");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("CRM");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [over, setOver] = useState(false);
  const filesRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dirRef.current?.setAttribute("webkitdirectory", "");
  }, [open]);

  const folderNames = useMemo(() => [...new Set(queued.map((q) => q.path.split("/")).filter((p) => p.length > 1).map((p) => p[0]))], [queued]);
  const previews = useMemo(() => queued.slice(0, 18).map((q) => ({ key: q.path + q.file.size, url: URL.createObjectURL(q.file), name: q.path })), [queued]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const add = (files: QueuedFile[]) => {
    if (!files.length) return toast.error("No images found (png, jpg, webp, gif, avif, svg)");
    setQueued((q) => {
      const seen = new Set(q.map((x) => x.path + x.file.size));
      return [...q, ...files.filter((f) => !seen.has(f.path + f.file.size))];
    });
  };

  const upload = async () => {
    setBusy(true);
    setProgress(0);
    const added: Screen[] = [];
    let skipped = 0;
    const errors: string[] = [];
    try {
      for (let i = 0; i < queued.length; i += BATCH) {
        const fd = new FormData();
        for (const q of queued.slice(i, i + BATCH)) {
          fd.append("files", q.file, q.file.name);
          fd.append("paths", q.path);
        }
        fd.set("app", app);
        fd.set("type", type);
        fd.set("category", category);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        added.push(...json.added);
        skipped += json.skipped;
        errors.push(...json.errors);
        setProgress(Math.min(queued.length, i + BATCH));
      }
      onImported(added);
      toast[added.length ? "success" : "info"](added.length ? `Imported ${added.length} screen${added.length === 1 ? "" : "s"}` : "Nothing new to import", {
        description: [skipped && `${skipped} duplicate${skipped === 1 ? "" : "s"} skipped`, errors.length && `${errors.length} failed`, added.length && "Tags are empty — tag them in the detail view."].filter(Boolean).join(" · ") || undefined,
      });
      if (errors.length) console.warn(errors);
      setQueued([]);
      onOpenChange(false);
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import screenshots</DialogTitle>
          <DialogDescription>Images are copied into the library with a 640px webp thumbnail. Tags start empty.</DialogDescription>
        </DialogHeader>

        <div
          data-dropzone
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={async (e) => { e.preventDefault(); setOver(false); add(await filesFromDrop(e.dataTransfer)); }}
          className={"flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center transition-colors " + (over ? "border-foreground/40 bg-muted" : "bg-muted/40")}
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-background ring-1 ring-foreground/10"><ImagePlusIcon className="size-5 text-muted-foreground" /></span>
          <div>
            <p className="text-sm font-medium">Drop images or folders here</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, WebP, GIF, AVIF, SVG · a folder name becomes the app</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => filesRef.current?.click()}><ImagePlusIcon /> Choose files</Button>
            <Button variant="outline" size="sm" onClick={() => dirRef.current?.click()}><FolderOpenIcon /> Choose folder</Button>
          </div>
          <input ref={filesRef} type="file" accept="image/*,.svg" multiple hidden onChange={(e) => { add(filesFromInput(e.target.files)); e.target.value = ""; }} />
          <input ref={dirRef} type="file" multiple hidden onChange={(e) => { add(filesFromInput(e.target.files)); e.target.value = ""; }} />
        </div>

        {queued.length > 0 && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{queued.length} image{queued.length === 1 ? "" : "s"} ready</span>
              <Button variant="ghost" size="xs" onClick={() => setQueued([])} disabled={busy}><XIcon /> Clear</Button>
            </div>
            <ScrollArea className="max-h-40">
              <div className="grid grid-cols-6 gap-1.5">
                {previews.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.key} src={p.url} alt={p.name} title={p.name} className="aspect-[16/10] w-full rounded-md object-cover object-top ring-1 ring-foreground/10" />
                ))}
                {queued.length > previews.length && (
                  <div className="flex aspect-[16/10] items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">+{queued.length - previews.length}</div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid gap-2">
            <Label className="text-xs text-muted-foreground">App</Label>
            <Combobox value={app} options={apps} onChange={setApp} placeholder={folderNames.length ? `From folder name (${folderNames.slice(0, 2).join(", ")}${folderNames.length > 2 ? "…" : ""})` : "Untitled — pick or create"} />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Screen type</Label>
            <Combobox value={type} options={[...new Set([...types, ...SCREEN_TYPES])]} onChange={setType} placeholder="Auto from file name" />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground" htmlFor="imp-cat">Category</Label>
            <Input id="imp-cat" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={upload} disabled={!queued.length || busy}>
            {busy ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
            {busy ? `Importing ${progress}/${queued.length}…` : `Import ${queued.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
