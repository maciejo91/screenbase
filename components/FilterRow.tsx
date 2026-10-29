"use client";

import { memo, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";

function FilterRow({
  icon,
  label,
  items,
  value,
  onChange,
  limit = 14,
}: {
  icon: React.ReactNode;
  label: string;
  items: [string, number][];
  value: string[];
  onChange: (v: string[]) => void;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  // selected chips stay visible (first) even if their count drops to 0
  const selected = value.map((v) => items.find(([k]) => k === v) ?? ([v, 0] as [string, number]));
  const rest = items.filter(([k]) => !value.includes(k));
  const shown = [...selected, ...(expanded ? rest : rest.slice(0, Math.max(0, limit - selected.length)))];
  const hidden = selected.length + rest.length - shown.length;

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      <div className="flex w-24 shrink-0 items-center gap-1.5 sm:pt-1.5 text-xs font-medium text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <ToggleGroup type="multiple" variant="outline" size="sm" spacing={1} value={value} onValueChange={onChange} className="no-scrollbar -mx-5 w-auto flex-1 flex-nowrap overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" aria-label={label}>
        {shown.map(([v, n]) => (
          <ToggleGroupItem
            key={v}
            value={v}
            aria-label={v}
            className="rounded-full! border-border px-3 font-normal data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {v}
            <span className="tabular-nums text-muted-foreground group-data-[state=on]/toggle:text-primary-foreground/60">{n}</span>
          </ToggleGroupItem>
        ))}
        {!shown.length && <span className="pt-1 text-sm text-muted-foreground">—</span>}
        {(hidden > 0 || expanded) && rest.length > limit - selected.length && (
          <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={() => setExpanded((x) => !x)}>
            {expanded ? "Show less" : `+${hidden} more`}
          </Button>
        )}
      </ToggleGroup>
    </div>
  );
}

export default memo(FilterRow);
