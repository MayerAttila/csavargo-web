"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { sameMapPlace } from "@/components/maps/map-poi";
import type { MapCameraCommand, MapPoint } from "@/components/maps/types";
import { getTripPlan, saveTripPlan, type SavedTripPlan, type TripPlan } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { calendarDay, dateInputValue } from "./trip-calendar";
import { TripAgenda } from "./trip-agenda";
import { TripLodging } from "./trip-lodging";
import { TripPlaceWorkspace } from "./trip-place-workspace";
import { restorePoint, storedPoint } from "./trip-point";
import { useTripPlaceInfo } from "./use-trip-place-info";

const emptyDay: MapPoint[] = [];
function restoreDays(plan?: TripPlan) {
  return Object.fromEntries((plan?.days ?? []).map(({ date, stops }) => [calendarDay(date), stops.map(restorePoint)]));
}

type TripSnapshot = Pick<SavedTripPlan, "name" | "plan"> & { version?: number };
type Props = { slug: string; initialSaved?: SavedTripPlan | null; sharedBy?: never }
  | { slug?: never; initialSaved: TripSnapshot; sharedBy: string };

export function TripPlanner({ slug, initialSaved = null, sharedBy }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const restored = initialSaved?.plan;
  const [saved, setSaved] = useState<TripSnapshot | null>(initialSaved);
  const readOnly = sharedBy !== undefined;
  const destination = saved ? restorePoint(saved.plan.destination) : undefined;
  const range = saved ? { start: calendarDay(saved.plan.start), end: calendarDay(saved.plan.end) } : undefined;
  const [lodging, setLodging] = useState<MapPoint | undefined>(() => restored?.lodging ? restorePoint(restored.lodging) : undefined);
  const [pickingLodging, setPickingLodging] = useState(false);
  const [placeView, setPlaceView] = useState<"map" | "list">("map");
  const placeWorkspace = useRef<HTMLDivElement>(null);
  const [activeDay, setActiveDay] = useState<number | undefined>(() => restored ? calendarDay(restored.start) : undefined);
  const [days, setDays] = useState<Partial<Record<number, MapPoint[]>>>(() => restoreDays(restored));
  const [candidate, setCandidate] = useState<MapPoint>();
  const getPlaceInfo = useTripPlaceInfo(candidate, token);
  const [camera, setCamera] = useState<MapCameraCommand | undefined>(() => {
    if (!destination || !range) return undefined;
    const firstDay = days[range.start];
    return firstDay?.length
      ? { type: "fit", coordinates: firstDay.map(({ coordinates }) => coordinates) }
      : { type: "view", view: { center: destination.coordinates, zoom: 11 } };
  });
  const [saving, setSaving] = useState(false);
  const places = activeDay === undefined ? emptyDay : days[activeDay] ?? emptyDay;
  const existing = candidate ? places.find((place) => sameMapPlace(place, candidate)) : undefined;
  const plan: TripPlan | null = saved ? {
    ...saved.plan,
    lodging: lodging ? storedPoint(lodging) : undefined,
    days: Object.entries(days).sort(([a], [b]) => Number(a) - Number(b)).flatMap(([day, stops]) => stops?.length
      ? [{ date: dateInputValue(Number(day)), stops: stops.map(storedPoint) }] : []),
  } : null;
  const hasChanges = JSON.stringify(plan?.lodging) !== JSON.stringify(saved?.plan.lodging)
    || JSON.stringify(plan?.days) !== JSON.stringify(saved?.plan.days);

  async function save() {
    if (!slug || readOnly || saving || (saved && !hasChanges)) return;
    setSaving(true);
    try {
      if (saved?.version !== undefined && plan) {
        setSaved(await saveTripPlan(slug, plan, saved.version, saved.name));
        notify.success("A tervet elmentettük a fiókodba.", { id: "trip-save" });
      } else {
        const loaded = await getTripPlan(slug);
        const { lodging: savedLodging, start } = loaded.plan;
        const startDay = calendarDay(start);
        const restoredDays = restoreDays(loaded.plan);
        setLodging(savedLodging ? restorePoint(savedLodging) : undefined);
        setActiveDay(startDay);
        setDays(restoredDays);
        setCamera(restoredDays[startDay]?.length
          ? { type: "fit", coordinates: restoredDays[startDay].map(({ coordinates }) => coordinates) }
          : { type: "view", view: { center: restorePoint(loaded.plan.destination).coordinates, zoom: 11 } });
        setSaved(loaded);
      }
    } catch (error) {
      notify.error(error instanceof Error && error.message === "TRIP_CONFLICT"
        ? "A tervet időközben máshol módosították. A módosításaid ezen az oldalon maradtak."
        : saved ? "A mentés nem sikerült. Próbáld újra." : "A terv betöltése nem sikerült. Próbáld újra.", { id: "trip-save" });
    } finally {
      setSaving(false);
    }
  }

  function choosePlace(point: MapPoint) {
    if (!saved) return;
    const selected = places.find((place) => sameMapPlace(place, point)) ?? point;
    setCandidate(selected);
    setCamera({ type: "view", view: { center: selected.coordinates, zoom: 15 } });
  }

  function changeLodging(point?: MapPoint) {
    setLodging(point);
    setPickingLodging(false);
  }

  function toggleLodgingMapPick() {
    if (readOnly) {
      if (lodging) {
        setPlaceView("map");
        setCamera({ type: "view", view: { center: lodging.coordinates, zoom: 15 } });
        placeWorkspace.current?.scrollIntoView?.({ block: "nearest" });
      }
      return;
    }
    setPickingLodging(!pickingLodging);
    if (!pickingLodging) {
      setPlaceView("map");
      if (lodging) setCamera({ type: "view", view: { center: lodging.coordinates, zoom: 15 } });
      placeWorkspace.current?.scrollIntoView?.({ block: "nearest" });
    }
  }

  function chooseDay(day: number) {
    setActiveDay(day);
    setCandidate(undefined);
    const dayPlaces = days[day];
    if (dayPlaces?.length) {
      setCamera({ type: "fit", coordinates: dayPlaces.map((place) => place.coordinates) });
    } else if (destination) {
      setCamera({ type: "view", view: { center: destination.coordinates, zoom: 11 } });
    }
  }

  function addPlace() {
    if (!candidate || activeDay === undefined) return;
    setDays((current) => {
      const currentDay = current[activeDay] ?? emptyDay;
      if (currentDay.some((place) => sameMapPlace(place, candidate))) return current;
      return { ...current, [activeDay]: [...currentDay, candidate] };
    });
  }

  function removePlace(point: MapPoint) {
    if (activeDay === undefined) return;
    setDays((current) => ({ ...current, [activeDay]: (current[activeDay] ?? emptyDay).filter((place) => place.id !== point.id) }));
    if (existing?.id === point.id) setCandidate(undefined);
  }

  function movePlace(id: string, nextIndex: number) {
    if (activeDay === undefined) return;
    setDays((current) => {
      const currentDay = current[activeDay] ?? emptyDay;
      const index = currentDay.findIndex((place) => place.id === id);
      if (index < 0 || nextIndex < 0 || nextIndex >= currentDay.length || index === nextIndex) return current;
      const reordered = [...currentDay];
      const [place] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, place);
      return { ...current, [activeDay]: reordered };
    });
  }

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 sm:space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <Link href="/utazasok" prefetch={false} className="text-xs font-medium text-muted-foreground hover:text-brand hover:underline">Vissza az utazásokhoz</Link>
        <h1 className="mt-1 wrap-break-word text-2xl font-bold tracking-tight sm:text-3xl">{saved?.name || "Kirándulástervező"}</h1>
      </div>
      {readOnly ? <p className="rounded-full bg-brand/10 px-3 py-1 text-sm text-muted-foreground">
        Megtekintés · Megosztotta {sharedBy}
      </p> : <div className="flex flex-wrap items-center gap-2">
        {saved && slug && <Link href={`/utazasok/${encodeURIComponent(slug)}/meghivasok`} prefetch={false}
          className="inline-flex min-h-10 items-center rounded-xl border border-border px-3 text-sm font-semibold hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-brand">Útitárs meghívása</Link>}
        <p role="status" className="text-xs text-muted-foreground">
          {!saved ? "A mentett terv lekérése sikertelen volt. Újra megpróbálhatod ezen az oldalon."
            : hasChanges ? "Mentetlen módosítások"
            : "Mentve a fiókodba"}
        </p>
        <button type="button" disabled={saving || Boolean(saved && !hasChanges)} onClick={() => void save()}
          className="min-h-10 rounded-xl bg-action px-3 text-sm font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-45">
          {saving ? "Folyamatban…" : !saved ? "Újrapróbálás" : "Terv mentése"}
        </button>
      </div>}
    </header>

    {saved && <div className="grid items-start gap-4 lg:grid-cols-[minmax(20rem,0.6fr)_minmax(0,1fr)]">
      <div className="grid min-w-0 gap-4">
        <section aria-label="Szállás" className="min-w-0 rounded-2xl border border-border/80 bg-surface shadow-sm">
          <TripLodging token={token} lodging={lodging} picking={pickingLodging} onChange={readOnly ? undefined : changeLodging}
            onToggleMapPick={toggleLodgingMapPick} />
        </section>
        <TripAgenda range={range} activeDay={activeDay} places={places} onDay={chooseDay}
          onSelect={choosePlace} onRemove={readOnly ? undefined : removePlace} onMove={readOnly ? undefined : movePlace} getPlaceInfo={getPlaceInfo} />
      </div>

      <div ref={placeWorkspace} className="min-w-0">
        <TripPlaceWorkspace token={token} activeDay={activeDay} points={places} lodging={lodging}
          candidate={candidate ? getPlaceInfo(candidate) : undefined} selectedId={existing?.id} camera={camera}
          view={placeView} onViewChange={(view) => { setPlaceView(view); if (view === "list") setPickingLodging(false); }}
          onLodgingPick={pickingLodging ? changeLodging : undefined} onCancelLodgingPick={() => setPickingLodging(false)}
          onSelect={choosePlace} onAdd={readOnly ? undefined : addPlace} />
      </div>
    </div>}
  </div>;
}
