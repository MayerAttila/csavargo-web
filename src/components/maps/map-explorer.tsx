"use client";
import { useEffect, useRef, useState } from "react";
import { HiOutlineArrowsPointingOut, HiOutlineArrowPath, HiOutlineViewfinderCircle, HiOutlineChevronDown } from "react-icons/hi2";
import { notify } from "@/lib/notifications";
import { MapCanvas } from "./map-canvas";
import { PlaceSearch } from "./place-search";
import { PlaceList } from "./place-list";
import type { PlaceInfoStatus } from "./place-info";
import { findSamplePlace } from "./search-api";
import { isPublicMapToken, mapErrorMessage } from "./map-errors";
import { sameMapPlace } from "./map-poi";
import { BUDAPEST_VIEW, type Coordinates, type MapBasemap, type MapCameraCommand, type MapPoint } from "./types";

const SAMPLE_POINTS: MapPoint[] = [
  { id: "sample:parliament", label: "Országház", coordinates: [19.0452, 47.5070], address: "Budapest, Kossuth Lajos tér 1–3.", source: "sample" },
  { id: "sample:bastion", label: "Halászbástya", coordinates: [19.0340, 47.5022], address: "Budapest, Szentháromság tér", source: "sample" },
  { id: "sample:heroes", label: "Hősök tere", coordinates: [19.0775, 47.5149], address: "Budapest, Hősök tere", source: "sample" },
];
const actionClass = "flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 text-xs font-medium hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50";

export function MapExplorer() {
  const [points, setPoints] = useState<MapPoint[]>(SAMPLE_POINTS);
  const [selectedId, setSelectedId] = useState<string>();
  const [basemap, setBasemap] = useState<MapBasemap>("standard");
  const [cameraCommand, setCameraCommand] = useState<MapCameraCommand>();
  const [panelOpen, setPanelOpen] = useState(true);
  const [locating, setLocating] = useState(false);
  const [infoStates, setInfoStates] = useState<Record<string, PlaceInfoStatus | undefined>>({});
  const infoRequest = useRef<AbortController | null>(null);
  const manualCount = useRef(0);
  const locationVersion = useRef(0);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  useEffect(() => () => { locationVersion.current++; infoRequest.current?.abort(); }, []);

  async function loadInfo(point: MapPoint) {
    const controller = new AbortController(); infoRequest.current = controller;
    setInfoStates((current) => ({ ...current, [point.id]: "loading" }));
    try {
      const match = await findSamplePlace(point, token, controller.signal);
      if (controller.signal.aborted) return;
      setPoints((current) => current.map((item) => item.id === point.id ? { ...item, address: item.address ?? match?.address, info: match?.info ?? {} } : item));
      setInfoStates((current) => ({ ...current, [point.id]: undefined }));
    } catch (error) {
      if (controller.signal.aborted) return;
      setInfoStates((current) => ({ ...current, [point.id]: "error" }));
      notify.error(mapErrorMessage(error), { id: "place-info" });
    }
  }

  function addPoint(point: MapPoint) {
    infoRequest.current?.abort();
    setPoints((current) => [...current.filter((item) => item.id !== point.id), point]);
    setSelectedId(point.id); setPanelOpen(true);
    setCameraCommand({ type: "view", view: { center: point.coordinates, zoom: 14 } });
    if (point.source === "map" && !point.info && isPublicMapToken(token)) void loadInfo(point);
  }
  function addManual(coordinates: Coordinates) {
    manualCount.current++;
    addPoint({ id: crypto.randomUUID(), label: `Saját hely ${manualCount.current}`, coordinates, source: "manual" });
  }
  function select(id: string) {
    const point = points.find((item) => item.id === id);
    if (!point) return;
    infoRequest.current?.abort();
    setSelectedId(id); setPanelOpen(true);
    setCameraCommand({ type: "view", view: { center: point.coordinates, zoom: 14 } });
    if ((point.source === "sample" || point.source === "map") && !point.info && isPublicMapToken(token)) void loadInfo(point);
  }
  function selectMapPlace(point: MapPoint) {
    const existing = points.find((item) => sameMapPlace(item, point));
    if (existing) select(existing.id);
    else addPoint(point);
  }
  function remove(id: string) {
    if (selectedId === id) infoRequest.current?.abort();
    setPoints((current) => current.filter((point) => point.id !== id));
    setSelectedId((current) => current === id ? undefined : current);
  }
  function reset() {
    infoRequest.current?.abort(); setInfoStates({});
    locationVersion.current++; setLocating(false); manualCount.current = 0;
    setPoints(SAMPLE_POINTS); setSelectedId(undefined); setBasemap("standard");
    setCameraCommand({ type: "view", view: BUDAPEST_VIEW });
  }
  function locate() {
    if (!navigator.geolocation) { notify.error("Ez a böngésző nem támogatja a helymeghatározást.", { id: "map-location" }); return; }
    setLocating(true);
    const version = ++locationVersion.current;
    navigator.geolocation.getCurrentPosition((position) => {
      if (version !== locationVersion.current) return;
      setLocating(false);
      addPoint({ id: "my-location", label: "Saját helyzet", coordinates: [position.coords.longitude, position.coords.latitude], source: "geolocation" });
    }, (error) => {
      if (version !== locationVersion.current) return;
      setLocating(false);
      notify.error(error.code === 1 ? "Nem engedélyezted a helymeghatározást. A térképet továbbra is használhatod." : error.code === 3 ? "A helymeghatározás túl sokáig tartott. Próbáld újra." : "A jelenlegi helyzeted nem érhető el. Próbáld újra később.", { id: "map-location" });
    }, { timeout: 10_000, maximumAge: 60_000, enableHighAccuracy: false });
  }

  return <div className="flex min-h-0 flex-col gap-5 lg:h-full">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand">Felfedezés</p><h1 className="text-2xl font-bold tracking-tight">Térkép</h1><p className="mt-1 text-sm text-muted-foreground">Találj helyeket, vagy jelöld meg őket a térképen.</p></div>
      <p className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground">Próbaoldal · a pontok nem kerülnek mentésre</p>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Térképtípus" className="flex rounded-xl border border-border bg-surface p-1">
        {([ ["standard", "Térkép"], ["satellite", "Műhold"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={basemap === value} onClick={() => setBasemap(value)} className={`min-h-9 rounded-lg px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand ${basemap === value ? "bg-brand/10 text-brand" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={actionClass} disabled={!points.length} onClick={() => setCameraCommand({ type: "fit", coordinates: points.map((point) => point.coordinates) })}><HiOutlineArrowsPointingOut aria-hidden="true" className="size-4" />Összes pont mutatása</button>
        <button type="button" className={actionClass} onClick={locate} disabled={locating}><HiOutlineViewfinderCircle aria-hidden="true" className="size-4" />{locating ? "Helymeghatározás…" : "Saját helyzet"}</button>
        <button type="button" className={actionClass} onClick={reset}><HiOutlineArrowPath aria-hidden="true" className="size-4" />Alaphelyzet</button>
      </div>
    </div>
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,19rem)_minmax(0,1fr)]">
      <MapCanvas token={token} points={points} selectedId={selectedId} onSelect={select} onMapClick={addManual} onPlaceSelect={selectMapPlace}
        basemap={basemap} cameraCommand={cameraCommand} className="h-[55svh] min-h-80 lg:col-start-2 lg:row-start-1 lg:h-full lg:min-h-72" />
      <aside aria-label="Helykezelő" className="min-h-0 rounded-2xl border border-border bg-surface [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:col-start-1 lg:row-start-1 lg:overflow-y-auto">
        <button type="button" aria-expanded={panelOpen} aria-controls="explorer-places" onClick={() => setPanelOpen((value) => !value)} className="flex min-h-12 w-full items-center justify-between p-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand lg:hidden">
          Helyek ({points.length})<HiOutlineChevronDown aria-hidden="true" className={`size-4 transition-transform ${panelOpen ? "rotate-180" : ""}`} />
        </button>
        <div id="explorer-places" className={`${panelOpen ? "block" : "hidden"} space-y-5 p-4 lg:block`}>
          <PlaceSearch token={token} onSelect={addPoint} />
          <PlaceList points={points} selectedId={selectedId} onSelect={select} onRemove={remove} infoStates={infoStates} />
        </div>
      </aside>
    </div>
  </div>;
}
