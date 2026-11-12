import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col px-5 py-8"><Brand className="mx-auto" /><div className="flex flex-1 items-center justify-center py-10">{children}</div></main>;
}
