"use client";
export default function OverviewError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-lg space-y-5 px-5 py-20"><h1 className="text-2xl font-bold">Az oldal most nem érhető el</h1><p>Nem sikerült kapcsolódni a szerverhez. Próbáld újra később.</p><button onClick={reset} className="rounded-xl bg-action px-5 py-3 text-white">Újrapróbálás</button></main>;
}
