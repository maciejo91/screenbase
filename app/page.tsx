import Library from "@/components/Library";
import { byNewest, readScreens } from "@/lib/store";
import { parseView } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [screens, sp] = await Promise.all([readScreens(), searchParams]);
  return <Library initialScreens={screens.sort(byNewest)} initialView={parseView(sp)} />;
}
