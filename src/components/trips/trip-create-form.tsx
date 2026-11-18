"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { MapPoint } from "@/components/maps/types";
import { createTrip } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { calendarDay, type TripDateInputs } from "./trip-calendar";
import { TripDateFields } from "./trip-date-fields";
import { TripDestination } from "./trip-destination";
import { storedPoint } from "./trip-point";

export function TripCreateForm() {
  const router = useRouter();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const requestId = useRef<string | null>(null);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState<MapPoint>();
  const [dates, setDates] = useState<TripDateInputs>({ start: "", end: "" });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    requestId.current ??= crypto.randomUUID();
    setSaving(true);
    try {
      const trip = await createTrip({ id: requestId.current, name: name.trim() || undefined,
        destination: storedPoint(destination), start: dates.start, end: dates.end });
      router.replace(`/utazasok/${encodeURIComponent(trip.slug)}`);
    } catch {
      setSaving(false);
      notify.error("Az utazás létrehozása nem sikerült. Próbáld újra.");
    }
  }

  return <form onSubmit={submit} noValidate className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm sm:p-6">
    <fieldset disabled={saving} className="grid min-w-0 gap-4">
      <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
        Utazás neve (opcionális)
        <input value={name} maxLength={200} onChange={(event) => { requestId.current = null; setName(event.target.value); }}
          className="h-11 rounded-xl border border-border/80 bg-background/70 px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-brand" />
      </label>
      <TripDestination token={token} destination={destination}
        onChange={(point) => { requestId.current = null; setDestination(point); }} />
      <div className="grid grid-cols-2 gap-3">
        <TripDateFields dates={dates} onDates={(value) => { requestId.current = null; setDates(value); }} />
      </div>
      <button type="submit" className="min-h-11 justify-self-start rounded-xl bg-action px-4 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50">
        {saving ? "Létrehozás folyamatban…" : "Utazás létrehozása"}
      </button>
    </fieldset>
  </form>;
}
