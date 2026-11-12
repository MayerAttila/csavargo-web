import Image from "next/image";
import Link from "next/link";

export function Brand({ className = "", compactOnMobile = false, href = "/" }: { className?: string; compactOnMobile?: boolean; href?: string }) {
  return <Link href={href} aria-label="Csavargó – Főoldal"
    className={`inline-flex shrink-0 items-center gap-1.5 text-lg font-bold tracking-tight text-brand sm:text-xl ${className}`}>
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden sm:size-9">
      <Image src="/images/csavargo-logo.png" alt="" width={1254} height={1254}
        sizes="(min-width: 640px) 54px, 48px" loading="eager"
        className="size-12 max-w-none shrink-0 object-contain sm:size-13.5" />
    </span>
    <span className={compactOnMobile ? "hidden sm:inline" : undefined}>csavargó.</span>
  </Link>;
}
