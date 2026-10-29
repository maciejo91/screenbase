"use client";

import { AppWindowIcon, ImageIcon, LayersIcon, TagIcon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Screen } from "@/lib/types";
import { appHref } from "@/lib/types";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";

type Facet = "screenType" | "app" | "tags";

export default function CommandPalette({
  open, onOpenChange, screens, types, apps, tags, lockedApp, onFilter, onOpenScreen, onImport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  screens: Screen[];
  types: string[];
  apps: string[];
  tags: string[];
  lockedApp?: string;
  onFilter: (facet: Facet, v: string) => void;
  onOpenScreen: (id: string) => void;
  onImport: () => void;
}) {
  const router = useRouter();
  const run = (fn: () => void) => { onOpenChange(false); fn(); };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Jump to" description="Filter by type, app or pattern, or open a screen" className="sm:max-w-xl">
      <Command>
      <CommandInput placeholder="Screen type, app, pattern or screen…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Screen types">
          {types.map((t) => (
            <CommandItem key={t} value={`type ${t}`} onSelect={() => run(() => onFilter("screenType", t))}>
              <LayersIcon /> {t}
            </CommandItem>
          ))}
        </CommandGroup>
        {!lockedApp && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Apps">
              {apps.map((a) => (
                <CommandItem key={a} value={`app ${a}`} onSelect={() => run(() => router.push(appHref(a)))}>
                  <AppWindowIcon /> {a}
                  <CommandShortcut>App view</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Patterns">
          {tags.map((t) => (
            <CommandItem key={t} value={`tag ${t}`} onSelect={() => run(() => onFilter("tags", t))}>
              <TagIcon /> {t}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Screens">
          {screens.slice(0, 200).map((s) => (
            <CommandItem key={s.id} value={`screen ${s.app} ${s.screenType} ${s.tags.join(" ")} ${s.id}`} onSelect={() => run(() => onOpenScreen(s.id))}>
              <ImageIcon /> <span className="truncate">{s.app} — {s.screenType}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem value="action import upload" onSelect={() => run(onImport)}>
            <UploadIcon /> Import screenshots…
          </CommandItem>
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
