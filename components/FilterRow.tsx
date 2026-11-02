"use client";

import { memo, useState } from "react";
import { ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function FilterSelect({
  icon,
  label,
  searchPlaceholder,
  items,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  searchPlaceholder: string;
  items: [string, number][];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const known = new Set(items.map(([k]) => k));
  const ordered = [...items, ...value.filter((v) => !known.has(v)).map((v) => [v, 0] as [string, number])];
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const summary = value.length === 0 ? label : value.length === 1 ? value[0] : `${label} · ${value.length}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          className={cn("h-9 max-w-56 justify-between gap-2 font-normal", value.length > 0 && "border-foreground/15 bg-muted")}
        >
          <span className="flex min-w-0 items-center gap-1.5 [&_svg]:size-3.5 [&_svg]:text-muted-foreground">
            {icon}
            <span className="truncate">{summary}</span>
          </span>
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {ordered.map(([v, n]) => (
                <CommandItem
                  key={v}
                  value={v}
                  data-checked={value.includes(v)}
                  onSelect={() => toggle(v)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_2rem_1rem]"
                >
                  <span className="truncate">{v}</span>
                  <span className="text-right text-xs tabular-nums text-muted-foreground">{n}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {value.length > 0 && (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center border-t px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default memo(FilterSelect);
