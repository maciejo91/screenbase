import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><SearchXIcon /></EmptyMedia>
          <EmptyTitle>Nothing here</EmptyTitle>
          <EmptyDescription>That app or page isn&apos;t in your library.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button asChild size="sm"><Link href="/">Back to all screens</Link></Button></EmptyContent>
      </Empty>
    </div>
  );
}
