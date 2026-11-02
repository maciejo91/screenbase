"use client";

import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Layout } from "@/lib/url";
import type { Screen } from "@/lib/types";
import { appHref, thumbUrl } from "@/lib/types";
import AppAvatar from "./AppAvatar";

const PAGE = 60;

function captionOf(s: Screen) {
  return s.description?.replace(/^\[Placeholder\]\s*/, "").trim() || s.tags.slice(0, 4).join(" · ");
}

/**
 * Three-up 16:10 grid (fixed aspect → zero layout shift). Renders progressively:
 * the first PAGE cards immediately, more as the sentinel scrolls into view.
 */
export default function ScreenGrid({ screens, onOpen, showApp = true, layout = "grid" }: { screens: Screen[]; onOpen: (id: string) => void; showApp?: boolean; layout?: Layout }) {
  const page = layout === "stack" ? 8 : PAGE;
  const [count, setCount] = useState(page);
  const sentinel = useRef<HTMLDivElement>(null);

  // reset when the result set or the page size changes
  useEffect(() => setCount(page), [screens, page]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || count >= screens.length) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setCount((c) => c + page), { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [count, screens.length, page]);

  return (
    <>
      <div className={(layout === "stack" ? "mx-auto flex w-full max-w-[1440px] flex-col gap-16" : "grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3") + " [overflow-anchor:none]"}>
        {screens.slice(0, count).map((s, i) => (
          <Card key={s.id} s={s} onOpen={onOpen} eager={i < (layout === "stack" ? 2 : 6)} showApp={showApp} layout={layout} paint={i < (layout === "stack" ? 2 : 6)} />
        ))}
      </div>
      <div ref={sentinel} aria-hidden className="h-px" />
    </>
  );
}

const Card = memo(function Card({ s, onOpen, eager, showApp, layout, paint }: { s: Screen; onOpen: (id: string) => void; eager: boolean; showApp: boolean; layout: Layout; paint: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  const caption = captionOf(s);
  // image may already be decoded from cache before hydration
  useEffect(() => { if (img.current?.complete) setLoaded(true); }, []);
  return (
    <article className={"group" + (paint ? "" : " [content-visibility:auto] " + (layout === "stack" ? "[contain-intrinsic-size:auto_1040px]" : "[contain-intrinsic-size:auto_480px]"))}>
      <button
        onClick={() => onOpen(s.id)}
        className="relative block w-full rounded-2xl bg-[#f7f7f8] p-5 text-left outline-none transition-colors duration-200 hover:bg-[#f2f2f3] focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-white/[0.045] dark:hover:bg-white/[0.07]"
        aria-label={`Open ${s.app} — ${s.screenType}`}
      >
        <div className="overflow-hidden rounded-lg bg-white dark:bg-neutral-950">
          <div className="relative aspect-[16/10] overflow-hidden bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={img}
              src={thumbUrl(s)}
              alt=""
              width={1280}
              height={800}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              decoding="async"
              onLoad={() => setLoaded(true)}
              className={"absolute top-0 left-0 h-full w-auto max-w-none transition-opacity duration-300 " + (loaded ? "opacity-100" : "opacity-0")}
            />
          </div>
        </div>
      </button>
      <div className="mt-3 flex items-start gap-2.5 px-0.5">
        {showApp && (
          <Link href={appHref(s.app)} prefetch={false} className="mt-0.5 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <AppAvatar name={s.app} size={22} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {showApp ? (
              <Link href={appHref(s.app)} prefetch={false} className="group/app min-w-0 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <span className="block truncate text-[15px] leading-5 font-medium tracking-tight group-hover/app:underline group-hover/app:underline-offset-4">{s.app}</span>
              </Link>
            ) : (
              <p className="min-w-0 truncate text-sm leading-5 font-semibold tracking-tight">{caption || s.screenType}</p>
            )}
            <span className="ml-auto inline-flex max-w-[46%] shrink-0 items-center truncate rounded-md bg-[#f7f7f8] px-2 py-1 text-[11px] font-medium leading-none text-neutral-500 ring-1 ring-black/[0.05] dark:bg-white/10 dark:text-neutral-300 dark:ring-white/10">
              {s.screenType}
            </span>
          </div>
          {showApp
            ? caption && (
                <Link href={appHref(s.app)} prefetch={false} className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <span className="mt-0.5 block truncate text-[13px] leading-5 font-normal text-muted-foreground">{caption}</span>
                </Link>
              )
            : s.tags.length > 0 && (
                <p className="mt-0.5 truncate text-[13px] leading-5 text-muted-foreground">{s.tags.slice(0, 4).join(" · ")}</p>
              )}
        </div>
      </div>
    </article>
  );
});
