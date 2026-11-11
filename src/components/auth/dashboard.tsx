"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notifications";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { navigateAfterAuth } from "@/lib/auth-navigation";
import { authError } from "@/lib/auth-validation";
import { getMe, meKey, type Me } from "@/lib/api";
import { buttonClass } from "./field";

export function Dashboard({ initialMe }: { initialMe: Me }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, error } = useQuery({ queryKey: meKey, queryFn: getMe, initialData: initialMe, retry: false });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  function showError(text: string) {
    setMessage(text);
    notify.error(text, { id: "auth-dashboard" });
  }
  useEffect(() => {
    if (error?.message === "UNAUTHORIZED") { queryClient.clear(); router.replace("/belepes"); router.refresh(); }
  }, [error, queryClient, router]);
  // Browser requests receive renewal cookies, which cannot be written by a Server Component.
  useEffect(() => { void authClient.getSession(); }, []);
  async function logout() {
    setPending(true); setMessage("");
    try {
      const result = await authClient.signOut();
      if (result.error) { showError(authError(result.error, "logout")); return; }
      queryClient.clear(); navigateAfterAuth("/belepes", "signed-out");
    } catch { showError("A kijelentkezés nem sikerült. Próbáld újra."); }
    finally { setPending(false); }
  }
  async function resend() {
    setPending(true); setMessage("");
    try {
      const result = await authClient.sendVerificationEmail({ email: data.user.email, callbackURL: "/email-megerosites" });
      if (result.error) { showError(authError(result.error, "verification")); return; }
      setMessage("Kértük a megerősítő levél elküldését. Ellenőrizd a beérkező leveleket és a levélszemét mappát; ha nem érkezik meg, később kérj újat.");
      notify.success("Kértük a megerősítő levél újraküldését.", { id: "auth-dashboard" });
    } catch { showError("A levél küldése nem sikerült. Próbáld újra később."); }
    finally { setPending(false); }
  }
  return <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:px-8">
    <header className="flex items-center justify-between gap-4"><Link href="/" className="text-2xl font-bold text-brand">csavargó.</Link><button className={buttonClass} disabled={pending} onClick={logout}>Kijelentkezés</button></header>
    <section className="mt-12 space-y-6"><div><p className="font-semibold text-accent">Áttekintés</p><h1 className="mt-2 text-3xl font-bold">Szia, {data.user.name}!</h1><p className="mt-3 text-muted-foreground">{data.user.email}</p></div>
      {!data.user.emailVerified ? <aside className="space-y-3 rounded-2xl border border-border bg-surface p-6"><h2 className="font-semibold">Erősítsd meg az e-mail-címedet</h2><p className="text-sm text-muted-foreground">A fiókodat már használhatod. A megerősítéshez kattints a levélben kapott hivatkozásra.</p><button className={buttonClass} disabled={pending} onClick={resend}>Megerősítő levél újraküldése</button></aside> : <p className="text-accent">E-mail-cím megerősítve</p>}
      {message && <p role="status">{message}</p>}
      {error && error.message !== "UNAUTHORIZED" && <p role="alert">Az adatok frissítése nem sikerült. Próbáld újra később.</p>}
      <section className="rounded-2xl border border-border bg-surface p-6"><h2 className="text-xl font-semibold">Itt kezdődik a következő kalandod</h2><p className="mt-2 text-muted-foreground">Az utazástervezés hamarosan elérhető lesz.</p></section>
    </section>
  </main>;
}
