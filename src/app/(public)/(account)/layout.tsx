import Image from "next/image";
import Link from "next/link";
import { HiArrowLeft } from "react-icons/hi2";
import { Brand } from "@/components/brand";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] bg-surface md:grid-cols-2 md:grid-rows-1">
      <div className="relative isolate flex min-h-32 flex-col justify-between overflow-hidden bg-foreground p-4 sm:min-h-40 md:p-8">
        {/* Palawan Islands by Jared Rice, Unsplash License: https://unsplash.com/photos/qzgmZKsyVsQ */}
        <Image src="/images/account-palawan.webp" alt="" fill preload sizes="(min-width: 768px) max(50vw, 134vh), 100vw" className="-z-20 -scale-x-100 object-cover object-[center_57%] md:object-[66%_center]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-black/60 via-transparent to-black/60" />
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-black/35 px-3 text-xs font-medium text-white transition hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <HiArrowLeft className="size-3.5" aria-hidden="true" /> Vissza a főoldalra
          </Link>
          <Brand className="text-white" />
        </header>
        <p className="mx-auto hidden max-w-sm pb-10 pt-16 text-center text-2xl leading-tight font-medium tracking-tight text-white md:block lg:text-3xl">
          A következő közös élmény itt kezdődik.
        </p>
      </div>
      <div className="flex items-start justify-center px-6 py-10 sm:px-10 md:items-center md:py-14">{children}</div>
    </main>
  );
}
