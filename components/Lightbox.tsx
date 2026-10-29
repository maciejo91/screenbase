"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRightIcon, ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon, Trash2Icon, XIcon } from "lucide-react";
import type { Screen } from "@/lib/types";
import { SCREEN_TYPES, fullUrl, thumbUrl } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Combobox, TagPicker } from "./Combobox";
import AppAvatar from "./AppAvatar";

type Props = {
  screen: Screen;
  prev?: Screen;
  next?: Screen;
  index: number;
  total: number;
  allTags: string[];
  allApps: string[];
  allTypes: string[];
  appLink?: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onTagClick: (t: string) => void;
  onSaved: (s: Screen) => void;
  onDeleted: (id: string) => void;
};

const preloaded = new Set<string>();
function preload(src?: string) {
  if (!src || preloaded.has(src)) return;
  preloaded.add(src);
  const img = new Image();
  img.decoding = "async";
  img.src = src;
}

export default function Lightbox(p: Props) {
  const { screen: s } = p;

  // Arrow keys / j k navigate (ignored while typing or while a picker is open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable) return;
      if (document.querySelector('[data-slot="popover-content"]')) return;
      if (e.key === "ArrowLeft" || e.key === "k") { e.preventDefault(); p.onPrev(); }
      if (e.key === "ArrowRight" || e.key === "j") { e.preventDefault(); p.onNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.onPrev, p.onNext]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warm the cache for neighbours so prev/next feels instant
  useEffect(() => {
    preload(p.next && fullUrl(p.next));
    preload(p.prev && fullUrl(p.prev));
  }, [p.next, p.prev]);

  const save = async (patch: Partial<Screen>) => {
    const before = s;
    p.onSaved({ ...s, ...patch }); // optimistic
    try {
      const res = await fetch(`/api/screens/${encodeURIComponent(s.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
      p.onSaved(await res.json());
      toast.success("Saved", { duration: 1200 });
    } catch (e) {
      p.onSaved(before);
      toast.error(`Couldn't save: ${(e as Error).message}`);
    }
  };

  const tall = (s.height || 900) / (s.width || 1440) > 1.25;

  return (
    <Dialog open onOpenChange={(o) => !o && p.onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="flex h-[100dvh] max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[calc(100dvh-2.5rem)] sm:max-w-[min(1720px,calc(100vw-2.5rem))] sm:rounded-2xl lg:flex-row"
      >
        {/* Stage */}
        <div className="relative min-h-0 flex-1 bg-muted/60">
          {tall ? (
            <ScrollArea className="h-full">
              <div className="flex justify-center p-4 sm:p-10">
                <StageImage key={s.id} s={s} tall />
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full items-center justify-center p-4 sm:p-10">
              <StageImage key={s.id} s={s} tall={false} />
            </div>
          )}
          <NavButton side="left" disabled={!p.prev} onClick={p.onPrev} />
          <NavButton side="right" disabled={!p.next} onClick={p.onNext} />
          {p.index >= 0 && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground shadow-sm ring-1 ring-foreground/10">
              {p.index + 1} / {p.total}
            </div>
          )}
        </div>

        {/* Side panel */}
        <aside className="flex max-h-[48dvh] w-full shrink-0 flex-col border-t lg:max-h-none lg:w-[380px] lg:border-t-0 lg:border-l">
          <div className="flex items-center gap-3 px-5 py-4">
            <AppAvatar name={s.app} size={32} />
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-semibold tracking-tight">
                {p.appLink ? (
                  <Link href={p.appLink} className="group/app inline-flex items-center gap-1 hover:underline hover:underline-offset-4">
                    {s.app}
                    <ArrowUpRightIcon className="size-3.5 text-muted-foreground transition group-hover/app:text-foreground" />
                  </Link>
                ) : (
                  s.app
                )}
              </DialogTitle>
              <DialogDescription className="truncate text-xs">{s.category} · {s.screenType}</DialogDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={p.onClose} aria-label="Close"><XIcon /></Button>
              </TooltipTrigger>
              <TooltipContent>Close <Kbd>Esc</Kbd></TooltipContent>
            </Tooltip>
          </div>
          <Separator />

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-6 px-5 py-5">
              <Field label="Screen type">
                <Combobox
                  value={s.screenType}
                  options={[...new Set([...p.allTypes, ...SCREEN_TYPES])]}
                  onChange={(v) => v !== s.screenType && save({ screenType: v })}
                />
              </Field>

              <Field label="Patterns">
                <div className="flex flex-wrap items-center gap-1.5">
                  {s.tags.map((t) => (
                    <Badge key={t} variant="outline" className="group/tag h-6 gap-0.5 pr-1 pl-2.5 font-normal">
                      <button className="hover:underline hover:underline-offset-2" onClick={() => p.onTagClick(t)} title={`Show all “${t}”`}>
                        {t}
                      </button>
                      <button
                        aria-label={`Remove ${t}`}
                        onClick={() => save({ tags: s.tags.filter((x) => x !== t) })}
                        className="rounded-full p-0.5 text-muted-foreground opacity-60 hover:bg-muted hover:text-foreground hover:opacity-100"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  ))}
                  <TagPicker value={s.tags} options={p.allTags} onChange={(tags) => save({ tags })} />
                </div>
              </Field>

              <Field label="Notes">
                <BlurSave
                  key={`d-${s.id}`}
                  multiline
                  value={s.description}
                  placeholder="What's interesting about this screen?"
                  onSave={(description) => save({ description })}
                />
              </Field>

              <Separator />

              <div className="grid gap-4">
                <Field label="App">
                  <Combobox value={s.app} options={p.allApps} onChange={(v) => v !== s.app && save({ app: v })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Category">
                    <BlurSave key={`c-${s.id}`} value={s.category} onSave={(category) => save({ category })} />
                  </Field>
                  <Field label="Source">
                    <BlurSave key={`s-${s.id}`} value={s.source} placeholder="URL or own" onSave={(source) => save({ source })} />
                  </Field>
                </div>
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Added</dt>
                <dd>{new Date(s.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</dd>
                {s.width && s.height ? (<><dt className="text-muted-foreground">Size</dt><dd className="tabular-nums">{s.width} × {s.height}</dd></>) : null}
                {/^https?:\/\//.test(s.source) && (
                  <>
                    <dt className="text-muted-foreground">Link</dt>
                    <dd className="truncate"><a className="underline underline-offset-4" href={s.source} target="_blank" rel="noreferrer">{s.source.replace(/^https?:\/\//, "")}</a></dd>
                  </>
                )}
              </dl>

              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={fullUrl(s)} target="_blank" rel="noreferrer"><ExternalLinkIcon /> Open original</a>
                </Button>
                <DeleteButton onConfirm={async () => {
                  const res = await fetch(`/api/screens/${encodeURIComponent(s.id)}`, { method: "DELETE" });
                  if (res.ok) { toast.success("Screen deleted"); p.onDeleted(s.id); }
                  else toast.error("Couldn't delete");
                }} />
              </div>
            </div>
          </ScrollArea>

          <Separator />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Kbd>←</Kbd><Kbd>→</Kbd> navigate</span>
            <span className="flex items-center gap-1"><Kbd>Esc</Kbd> close</span>
          </div>
        </aside>
      </DialogContent>
    </Dialog>
  );
}

/** Full image with the (already cached) thumbnail as an instant placeholder. */
function StageImage({ s, tall }: { s: Screen; tall: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => { if (ref.current?.complete) setLoaded(true); }, []);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={fullUrl(s)}
      alt={`${s.app} — ${s.screenType}`}
      width={s.width || 1440}
      height={s.height || 900}
      decoding="async"
      fetchPriority="high"
      onLoad={() => setLoaded(true)}
      style={loaded ? undefined : { backgroundImage: `url(${thumbUrl(s)})`, backgroundSize: "100% auto", backgroundRepeat: "no-repeat" }}
      className={
        "rounded-lg bg-background shadow-[0_20px_60px_-20px_rgb(0_0_0/0.25)] ring-1 ring-foreground/10 " +
        (tall ? "h-auto w-full max-w-[1200px]" : "max-h-full w-auto max-w-full object-contain")
      }
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function BlurSave({ value, onSave, placeholder, multiline }: { value: string; onSave: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const [v, setV] = useState(value);
  const commit = () => { if (v.trim() !== (value || "").trim()) onSave(v.trim()); };
  const common = {
    value: v,
    placeholder,
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
    },
  };
  return multiline ? (
    <Textarea {...common} onChange={(e) => setV(e.target.value)} className="min-h-20 resize-none" />
  ) : (
    <Input {...common} onChange={(e) => setV(e.target.value)} />
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t); }, [armed]);
  return (
    <Button variant={armed ? "destructive" : "ghost"} size="sm" className="text-muted-foreground" onClick={() => (armed ? onConfirm() : setArmed(true))}>
      <Trash2Icon /> {armed ? "Click to confirm" : "Delete"}
    </Button>
  );
}

function NavButton({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon-lg"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous screen" : "Next screen"}
      className={"absolute top-1/2 -translate-y-1/2 rounded-full bg-background/90 shadow-sm backdrop-blur disabled:opacity-0 " + (side === "left" ? "left-4" : "right-4")}
    >
      {side === "left" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </Button>
  );
}
