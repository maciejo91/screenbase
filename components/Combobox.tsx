"use client";

import { useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Single-value combobox that also allows creating a new value. */
export function Combobox({
  value,
  options,
  onChange,
  placeholder = "Select…",
  id,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const exists = options.some((o) => o.toLowerCase() === q.trim().toLowerCase());
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search or create…" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o} value={o} onSelect={() => { onChange(o); setOpen(false); }}>
                  {o}
                  <CheckIcon className={cn("ml-auto", value === o ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
            {q.trim() && !exists && (
              <CommandGroup heading="New">
                <CommandItem value={`__create__${q}`} onSelect={() => { onChange(q.trim()); setOpen(false); }}>
                  <PlusIcon /> Create “{q.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Multi-value tag picker: existing tags + create new. */
export function TagPicker({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const norm = q.trim().toLowerCase();
  const all = [...new Set([...options, ...value])];
  const exists = all.includes(norm);
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 rounded-4xl border-dashed px-2 text-xs font-normal">
          <PlusIcon /> Add tag
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="filters, bulk actions…"
            value={q}
            onValueChange={setQ}
            onKeyDown={(e) => {
              if (e.key === "Enter" && norm && !exists) {
                e.preventDefault();
                onChange([...value, norm]);
                setQ("");
              }
            }}
          />
          <CommandList>
            <CommandEmpty>Type to create a tag.</CommandEmpty>
            {norm && !exists && (
              <CommandGroup heading="New">
                <CommandItem value={`__create__${norm}`} onSelect={() => { onChange([...value, norm]); setQ(""); }}>
                  <PlusIcon /> Create “{norm}”
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Tags">
              {all.map((t) => (
                <CommandItem key={t} value={t} onSelect={() => toggle(t)}>
                  {t}
                  <CheckIcon className={cn("ml-auto", value.includes(t) ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
