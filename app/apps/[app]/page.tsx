import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Library from "@/components/Library";
import { byOldest, readScreens } from "@/lib/store";
import { parseView } from "@/lib/url";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ app: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `${decodeURIComponent((await params).app)} — Screenbase` };
}

export default async function AppPage({ params, searchParams }: Props) {
  const [{ app: raw }, sp, all] = await Promise.all([params, searchParams, readScreens()]);
  const app = decodeURIComponent(raw);
  const screens = all.filter((s) => s.app === app).sort(byOldest);
  if (!screens.length) notFound();
  const allApps = [...new Set(all.map((s) => s.app))].sort();
  return <Library key={app} initialScreens={screens} initialView={parseView(sp)} lockedApp={app} allApps={allApps} />;
}
