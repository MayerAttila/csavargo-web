"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeTripInvitation, listTripInvitations } from "@/lib/trip-invitations-api";
import { notify } from "@/lib/notifications";
import { calendarDay, tripDateLabel } from "./trip-calendar";
import { TripCard, tripStatus } from "./trip-card";

const actionClass = "inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50";

export function TripInvitationsInbox({ userId, today }: { userId: string; today: string }) {
  const client = useQueryClient();
  const key = ["trip-invitations", userId];
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => listTripInvitations(signal), retry: false });
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "remove" }) => changeTripInvitation(id, action),
    onError: (error) => notify.error(error.message),
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });

  if (query.isError) return <p role="status" className="text-sm text-muted-foreground">
    A meghívások betöltése nem sikerült. <button type="button" onClick={() => void query.refetch()} className="text-brand underline">Újrapróbálás</button>
  </p>;
  const invitations = query.data;
  if (!invitations?.length) return null;

  const pending = invitations.filter(({ accepted }) => !accepted);
  const shared = invitations.filter(({ accepted }) => accepted);

  return <div className="space-y-5">
    {pending.length > 0 && <section aria-label="Beérkezett utazási meghívások" className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-semibold">Beérkezett utazási meghívások</h2>
        <ul className="mt-2 divide-y divide-border">
          {pending.map(({ id, name, owner, destination, start, end }) => <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0 wrap-break-word">
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{owner} · {destination}</p>
              <p className="text-xs text-muted-foreground">{tripDateLabel(calendarDay(start), true)}
                {start !== end && ` – ${tripDateLabel(calendarDay(end), true)}`}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id, action: "accept" })}
                className={`${actionClass} bg-action text-white hover:bg-action-hover`}>Elfogadás</button>
              <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id, action: "remove" })}
                className={`${actionClass} text-muted-foreground hover:bg-surface-alt`}>Elutasítás</button>
            </div>
          </li>)}
        </ul>
    </section>}
    {shared.length > 0 && <section aria-label="Velem megosztott utazások" className="space-y-3">
      <h2 className="text-lg font-semibold">Velem megosztott utazások</h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 min-[1420px]:grid-cols-4 xl:gap-5">
        {shared.map((trip) => <li key={trip.id} className="min-w-0">
          <TripCard trip={trip} sharedId={trip.id} owner={trip.owner} status={tripStatus(trip, today)}
            inProgress={trip.start <= today && today <= trip.end}
            footer={<div className="relative z-10 flex justify-end border-t border-border/70 px-3 py-1">
              <button type="button" aria-label={`Kilépés innen: ${trip.name}`} disabled={mutation.isPending}
                onClick={() => mutation.mutate({ id: trip.id, action: "remove" })}
                className={`${actionClass} text-muted-foreground hover:bg-surface-alt`}>Kilépés</button>
            </div>} />
        </li>)}
      </ul>
    </section>}
  </div>;
}
