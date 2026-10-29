"use client";

import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Screen } from "@/lib/types";
import { appHref, thumbUrl } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import AppAvatar from "./AppAvatar";

const PAGE = 60;

/**
 * Uniform 16:10 grid (fixed aspect → zero layout shift). Renders progressively:
 * the first PAGE cards immediately, more as the sentinel scrolls into view.
 */
export default function ScreenGrid({ screens, onOpen, showApp = true }: { screens: Screen[]; onOpen: (id: string) => void; showApp?: boolean }) {
  const [count, setCount] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  // reset when the result set changes
  useEffect(() => setCount(PAGE), [screens]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || count >= screens.length) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setCount((c) => c + PAGE), { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [count, screens.length]);

  return (
    <>
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {screens.slice(0, count).map((s, i) => (
          <Card key={s.id} s={s} onOpen={onOpen} eager={i < 8} showApp={showApp} />
        ))}
      </div>
      <div ref={sentinel} aria-hidden className="h-px" />
    </>
  );
}

const Card = memo(function Card({ s, onOpen, eager, showApp }: { s: Screen; onOpen: (id: string) => void; eager: boolean; showApp: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // image may already be decoded from cache before hydration
  useEffect(() => { if (img.current?.complete) setLoaded(true); }, []);
  return (
    <article className="group [contain-intrinsic-size:auto_320px] [content-visibility:auto]">
      <button
        onClick={() => onOpen(s.id)}
        className="block w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 outline-none transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.18)] focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Open ${s.app} — ${s.screenType}`}
      >
        <div className="relative aspect-[16/10]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={img}
            src={thumbUrl(s)}
            alt=""
            width={640}
            height={400}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={"absolute inset-0 size-full object-cover object-top transition-opacity duration-300 " + (loaded ? "opacity-100" : "opacity-0")}
          />
        </div>
      </button>
      <div className="mt-2.5 flex items-center gap-2 px-0.5">
        {showApp ? (
          <Link href={appHref(s.app)} prefetch={false} className="flex min-w-0 items-center gap-2 rounded-sm hover:underline hover:underline-offset-4">
            <AppAvatar name={s.app} size={20} />
            <span className="truncate text-sm font-medium">{s.app}</span>
          </Link>
        ) : (
          <span className="truncate text-sm font-medium">{s.description?.replace(/^\[Placeholder\]\s*/, "") || s.screenType}</span>
        )}
        <Badge variant="secondary" className="ml-auto">{s.screenType}</Badge>
      </div>
      {s.tags.length > 0 && (
        <div className={"mt-1 truncate text-xs text-muted-foreground " + (showApp ? "pl-[28px]" : "px-0.5")}>{s.tags.slice(0, 4).join(" · ")}</div>
      )}
    </article>
  );
});
