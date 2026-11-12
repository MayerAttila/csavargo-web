"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { Map as MapboxMap, Marker, MapMouseEvent, ErrorEvent } from "mapbox-gl";
import { HiOutlineMap } from "react-icons/hi2";
import { notify } from "@/lib/notifications";
import { isPublicMapToken, mapErrorMessage, WEBGL_ERROR } from "./map-errors";
import { BUDAPEST_VIEW, type Coordinates, type MapBasemap, type MapCameraCommand, type MapPoint, type MapView } from "./types";

export type MapCanvasProps = {
  points: MapPoint[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onMapClick: (coordinates: Coordinates) => void;
  initialView?: MapView;
  basemap?: MapBasemap;
  cameraCommand?: MapCameraCommand;
  className?: string;
  token?: string;
};
const styles = { standard: "mapbox://styles/mapbox/standard", satellite: "mapbox://styles/mapbox/satellite-streets-v12" };

export function MapCanvas({ points, selectedId, onSelect, onMapClick, initialView = BUDAPEST_VIEW, basemap = "standard", cameraCommand,
  className = "", token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "" }: MapCanvasProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const appliedBasemap = useRef<MapBasemap | null>(null);
  const markerEntries = useRef<{ marker: Marker; dispose: () => void }[]>([]);
  const { resolvedTheme } = useTheme();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const latest = useRef({ onSelect, onMapClick, initialView, basemap, dark: resolvedTheme === "dark" });
  useEffect(() => { latest.current = { onSelect, onMapClick, initialView, basemap, dark: resolvedTheme === "dark" }; });

  useEffect(() => {
    if (!isPublicMapToken(token)) return;
    let cancelled = false;
    let instance: MapboxMap | undefined;
    let observer: ResizeObserver | undefined;
    const disposers: (() => void)[] = [];
    void (async () => {
      setStatus("loading");
      try {
        const { default: mapbox } = await import("mapbox-gl");
        if (cancelled || !container.current) return;
        if (!mapbox.supported()) { notify.error(WEBGL_ERROR, { id: "map-canvas" }); setStatus("error"); return; }
        const props = latest.current;
        instance = new mapbox.Map({ container: container.current, accessToken: token, style: styles[props.basemap],
          center: props.initialView.center, zoom: props.initialView.zoom, pitch: 0, maxPitch: 0, bearing: 0,
          dragRotate: false, pitchWithRotate: false, touchPitch: false,
          config: props.basemap === "standard" ? { basemap: { show3dObjects: false, lightPreset: props.dark ? "night" : "day" } } : undefined,
          locale: { "NavigationControl.ZoomIn": "Nagyítás", "NavigationControl.ZoomOut": "Kicsinyítés", "AttributionControl.ToggleAttribution": "Források megjelenítése" } });
        map.current = instance;
        appliedBasemap.current = props.basemap;
        instance.touchZoomRotate.disableRotation();
        instance.addControl(new mapbox.NavigationControl({ showCompass: false }), "top-right");
        const click = (event: MapMouseEvent) => latest.current.onMapClick([event.lngLat.lng, event.lngLat.lat]);
        const ready = () => { if (!cancelled) setStatus("ready"); };
        const configure = () => {
          if (latest.current.basemap === "standard") {
            instance?.setConfigProperty("basemap", "show3dObjects", false);
            instance?.setConfigProperty("basemap", "lightPreset", latest.current.dark ? "night" : "day");
          }
        };
        const error = (event: ErrorEvent) => {
          if (cancelled) return;
          notify.error(mapErrorMessage(event.error), { id: "map-canvas" });
          setStatus("error");
        };
        instance.on("click", click); instance.on("load", ready); instance.on("error", error); instance.on("style.load", configure);
        disposers.push(() => { instance?.off("click", click); instance?.off("load", ready); instance?.off("error", error); instance?.off("style.load", configure); });
        observer = new ResizeObserver(() => instance?.resize()); observer.observe(container.current);
        const canvas = instance.getCanvas();
        const lost = (event: Event) => { event.preventDefault(); notify.error(WEBGL_ERROR, { id: "map-canvas" }); setStatus("error"); };
        canvas.addEventListener("webglcontextlost", lost);
        disposers.push(() => canvas.removeEventListener("webglcontextlost", lost));
      } catch {
        if (!cancelled) { notify.error(WEBGL_ERROR, { id: "map-canvas" }); setStatus("error"); }
      }
    })();
    return () => {
      cancelled = true; observer?.disconnect(); disposers.forEach((dispose) => dispose());
      markerEntries.current.forEach(({ marker, dispose }) => { dispose(); marker.remove(); }); markerEntries.current = [];
      instance?.remove(); map.current = null;
    };
  }, [token, attempt]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || status !== "ready") return;
    let cancelled = false;
    void import("mapbox-gl").then(({ default: mapbox }) => {
      if (cancelled) return;
      markerEntries.current.forEach(({ marker, dispose }) => { dispose(); marker.remove(); });
      markerEntries.current = points.map((point, index) => {
        const button = document.createElement("button");
        button.type = "button"; button.setAttribute("aria-label", `Hely kiválasztása: ${point.label}`);
        button.setAttribute("aria-pressed", String(point.id === selectedId)); button.title = point.label;
        button.textContent = String(index + 1);
        button.className = `flex size-9 items-center justify-center rounded-full border-2 border-white text-sm font-bold shadow-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-brand motion-safe:transition-colors ${point.id === selectedId ? "bg-brand text-white ring-4 ring-brand/30" : "bg-surface text-foreground"}`;
        const click = (event: MouseEvent) => { event.stopPropagation(); latest.current.onSelect(point.id); };
        button.addEventListener("click", click);
        const marker = new mapbox.Marker({ element: button }).setLngLat(point.coordinates).addTo(instance);
        return { marker, dispose: () => button.removeEventListener("click", click) };
      });
    });
    return () => { cancelled = true; };
  }, [points, selectedId, status, attempt]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || status !== "ready") return;
    // setStyle retains the existing camera and DOM markers.
    if (appliedBasemap.current !== basemap) { appliedBasemap.current = basemap; instance.setStyle(styles[basemap]); }
  }, [basemap, status]);

  useEffect(() => {
    if (map.current?.isStyleLoaded() && basemap === "standard" && status === "ready") {
      map.current.setConfigProperty("basemap", "lightPreset", resolvedTheme === "dark" ? "night" : "day");
    }
  }, [resolvedTheme, basemap, status]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || status !== "ready" || !cameraCommand) return;
    const duration = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 700;
    if (cameraCommand.type === "view") instance.flyTo({ center: cameraCommand.view.center, zoom: cameraCommand.view.zoom, duration });
    else if (cameraCommand.coordinates.length === 1) instance.flyTo({ center: cameraCommand.coordinates[0], zoom: 14, duration });
    else if (cameraCommand.coordinates.length > 1) {
      const coordinates = cameraCommand.coordinates;
      instance.fitBounds([[Math.min(...coordinates.map(([lng]) => lng)), Math.min(...coordinates.map(([, lat]) => lat))],
        [Math.max(...coordinates.map(([lng]) => lng)), Math.max(...coordinates.map(([, lat]) => lat))]], { padding: 65, maxZoom: 15, duration });
    }
  }, [cameraCommand, status]);

  const missing = !token;
  const invalid = Boolean(token) && !isPublicMapToken(token);
  useEffect(() => { if (invalid) notify.error(mapErrorMessage({ status: 401 }), { id: "map-canvas" }); }, [invalid]);
  return <section aria-label="Interaktív térkép" className={`relative isolate overflow-hidden rounded-2xl border border-border bg-surface-alt ${className}`}>
    <div ref={container} className="h-full w-full" />
    {(missing || invalid || status !== "ready") && <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/95 p-6 text-center">
      <div className="max-w-sm"><HiOutlineMap aria-hidden="true" className="mx-auto mb-4 size-10 text-brand" />
        <p role="status" className="font-semibold">{missing ? "A térkép beállításra vár" : invalid || status === "error" ? "A térkép nem tölthető be" : "Térkép betöltése…"}</p>
        <p className="mt-2 text-sm text-muted-foreground">{missing ? "A térkép és a helykeresés a szolgáltatás beállítása után lesz elérhető. A mintapontokat addig is megnézheted." : invalid || status === "error" ? "Ellenőrizd a kapcsolatot és a térképszolgáltatás beállításait." : "Egy pillanat, és indulhat a felfedezés."}</p>
        {!missing && !invalid && status === "error" && <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Újrapróbálás</button>}
      </div>
    </div>}
  </section>;
}
