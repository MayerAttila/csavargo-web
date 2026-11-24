"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getMe, meKey, type Me } from "@/lib/api";
import { ResendVerificationButton } from "./resend-verification-button";

export function Dashboard({ initialMe }: { initialMe: Me }) {
  const { data } = useQuery({ queryKey: meKey, queryFn: getMe, initialData: initialMe, retry: false });
  return <section className="mx-auto w-full max-w-5xl space-y-6">
    <div><p className="font-semibold text-accent">Áttekintés</p><h1 className="mt-2 text-3xl font-bold">Szia, {data.user.name}!</h1><p className="mt-3 text-muted-foreground">{data.user.email}</p></div>
      {!data.user.emailVerified ? <aside className="space-y-3 rounded-2xl border border-border bg-surface p-6"><h2 className="font-semibold">Erősítsd meg az e-mail-címedet</h2><p className="text-sm text-muted-foreground">A fiókodat már használhatod. A megerősítéshez kattints a levélben kapott hivatkozásra.</p><ResendVerificationButton email={data.user.email} notificationId="auth-dashboard" /></aside> : <p className="text-accent">E-mail-cím megerősítve</p>}
      <section className="space-y-3 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold">Tervezd meg a következő kirándulásod</h2>
        <Link href="/utazasok" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Kirándulás tervezése</Link>
      </section>
  </section>;
}
