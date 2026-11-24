import Link from "next/link";
export default async function Verification({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <section className="w-full space-y-5" role="status">
    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{error ? "A megerősítés nem sikerült" : "E-mail-cím megerősítve"}</h1>
    <p className="max-w-prose">{error ? "A hivatkozás érvénytelen vagy lejárt. Az áttekintő oldalon kérhetsz új levelet." : "Köszönjük! Az e-mail-címedet sikeresen megerősítetted."}</p>
    <Link className="text-brand underline" href="/attekintes">Tovább az áttekintéshez</Link>
  </section>;
}
