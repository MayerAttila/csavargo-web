"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiOutlineCheck, HiOutlineClock, HiOutlineEnvelope, HiOutlineUserPlus } from "react-icons/hi2";
import { changeTripInvitation, getTripInviteOptions, sendTripInvitation } from "@/lib/trip-invitations-api";
import { notify } from "@/lib/notifications";

export function ManageTripInvitations({ slug, userId, onChanged }: { slug: string; userId: string; onChanged?: () => void }) {
  const [companionId, setCompanionId] = useState("");
  const client = useQueryClient();
  const key = ["trip-invite-options", userId, slug];
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => getTripInviteOptions(slug, signal), retry: false });
  const mutation = useMutation({
    mutationFn: ({ invite, id }: { invite: boolean; id: string }) => invite ? sendTripInvitation(slug, id) : changeTripInvitation(id, "remove"),
    onSuccess: (_, { invite }) => {
      if (invite) { setCompanionId(""); notify.success("A meghívást elküldtük."); }
      onChanged?.();
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
    meta: { silent: true },
  });
  const selection = query.data?.available.some(({ id }) => id === companionId) ? companionId : "";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selection && !mutation.isPending) mutation.mutate({ invite: true, id: selection });
  }

  if (query.isPending) return <p role="status">Meghívások betöltése…</p>;
  if (!query.data) return <div className="space-y-2">
    <p role="status">A meghívások betöltése nem sikerült.</p>
    <button type="button" onClick={() => void query.refetch()} className="text-brand underline">Újrapróbálás</button>
  </div>;

  const accepted = query.data.invitations.filter((entry) => entry.accepted).length;
  const pending = query.data.invitations.length - accepted;
  const hasAvailable = query.data.available.length > 0;
  return <div className="grid items-start gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
    {mutation.error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm md:col-span-2">{mutation.error.message}</p>}
    <form method="post" onSubmit={submit} className="min-w-0 space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="flex items-center gap-3 text-lg font-semibold">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand"><HiOutlineUserPlus aria-hidden="true" className="size-5" /></span>
        Meghívás küldése
      </h2>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-0 flex-[1_1_12rem] gap-1.5 text-sm font-medium">
          Útitárs
          <select value={selection} onChange={(event) => setCompanionId(event.target.value)} disabled={!hasAvailable || mutation.isPending}
            className="min-h-11 rounded-xl border border-border bg-background px-3 focus-visible:outline-2 focus-visible:outline-brand disabled:text-muted-foreground">
            <option value="">{hasAvailable ? "Válassz útitársat" : "Nincs meghívható útitárs"}</option>
            {query.data.available.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        {hasAvailable && <button type="submit" disabled={!selection || mutation.isPending}
          className="min-h-11 rounded-xl bg-action px-3 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">Meghívás küldése</button>}
      </div>
    </form>
    <section aria-label="Elküldött meghívások" className="min-w-0 space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="flex items-center gap-3 text-lg font-semibold">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand"><HiOutlineEnvelope aria-hidden="true" className="size-5" /></span>
        Elküldött meghívások
      </h2>
      {query.data.invitations.length ? <>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
          <span>{accepted} elfogadva</span><span aria-hidden="true">·</span><span>{pending} függőben</span>
        </div>
        <ul className="space-y-2">
        {query.data.invitations.map(({ id, name, accepted }) => <li key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/50 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/12 text-sm font-semibold text-brand">
              {name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("hu")).join("")}
            </span>
            <div className="min-w-0">
              <p className="wrap-break-word font-medium">{name}</p>
              <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${accepted
                ? "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300" : "bg-amber-500/15 text-amber-900 dark:text-amber-200"}`}>
                {accepted ? <HiOutlineCheck aria-hidden="true" className="size-3.5" /> : <HiOutlineClock aria-hidden="true" className="size-3.5" />}
                {accepted ? "Elfogadva" : "Válaszra vár"}
              </span>
            </div>
          </div>
          <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ invite: false, id })}
            aria-label={`${accepted ? "Hozzáférés visszavonása" : "Meghívás visszavonása"}: ${name}`}
            className="min-h-10 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">
            {accepted ? "Hozzáférés visszavonása" : "Meghívás visszavonása"}
          </button>
        </li>)}
        </ul>
      </> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Ehhez az utazáshoz még nincs meghívás.</p>}
    </section>
  </div>;
}
