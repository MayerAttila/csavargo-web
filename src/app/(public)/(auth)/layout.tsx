import { Brand } from "@/components/brand";
import { pageGutters } from "@/components/layout/page-content";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className={`flex min-h-dvh w-full flex-col bg-surface ${pageGutters}`}>
    <header><Brand /></header>
    <div className="w-full border-t border-border/70 py-8 sm:py-12">{children}</div>
  </main>;
}
