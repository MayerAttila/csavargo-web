"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiOutlineUserPlus } from "react-icons/hi2";
import { Input } from "@/components/ui/input";
import { getCompanions, inviteCompanion, updateCompanion } from "@/lib/companions-api";
import { notify } from "@/lib/notifications";

const sections = [
  { key: "accepted", title: "Útitársak", empty: "Még nincs elfogadott útitársad.", remove: "Eltávolítás" },
  { key: "incoming", title: "Beérkezett jelölések", empty: "Nincs beérkezett jelölésed.", remove: "Elutasítás" },
  { key: "outgoing", title: "Elküldött jelölések", empty: "Nincs függőben lévő elküldött jelölésed.", remove: "Visszavonás" },
] as const;
const buttonClass = "min-h-10 rounded-xl px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50";
const primaryClass = `${buttonClass} bg-action text-white hover:bg-action-hover`;

export function Companions({ userId }: { userId: string }) {
  const [email, setEmail] = useState("");
  const client = useQueryClient();
  const queryKey = ["companions", userId];
  const list = useQuery({ queryKey, queryFn: ({ signal }) => getCompanions(signal), retry: false });
  const invite = useMutation({
    mutationFn: (address: string) => inviteCompanion({ email: address }),
    onSuccess: () => { setEmail(""); notify.success("A jelölés elküldve."); },
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
  const update = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "remove" }) => updateCompanion(id, action),
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
  const busy = invite.isPending || update.isPending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!busy) invite.mutate(email.trim(), { onError: (error) => notify.error(error.message) });
  }

  function act(id: string, action: "accept" | "remove") {
    if (!busy) update.mutate({ id, action }, { onError: (error) => notify.error(error.message) });
  }

  return <section className="mx-auto max-w-5xl space-y-6">
    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Útitársak</h1>
    <form method="post" onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Útitárs jelölése</h2>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-[1_1_16rem]">
          <Input type="email" name="companionEmail" autoComplete="off" label="Az ismerős regisztrációs e-mail-címe"
            value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required disabled={busy} />
        </div>
        <button type="submit" disabled={busy || !email.trim()} className={`flex items-center gap-2 ${primaryClass}`}>
          <HiOutlineUserPlus aria-hidden="true" className="size-5" /> Jelölés küldése
        </button>
      </div>
    </form>
    {list.isPending && <p role="status" className="text-sm text-muted-foreground">Útitársak betöltése…</p>}
    {list.isError && <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-4">
      <p role="status" className="text-sm">Az útitársak betöltése nem sikerült.</p>
      <button type="button" className={buttonClass} onClick={() => void list.refetch()}>Újrapróbálás</button>
    </div>}
    {list.data && <div className="grid gap-4 md:grid-cols-2">
      {sections.map(({ key, title, empty, remove }) => <section key={key} aria-label={title}
        className={`min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5 ${key === "accepted" ? "md:col-span-2" : ""}`}>
        <h2 className="text-lg font-semibold">{title}</h2>
        {list.data[key].length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
          : <ul className="mt-2 divide-y divide-border">
            {list.data[key].map(({ id, name }) => <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0 wrap-break-word font-medium">{name}</span>
              <div className="flex flex-wrap gap-1">
                {key === "incoming" && <button type="button" disabled={busy} aria-label={`Elfogadás: ${name}`}
                  onClick={() => act(id, "accept")} className={primaryClass}>Elfogadás</button>}
                <button type="button" disabled={busy} aria-label={`${remove}: ${name}`}
                  onClick={() => act(id, "remove")} className={`${buttonClass} text-muted-foreground hover:bg-surface-alt hover:text-foreground`}>{remove}</button>
              </div>
            </li>)}
          </ul>}
      </section>)}
    </div>}
  </section>;
}
