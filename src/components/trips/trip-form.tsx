"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MapPoint } from "@/components/maps/types";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { createTrip, saveTripPlan, type SavedTripPlan } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { calendarDay, type TripDateInputs } from "./trip-calendar";
import { TripDateFields } from "./trip-date-fields";
import { TripDestination } from "./trip-destination";
import { restorePoint, storedPoint } from "./trip-point";

export function TripForm({ trip }: { trip?: SavedTripPlan }) {
  const router = useRouter();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const requestId = useRef<string | null>(null);
  const confirmation = useRef<HTMLDialogElement>(null);
  const confirmationTitle = useId();
  const confirmationDescription = useId();
  const [name, setName] = useState(trip?.name ?? "");
  const [destination, setDestination] = useState<MapPoint | undefined>(() => trip ? restorePoint(trip.plan.destination) : undefined);
  const [dates, setDates] = useState<TripDateInputs>({ start: trip?.plan.start ?? "", end: trip?.plan.end ?? "" });
  const [saving, setSaving] = useState(false);

  async function submit(confirmed = false) {
    if (saving) return;
    if (!destination) {
      notify.error("Válassz úti célt a keresőben.");
      return;
    }
    const start = calendarDay(dates.start);
    const end = calendarDay(dates.end);
    if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
      notify.error("Adj meg érvényes kezdő és záró dátumot. A záró dátum nem lehet korábbi.");
      return;
    }
    const destinationToSave = storedPoint(destination);
    const nameToSave = name.trim();
    if (trip && !nameToSave) {
      notify.error("Add meg az utazás nevét.");
      return;
    }
    const days = trip?.plan.days.filter(({ date }) => dates.start <= date && date <= dates.end) ?? [];
    if (trip && days.length < trip.plan.days.length && !confirmed) {
      confirmation.current?.showModal();
      return;
    }
    setSaving(true);
    try {
      if (trip) {
        await saveTripPlan(trip.slug, { ...trip.plan, destination: destinationToSave, ...dates, days }, trip.version, nameToSave);
        router.replace("/utazasok");
        router.refresh();
      } else {
        requestId.current ??= crypto.randomUUID();
        const created = await createTrip({ id: requestId.current, name: nameToSave || undefined, destination: destinationToSave, ...dates });
        router.replace(`/utazasok/${encodeURIComponent(created.slug)}`);
      }
    } catch (error) {
      setSaving(false);
      notify.error(error instanceof Error && error.message === "TRIP_CONFLICT"
        ? "Az utazást időközben máshol módosították. A szerkesztett adatok ezen az oldalon maradtak."
        : trip ? "Az utazás mentése nem sikerült. Próbáld újra." : "Az utazás létrehozása nem sikerült. Próbáld újra.");
    }
  }

  return <>
    <form onSubmit={(event) => { event.preventDefault(); void submit(); }} noValidate className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm sm:p-6">
      <fieldset disabled={saving} className="grid min-w-0 gap-4">
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          {trip ? "Utazás neve" : "Utazás neve (opcionális)"}
          <input value={name} maxLength={200} onChange={(event) => { requestId.current = null; setName(event.target.value); }}
            className="h-11 rounded-xl border border-border/80 bg-background/70 px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-brand" />
        </label>
        <TripDestination token={token} destination={destination}
          onChange={(point) => { requestId.current = null; setDestination(point); }} />
        <div className="grid grid-cols-2 gap-3">
          <TripDateFields dates={dates} onDates={(value) => { requestId.current = null; setDates(value); }} />
        </div>
        <button type="submit" className="min-h-11 justify-self-start rounded-xl bg-action px-4 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50">
          {saving ? "Folyamatban…" : trip ? "Módosítások mentése" : "Utazás létrehozása"}
        </button>
      </fieldset>
    </form>
    {trip && <dialog ref={confirmation} aria-labelledby={confirmationTitle} aria-describedby={confirmationDescription}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-auto rounded-2xl border border-border bg-surface p-5 text-foreground shadow-xl backdrop:bg-black/50 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h2 id={confirmationTitle} className="text-xl font-bold">Utazási időszak módosítása</h2>
        <ModalCloseButton onClose={() => confirmation.current?.close()} />
      </header>
      <p id={confirmationDescription} className="mt-3 text-sm text-muted-foreground">Az új időszakon kívül eső napok programjai törlődnek.</p>
      <div className="mt-5 flex justify-end border-t border-border pt-4">
        <button type="button" onClick={() => { confirmation.current?.close(); void submit(true); }}
          className="min-h-11 rounded-xl bg-action px-4 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          Mentés és törlés
        </button>
      </div>
    </dialog>}
  </>;
}
