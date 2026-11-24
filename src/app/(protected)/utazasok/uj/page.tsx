import type { Metadata } from "next";
import Link from "next/link";
import { PageContent } from "@/components/layout/page-content";
import { TripForm } from "@/components/trips/trip-form";
import { requireServerMe } from "@/lib/server-session";

export const metadata: Metadata = { title: "Új utazás" };

export default async function NewTripPage() {
  await requireServerMe();
  return <PageContent>
    <header>
      <Link href="/utazasok" prefetch={false} className="text-xs font-medium text-muted-foreground hover:text-brand hover:underline">Vissza az utazásokhoz</Link>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Új utazás</h1>
    </header>
    <TripForm />
  </PageContent>;
}
