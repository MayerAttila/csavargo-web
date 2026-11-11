import Link from "next/link";
export default async function Verification({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <section className="max-w-md space-y-5 rounded-2xl border border-border bg-surface p-8" role="status">
    <h1 className="text-2xl font-bold">{error ? "A megerősítés nem sikerült" : "E-mail-cím megerősítve"}</h1>
    <p>{error ? "A hivatkozás érvénytelen vagy lejárt. Az áttekintő oldalon kérhetsz új levelet." : "Köszönjük! Az e-mail-címedet sikeresen megerősítetted."}</p>
    <Link className="text-brand underline" href="/attekintes">Tovább az áttekintéshez</Link>
  </section>;
}
