import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col px-5 py-8"><Link href="/" className="mx-auto text-2xl font-bold text-brand">csavargó.</Link><div className="flex flex-1 items-center justify-center py-10">{children}</div></main>;
}
