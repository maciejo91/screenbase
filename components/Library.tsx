"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AppWindowIcon, ArrowLeftIcon, CommandIcon, GalleryVerticalEndIcon, ImageIcon, LayersIcon,
  SearchIcon, TagIcon, UploadIcon, XIcon,
} from "lucide-react";
import type { Screen } from "@/lib/types";
import { appHref } from "@/lib/types";
import { makeFuse, runSearch } from "@/lib/search";
import { viewToSearch, type ViewState } from "@/lib/url";
import { filesFromDrop, type QueuedFile } from "@/lib/files";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import FilterRow from "./FilterRow";
import ScreenGrid from "./ScreenGrid";
import AppAvatar from "./AppAvatar";

// Heavier, interaction-only UI is code-split and loaded on demand.
const Lightbox = dynamic(() => import("./Lightbox"), { ssr: false });
const CommandPalette = dynamic(() => import("./CommandPalette"), { ssr: false });
const ImportDialog = dynamic(() => import("./ImportDialog"), { ssr: false });

type Facet = "screenType" | "app" | "tags";
type Sel = Record<Facet, string[]>;
const EMPTY_SEL: Sel = { screenType: [], app: [], tags: [] };

function countBy(screens: Screen[], facet: Facet): [string, number][] {
  const m = new Map<string, number>();
  for (const s of screens) {
    if (facet === "tags") for (const t of s.tags) m.set(t, (m.get(t) || 0) + 1);
    else if (s[facet]) m.set(s[facet], (m.get(s[facet]) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export default function Library({
  initialScreens,
  initialView,
  lockedApp,
  allApps: allAppsProp,
}: {
  initialScreens: Screen[];
  initialView: ViewState;
  /** App view: only this product's screens, kept in import order. */
  lockedApp?: string;
  /** All app names in the library (for editing), when this view is scoped. */
  allApps?: string[];
}) {
  const [screens, setScreens] = useState(initialScreens);
  const [query, setQuery] = useState(initialView.q);
  const deferredQuery = useDeferredValue(query); // keeps typing instant on big libraries
  const [typeOnly, setTypeOnly] = useState(true);
  const [sel, setSel] = useState<Sel>({ screenType: initialView.type, app: lockedApp ? [] : initialView.app, tags: initialView.tag });
  const [openId, setOpenId] = useState<string | null>(initialView.s);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteLoaded, setPaletteLoaded] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [queued, setQueued] = useState<QueuedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(() => makeFuse(screens), [screens]);
  const allTypes = useMemo(() => countBy(screens, "screenType").map(([t]) => t), [screens]);
  const appsHere = useMemo(() => countBy(screens, "app").map(([t]) => t), [screens]);
  const allApps = useMemo(() => [...new Set([...(allAppsProp || []), ...appsHere])], [allAppsProp, appsHere]);
  const allTags = useMemo(() => countBy(screens, "tags").map(([t]) => t), [screens]);
  const { items: searched, detectedType: detected, detectedApp } = useMemo(
    () => runSearch(screens, fuse, deferredQuery, appsHere, allTypes, typeOnly),
    [screens, fuse, deferredQuery, appsHere, allTypes, typeOnly]
  );

  const passes = useCallback(
    (s: Screen, skip?: Facet) =>
      (skip === "screenType" || !sel.screenType.length || sel.screenType.includes(s.screenType)) &&
      (skip === "app" || !sel.app.length || sel.app.includes(s.app)) &&
      (skip === "tags" || !sel.tags.length || sel.tags.every((t) => s.tags.includes(t))),
    [sel]
  );

  const results = useMemo(() => searched.filter((s) => passes(s)), [searched, passes]);
  const facets = useMemo(
    () => ({
      screenType: countBy(searched.filter((s) => passes(s, "screenType")), "screenType"),
      app: countBy(searched.filter((s) => passes(s, "app")), "app"),
      tags: countBy(searched.filter((s) => passes(s, "tags")), "tags"),
    }),
    [searched, passes]
  );

  const activeCount = sel.screenType.length + sel.app.length + sel.tags.length;
  const filtered = !!query || activeCount > 0;
  const clearAll = useCallback(() => {
    setSel(EMPTY_SEL);
    setQuery("");
  }, []);
  const only = useCallback((facet: Facet, v: string) => {
    setSel({ ...EMPTY_SEL, [facet]: [v] });
    setQuery("");
  }, []);

  // Shareable URLs: mirror search / filters / open screen into the query string (no navigation, no re-render).
  useEffect(() => {
    const t = setTimeout(() => {
      const search = viewToSearch({ q: deferredQuery.trim(), type: sel.screenType, app: sel.app, tag: sel.tags, s: openId });
      if (search !== window.location.search) window.history.replaceState(window.history.state, "", window.location.pathname + search);
    }, 150);
    return () => clearTimeout(t);
  }, [deferredQuery, sel, openId]);

  // Keyboard: ⌘K / Ctrl+K palette, "/" focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteLoaded(true);
        setPaletteOpen((o) => !o);
      } else if (e.key === "/" && !typing && !openId) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  // Drag & drop anywhere to import (files or folders).
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types || [])].includes("Files");
    const enter = (e: DragEvent) => { if (!hasFiles(e)) return; depth++; setDragging(true); };
    const leave = (e: DragEvent) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const drop = async (e: DragEvent) => {
      if (!hasFiles(e) || !e.dataTransfer) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      // if the import dialog is open, its own dropzone handles the drop
      if ((e.target as HTMLElement)?.closest?.("[data-dropzone]")) return;
      const files = await filesFromDrop(e.dataTransfer);
      if (files.length) {
        setQueued((q) => [...q, ...files]);
        setImportOpen(true);
      }
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, []);

  const openIndex = openId ? results.findIndex((s) => s.id === openId) : -1;
  const openScreen = openId ? screens.find((s) => s.id === openId) ?? null : null;
  const onOpen = useCallback((id: string) => setOpenId(id), []);
  const onPrev = useCallback(() => {
    if (openIndex > 0) setOpenId(results[openIndex - 1].id);
  }, [openIndex, results]);
  const onNext = useCallback(() => {
    if (openIndex >= 0 && openIndex < results.length - 1) setOpenId(results[openIndex + 1].id);
  }, [openIndex, results]);

  const typeCounts = useMemo(() => countBy(screens, "screenType"), [screens]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1680px] items-center gap-3 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Screenbase</span>
          </Link>
          <Badge variant="secondary" className="hidden sm:inline-flex">Web · SaaS · CRM</Badge>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span className="mr-1 hidden tabular-nums md:inline">{lockedApp ? `${screens.length} screens` : `${screens.length} screens · ${appsHere.length} apps`}</span>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => { setPaletteLoaded(true); setPaletteOpen(true); }}
            >
              <CommandIcon /> <span className="hidden sm:inline">Jump to…</span>
              <KbdGroup className="hidden sm:inline-flex"><Kbd>⌘</Kbd><Kbd>K</Kbd></KbdGroup>
            </Button>
            <Button size="sm" onClick={() => setImportOpen(true)}>
              <UploadIcon /> Import
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1680px] px-5 pb-24 sm:px-8">
        {lockedApp ? (
          <section className="pt-8 pb-6">
            <Button asChild variant="ghost" size="sm" className="-ml-2.5 text-muted-foreground">
              <Link href="/"><ArrowLeftIcon /> All screens</Link>
            </Button>
            <div className="mt-4 flex items-center gap-4">
              <AppAvatar name={lockedApp} size={52} />
              <div className="min-w-0">
                <h1 className="truncate text-3xl font-semibold tracking-tight">{lockedApp}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {screens[0]?.category || "—"} · {screens.length} {screens.length === 1 ? "screen" : "screens"} · in import order
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {typeCounts.map(([t, n]) => (
                <Badge key={t} variant="outline" className="h-6 px-2.5">{t} <span className="text-muted-foreground tabular-nums">{n}</span></Badge>
              ))}
            </div>
          </section>
        ) : (
          <section className="pt-10 pb-2">
            <h1 className="text-3xl font-semibold tracking-tight">Find a pattern</h1>
            <p className="mt-1.5 text-muted-foreground">Search web SaaS &amp; CRM screens by app, screen type, pattern or note.</p>
          </section>
        )}

        <div className={lockedApp ? "pb-5" : "pt-4 pb-6"}>
          <InputGroup className={(lockedApp ? "h-10" : "h-12") + " rounded-xl bg-background shadow-xs"}>
            <InputGroupAddon className="pl-3.5">
              <SearchIcon className={lockedApp ? "size-4!" : "size-5!"} />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setTypeOnly(true); }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setQuery(""); e.currentTarget.blur(); }
                if (e.key === "Enter" && results[0]) setOpenId(results[0].id);
              }}
              placeholder={lockedApp ? `Search ${lockedApp}…` : "Search “dashboard”, “bulk actions”, “pipeline”…"}
              className={lockedApp ? "text-sm" : "text-base"}
              aria-label="Search screens"
              autoComplete="off"
              spellCheck={false}
            />
            <InputGroupAddon align="inline-end" className="pr-3">
              {query ? (
                <InputGroupButton size="icon-xs" onClick={() => setQuery("")} aria-label="Clear search"><XIcon /></InputGroupButton>
              ) : (
                <Kbd>/</Kbd>
              )}
            </InputGroupAddon>
          </InputGroup>
          {(detected || (detectedApp && !lockedApp)) && (
            <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              Showing
              {detectedApp && !lockedApp && <Badge variant="secondary">app: {detectedApp}</Badge>}
              {detected && <Badge variant="secondary">type: {detected}</Badge>}
              {detected && (
                <>
                  ·
                  <Button variant="link" className="h-auto p-0 text-sm" onClick={() => setTypeOnly(false)}>search “{detected}” in all fields instead</Button>
                </>
              )}
            </p>
          )}
        </div>

        <section className="space-y-2.5 border-b pb-6">
          <FilterRow icon={<LayersIcon />} label="Type" items={facets.screenType} value={sel.screenType} limit={12} onChange={(v) => setSel((p) => ({ ...p, screenType: v }))} />
          {!lockedApp && (
            <FilterRow icon={<AppWindowIcon />} label="App" items={facets.app} value={sel.app} limit={12} onChange={(v) => setSel((p) => ({ ...p, app: v }))} />
          )}
          <FilterRow icon={<TagIcon />} label="Patterns" items={facets.tags} value={sel.tags} limit={16} onChange={(v) => setSel((p) => ({ ...p, tags: v }))} />
        </section>

        <div className="flex h-14 items-center justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="font-semibold tabular-nums text-foreground" data-testid="result-count">{results.length}</span>{" "}
            {results.length === 1 ? "screen" : "screens"}
            {filtered && <> of {screens.length}</>}
          </p>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={clearAll}><XIcon /> Clear all</Button>
          )}
        </div>

        {results.length ? (
          <ScreenGrid screens={results} onOpen={onOpen} showApp={!lockedApp} />
        ) : (
          <Empty className="border border-dashed py-20">
            <EmptyHeader>
              <EmptyMedia variant="icon">{screens.length ? <SearchIcon /> : <ImageIcon />}</EmptyMedia>
              <EmptyTitle>{screens.length ? "No screens match" : "Your library is empty"}</EmptyTitle>
              <EmptyDescription>
                {screens.length ? "Try a broader search or remove some filters." : "Drop screenshots anywhere on this page, or run npm run import -- <folder>."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {screens.length ? (
                <Button variant="outline" size="sm" onClick={clearAll}>Clear filters</Button>
              ) : (
                <Button size="sm" onClick={() => setImportOpen(true)}><UploadIcon /> Import screenshots</Button>
              )}
            </EmptyContent>
          </Empty>
        )}
      </main>

      {dragging && !importOpen && (
        <div className="pointer-events-none fixed inset-3 z-[60] flex items-center justify-center rounded-2xl border-2 border-dashed border-foreground/30 bg-background/85 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-muted"><UploadIcon className="size-5" /></span>
            <p className="text-lg font-medium">Drop screenshots to import</p>
            <p className="text-sm text-muted-foreground">Files or whole folders · folder name becomes the app</p>
          </div>
        </div>
      )}

      {paletteLoaded && (
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          screens={screens}
          types={allTypes}
          apps={appsHere}
          tags={allTags}
          lockedApp={lockedApp}
          onFilter={(facet, v) => only(facet, v)}
          onOpenScreen={(id) => setOpenId(id)}
          onImport={() => setImportOpen(true)}
        />
      )}

      {(importOpen || queued.length > 0) && (
        <ImportDialog
          open={importOpen}
          onOpenChange={(o) => { setImportOpen(o); if (!o) setQueued([]); }}
          queued={queued}
          setQueued={setQueued}
          apps={allApps}
          types={allTypes}
          defaultApp={lockedApp}
          onImported={(added) => {
            setScreens((list) => (lockedApp ? [...list, ...added.filter((s) => s.app === lockedApp)] : [...[...added].reverse(), ...list]));
          }}
        />
      )}

      {openScreen && (
        <Lightbox
          screen={openScreen}
          prev={openIndex > 0 ? results[openIndex - 1] : undefined}
          next={openIndex >= 0 ? results[openIndex + 1] : undefined}
          index={openIndex}
          total={results.length}
          allTags={allTags}
          allApps={allApps}
          allTypes={allTypes}
          appLink={lockedApp ? undefined : appHref(openScreen.app)}
          onClose={() => setOpenId(null)}
          onPrev={onPrev}
          onNext={onNext}
          onTagClick={(t) => { setOpenId(null); only("tags", t); }}
          onSaved={(u) => setScreens((list) => list.map((x) => (x.id === u.id ? u : x)))}
          onDeleted={(id) => {
            const nextId = openIndex >= 0 ? (results[openIndex + 1] || results[openIndex - 1])?.id : undefined;
            setScreens((list) => list.filter((x) => x.id !== id));
            setOpenId(nextId && nextId !== id ? nextId : null);
          }}
        />
      )}
    </div>
  );
}
