"use client";
import { useState } from "react";
import { notify } from "@/lib/notifications";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { authError } from "@/lib/auth-validation";
import { getMe, meKey, type Me } from "@/lib/api";
import { buttonClass } from "./field";

export function Dashboard({ initialMe }: { initialMe: Me }) {
  const { data } = useQuery({ queryKey: meKey, queryFn: getMe, initialData: initialMe, retry: false });
  const [pending, setPending] = useState(false);
  function showError(text: string) {
    notify.error(text, { id: "auth-dashboard" });
  }
  async function resend() {
    setPending(true);
    try {
      const result = await authClient.sendVerificationEmail({ email: data.user.email, callbackURL: "/email-megerosites" });
      if (result.error) { showError(authError(result.error, "verification")); return; }
      notify.success("Kértük a megerősítő levél újraküldését.", { id: "auth-dashboard" });
    } catch { showError("A levél küldése nem sikerült. Próbáld újra később."); }
    finally { setPending(false); }
  }
  return <section className="mx-auto w-full max-w-5xl space-y-6">
    <div><p className="font-semibold text-accent">Áttekintés</p><h1 className="mt-2 text-3xl font-bold">Szia, {data.user.name}!</h1><p className="mt-3 text-muted-foreground">{data.user.email}</p></div>
      {!data.user.emailVerified ? <aside className="space-y-3 rounded-2xl border border-border bg-surface p-6"><h2 className="font-semibold">Erősítsd meg az e-mail-címedet</h2><p className="text-sm text-muted-foreground">A fiókodat már használhatod. A megerősítéshez kattints a levélben kapott hivatkozásra.</p><button className={buttonClass} disabled={pending} onClick={resend}>Megerősítő levél újraküldése</button></aside> : <p className="text-accent">E-mail-cím megerősítve</p>}
      <section className="rounded-2xl border border-border bg-surface p-6"><h2 className="text-xl font-semibold">Itt kezdődik a következő kalandod</h2><p className="mt-2 text-muted-foreground">Az utazástervezés hamarosan elérhető lesz.</p></section>
  </section>;
}
