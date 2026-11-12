"use client";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notifications";
import { authClient } from "@/lib/auth-client";
import { navigateAfterAuth } from "@/lib/auth-navigation";
import { registrationSchema, loginSchema, emailSchema, passwordSchema, authError } from "@/lib/auth-validation";
import { Field, buttonClass } from "./field";

type Mode = "login" | "register" | "forgot" | "reset";
const titles: Record<Mode, string> = {
  login: "Üdv újra!", register: "Kezdődjön a kaland!", forgot: "Elfelejtetted a jelszavad?", reset: "Új jelszó beállítása",
};
const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function AuthForm({ mode, token, invalidLink = false }: { mode: Mode; token?: string; invalidLink?: boolean }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  function showError(text: string) {
    notify.error(text, { id: "auth-form" });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated || pending) return;
    const data = new FormData(event.currentTarget);
    const values = { name: String(data.get("name") ?? ""), email: String(data.get("email") ?? "").trim(), password: String(data.get("password") ?? "") };
    const parsed = mode === "register" ? registrationSchema.safeParse(values) : mode === "login" ? loginSchema.safeParse(values)
      : mode === "forgot" ? emailSchema.safeParse(values.email) : passwordSchema.safeParse(values.password);
    setErrors({});
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? (mode === "forgot" ? "email" : "password")), issue.message])));
      showError(parsed.error.issues[0].message);
      return;
    }
    if (mode === "register" || mode === "reset") {
      if (values.password !== data.get("confirmPassword")) {
        setErrors({ confirmPassword: "A két jelszó nem egyezik." });
        showError("A két jelszó nem egyezik.");
        return;
      }
    }
    setPending(true);
    try {
      const result = mode === "register" ? await authClient.signUp.email({ ...values, name: values.name.trim(), callbackURL: "/attekintes" })
        : mode === "login" ? await authClient.signIn.email({ email: values.email, password: values.password })
        : mode === "forgot" ? await authClient.requestPasswordReset({ email: values.email, redirectTo: `${window.location.origin}/uj-jelszo` })
        : await authClient.resetPassword({ newPassword: values.password, token: token ?? "" });
      if (result.error) { showError(authError(result.error, mode)); return; }
      if (mode === "forgot") {
        const confirmation = "Ha ehhez az e-mail-címhez tartozik fiók, elküldtük a jelszó-visszaállító hivatkozást.";
        notify.success(confirmation, { id: "auth-form" });
      }
      else if (mode === "reset") {
        notify.success("Sikeresen megváltoztattad a jelszavadat. Jelentkezz be az új jelszóval.", { id: "auth-form" });
        router.replace("/belepes?jelszo=frissitve"); router.refresh();
      }
      else {
        const session = await authClient.getSession({ fetchOptions: { cache: "no-store" } });
        if (session.error) { showError(authError(session.error, "session")); return; }
        if (!session.data?.session) {
          showError(mode === "register"
            ? "A fiókod létrejött, de az automatikus bejelentkezés nem sikerült. Lépj be az e-mail-címeddel és jelszavaddal."
            : "Nem sikerült ellenőrizni a bejelentkezést. Próbálj belépni a fiókodba.");
          return;
        }
        navigateAfterAuth("/attekintes", mode === "register" ? "registered" : "signed-in");
      }
    } catch { showError("Nem sikerült kapcsolódni. Ellenőrizd az internetkapcsolatodat, majd próbáld újra."); }
    finally { setPending(false); }
  }
  return <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
    <h1 className="text-2xl font-bold">{titles[mode]}</h1>
    <p className="mb-6 mt-2 text-sm text-muted-foreground">A következő közös élmény itt kezdődik.</p>
    {invalidLink || (mode === "reset" && !token) ? <div role="alert" className="space-y-4"><p>A hivatkozás érvénytelen vagy lejárt.</p><Link className="text-brand underline" href="/elfelejtett-jelszo">Új hivatkozás kérése</Link></div> : <form method="post" onSubmit={submit} noValidate className="space-y-4" aria-busy={!hydrated || pending}>
      <fieldset disabled={!hydrated || pending} className="space-y-4">
      {mode === "register" && <Field id="name" name="name" label="Név" autoComplete="name" required maxLength={100} error={errors.name} />}
      {mode !== "reset" && <Field id="email" name="email" label="E-mail-cím" type="email" autoComplete="email" required error={errors.email} />}
      {mode !== "forgot" && <Field id="password" name="password" label="Jelszó" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required maxLength={128} error={errors.password} />}
      {(mode === "register" || mode === "reset") && <Field id="confirmPassword" name="confirmPassword" label="Jelszó megerősítése" type="password" autoComplete="new-password" required maxLength={128} error={errors.confirmPassword} />}
      <button className={`${buttonClass} w-full`} type="submit" disabled={!hydrated || pending}>{!hydrated ? "Űrlap betöltése…" : pending ? "Folyamatban…" : mode === "login" ? "Belépés" : mode === "register" ? "Regisztráció" : mode === "forgot" ? "Hivatkozás küldése" : "Jelszó mentése"}</button>
      </fieldset>
      <noscript><p role="alert" className="text-sm text-muted-foreground">Az űrlap használatához engedélyezd a JavaScriptet a böngésződben.</p></noscript>
    </form>}
    <nav aria-label="Fiókműveletek" className="mt-6 flex flex-col gap-3 text-sm">
      {mode === "login" && <><Link className="text-brand hover:underline" href="/elfelejtett-jelszo">Elfelejtettem a jelszavam</Link><Link className="text-brand hover:underline" href="/regisztracio">Még nincs fiókom – Regisztráció</Link></>}
      {mode !== "login" && <Link className="text-brand hover:underline" href="/belepes">Vissza a belépéshez</Link>}
    </nav>
  </div>;
}
