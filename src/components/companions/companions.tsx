"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiOutlineUserGroup, HiOutlineUserMinus, HiOutlineUserPlus } from "react-icons/hi2";
import { UserAvatar } from "@/components/auth/user-avatar";
import { Input } from "@/components/ui/input";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { getCompanions, inviteCompanion, updateCompanion } from "@/lib/companions-api";
import { notify } from "@/lib/notifications";
import { CompanionCard, companionMetrics, type AcceptedCompanion } from "./companion-card";

const sections = [
  { key: "incoming", title: "Beérkezett jelölések", empty: "Nincs beérkezett jelölésed." },
  { key: "outgoing", title: "Elküldött jelölések", empty: "Nincs függőben lévő elküldött jelölésed." },
] as const;
const buttonClass = "min-h-10 rounded-xl px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50";
const primaryClass = `${buttonClass} bg-action text-white hover:bg-action-hover`;
const dialogClass = "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-auto rounded-2xl border border-border bg-surface p-5 text-foreground shadow-xl backdrop:bg-black/50 sm:p-6";

export function Companions({ userId }: { userId: string }) {
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<AcceptedCompanion | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const inviteEmail = useRef<HTMLInputElement>(null);
  const details = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const detailsTitleId = useId();
  const errorId = useId();
  const client = useQueryClient();
  const queryKey = ["companions", userId];
  const list = useQuery({ queryKey, queryFn: ({ signal }) => getCompanions(signal), retry: false });
  const invite = useMutation({
    mutationFn: (address: string) => inviteCompanion({ email: address }),
    onSuccess: () => {
      setEmail("");
      dialog.current?.close();
      notify.success("A jelölés elküldve.");
      void client.invalidateQueries({ queryKey });
    },
    onError: () => { void client.invalidateQueries({ queryKey }); },
  });
  const update = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "remove" }) => updateCompanion(id, action),
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
  const busy = invite.isPending || update.isPending;

  function openInvite() {
    setEmail("");
    invite.reset();
    dialog.current?.showModal();
    inviteEmail.current?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!busy && email.trim()) invite.mutate(email.trim());
  }

  function act(id: string, action: "accept" | "remove") {
    if (!busy) update.mutate({ id, action }, { onError: (error) => notify.error(error.message) });
  }

  function openDetails(companion: AcceptedCompanion) {
    setSelected(companion);
    update.reset();
    details.current?.showModal();
  }

  function removeSelected() {
    if (!selected || busy) return;
    update.mutate({ id: selected.id, action: "remove" }, { onSuccess: () => {
      details.current?.close();
      addButton.current?.focus();
    } });
  }

  return <section className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Útitársak</h1>
      <button ref={addButton} type="button" aria-haspopup="dialog" onClick={openInvite}
        className={`inline-flex min-h-11 items-center justify-center gap-2 ${primaryClass}`}>
        <HiOutlineUserPlus aria-hidden="true" className="size-5" />
        Útitárs hozzáadása
      </button>
    </header>
    {list.isPending && <p role="status" className="text-sm text-muted-foreground">Útitársak betöltése…</p>}
    {list.isError && <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-4">
      <p role="status" className="text-sm">Az útitársak betöltése nem sikerült.</p>
      <button type="button" className={buttonClass} onClick={() => void list.refetch()}>Újrapróbálás</button>
    </div>}
    {list.data && <>
      <section aria-label="Útitársak">
        <h2 className="sr-only">Útitársak</h2>
        {list.data.accepted.length ? (
          <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {list.data.accepted.map((companion) => (
              <li key={companion.id} className="min-w-0">
                <CompanionCard variant="accepted" companion={companion} disabled={busy} onOpen={() => openDetails(companion)} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
              <HiOutlineUserGroup aria-hidden="true" className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">Még nincs elfogadott útitársad.</p>
          </div>
        )}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(({ key, title, empty }) => <section key={key} aria-label={title} className="min-w-0 space-y-2">
          <h2 className="font-semibold">{title}</h2>
          {list.data[key].length === 0 ? <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">{empty}</p>
            : <ul className="grid gap-2">
              {list.data[key].map((companion) => {
                const variant = key === "incoming"
                  ? { variant: key, onAccept: () => act(companion.id, "accept") } as const
                  : { variant: key } as const;
                return <li key={companion.id}>
                  <CompanionCard {...variant} companion={companion} disabled={busy} onRemove={() => act(companion.id, "remove")} />
                </li>;
              })}
            </ul>}
        </section>)}
      </div>
    </>}
    <dialog ref={dialog} aria-labelledby={titleId} onCancel={(event) => { if (invite.isPending) event.preventDefault(); }}
      className={dialogClass}>
      <header className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-xl font-bold">Útitárs hozzáadása</h2>
        <ModalCloseButton disabled={invite.isPending} onClose={() => dialog.current?.close()} />
      </header>
      <form method="post" onSubmit={submit} aria-busy={invite.isPending} className="mt-3 space-y-4">
        <Input ref={inviteEmail} type="email" name="companionEmail" autoComplete="off" label="Az ismerős regisztrációs e-mail-címe"
          value={email} onChange={(event) => { setEmail(event.target.value); if (invite.isError) invite.reset(); }}
          aria-invalid={invite.isError || undefined} aria-describedby={invite.isError ? errorId : undefined}
          maxLength={254} required disabled={invite.isPending} />
        {invite.isError && <p id={errorId} role="alert" className="text-sm text-red-700 dark:text-red-300">{invite.error.message}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <button type="submit" disabled={busy || !email.trim()} className={primaryClass}>
            {invite.isPending ? "Küldés…" : "Jelölés küldése"}
          </button>
        </div>
      </form>
    </dialog>
    <dialog ref={details} aria-labelledby={detailsTitleId} onClose={() => setSelected(null)}
      onCancel={(event) => { if (update.isPending) event.preventDefault(); }} className={dialogClass}>
      <header className="flex items-center justify-between gap-3">
        <h2 id={detailsTitleId} className="text-xl font-bold">Útitárs adatai</h2>
        <ModalCloseButton disabled={update.isPending} onClose={() => details.current?.close()} />
      </header>
      {selected && (
        <>
          <div className="mt-4 flex items-center gap-3">
            <UserAvatar name={selected.name} image={selected.image} className="size-16 rounded-full text-xl" />
            <p className="min-w-0 wrap-break-word text-lg font-semibold">{selected.name}</p>
          </div>
          <dl className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface-alt px-3">
            {companionMetrics.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <dt className="flex items-center gap-2 text-muted-foreground"><Icon aria-hidden="true" className="size-4 shrink-0 text-brand" /> {label}</dt>
                <dd className="font-semibold tabular-nums">{selected.stats[key]}</dd>
              </div>
            ))}
          </dl>
          {update.isError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{update.error.message}</p>}
        </>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
        {selected && <button type="button" disabled={busy} onClick={removeSelected}
          className={`inline-flex items-center gap-1.5 ${buttonClass} text-red-700 hover:bg-red-500/10 dark:text-red-300`}>
          <HiOutlineUserMinus aria-hidden="true" className="size-4" />
          {update.isPending ? "Eltávolítás…" : "Eltávolítás"}
        </button>}
      </div>
    </dialog>
  </section>;
}
