import { HiOutlineMap, HiOutlineCalendarDays, HiOutlineUsers } from "react-icons/hi2";
import Link from "next/link";

const features = [
  { title: "Útiterv", description: "Tervezd meg az utazásod napokra bontva.", icon: HiOutlineCalendarDays },
  { title: "Térkép", description: "Mentsd el a kedvenc helyeidet.", icon: HiOutlineMap },
  { title: "Útitársak", description: "Szervezzetek együtt, egy helyen.", icon: HiOutlineUsers },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <span className="text-2xl font-bold tracking-tight"><span className="text-brand">csavargó</span>.</span>
        <nav aria-label="Fiók" className="flex items-center gap-3 text-sm font-semibold"><Link href="/belepes" className="px-2 py-3 text-foreground hover:text-brand">Belépés</Link><Link href="/regisztracio" className="rounded-xl bg-action px-4 py-3 text-white hover:bg-action-hover">Regisztráció</Link></nav>
      </header>
      <section className="flex flex-1 flex-col justify-center gap-6 py-20">
        <div className="max-w-2xl space-y-4">
          <p className="font-semibold text-accent">Az élmények már a tervezésnél kezdődnek</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Merre csavargunk legközelebb?</h1>
          <p className="text-lg text-muted-foreground">Utazások, programok és közös élmények – minden egy helyen.</p>
        </div>
        <div className="grid gap-4 pt-8 md:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <Icon className="mb-5 size-7 text-brand" aria-hidden />
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
