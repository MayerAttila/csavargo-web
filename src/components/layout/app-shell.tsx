"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./sidebar";
import { authClient } from "@/lib/auth-client";
import { authError } from "@/lib/auth-validation";
import { navigateAfterAuth } from "@/lib/auth-navigation";
import { notify } from "@/lib/notifications";
import { getMe, meKey, type Me } from "@/lib/api";

export function AppShell({ initialMe, children }: { initialMe: Me; children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, error } = useQuery({ queryKey: meKey, queryFn: getMe, initialData: initialMe, retry: false });
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (error?.message === "UNAUTHORIZED") { queryClient.clear(); navigateAfterAuth("/belepes"); }
  }, [error, queryClient]);
  useEffect(() => { void authClient.getSession(); }, []);
  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      const result = await authClient.signOut();
      if (result.error) { notify.error(authError(result.error, "logout"), { id: "logout" }); return; }
      queryClient.clear(); navigateAfterAuth("/belepes", "signed-out");
    } catch { notify.error("A kijelentkezés nem sikerült. Próbáld újra.", { id: "logout" }); }
    finally { setPending(false); }
  }
  return <div className="flex min-h-dvh flex-col gap-2 bg-background p-2 lg:h-dvh lg:flex-row lg:overflow-hidden">
    <a href="#main-content" className="sr-only rounded-lg bg-surface p-3 text-brand focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50">Ugrás a tartalomra</a>
    <Sidebar user={data.user} pending={pending} onLogout={() => void logout()} />
    <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 rounded-2xl px-2 py-5 outline-none sm:px-5 lg:overflow-y-auto lg:px-6 lg:py-6">
      {children}
    </main>
  </div>;
}
