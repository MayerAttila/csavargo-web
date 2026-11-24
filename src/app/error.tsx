"use client";
import { useEffect } from "react";
import { PageContent, pageGutters } from "@/components/layout/page-content";
import { notify } from "@/lib/notifications";
export default function OverviewError({ reset }: { reset: () => void }) {
  useEffect(() => {
    notify.error("Az oldal betöltése nem sikerült. Próbáld újra később.", { id: "page-error" });
  }, []);
  return <main className={`min-h-dvh ${pageGutters}`}>
    <PageContent>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Az oldal most nem érhető el</h1>
      <p className="max-w-prose">Nem sikerült kapcsolódni a szerverhez. Próbáld újra később.</p>
      <button type="button" onClick={reset} className="rounded-xl bg-action px-5 py-3 text-white">Újrapróbálás</button>
    </PageContent>
  </main>;
}
