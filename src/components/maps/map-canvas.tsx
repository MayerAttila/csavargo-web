"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { Map as MapboxMap, Marker, MapMouseEvent, ErrorEvent } from "mapbox-gl";
import { HiOutlineMap } from "react-icons/hi2";
import { notify } from "@/lib/notifications";
import { isPublicMapToken, mapErrorMessage, WEBGL_ERROR } from "./map-errors";
import { pointFromMapFeature, sameMapPlace } from "./map-poi";
import { BUDAPEST_VIEW, type Coordinates, type MapBasemap, type MapBounds, type MapCameraCommand, type MapPoint, type MapView } from "./types";

export type MapCanvasProps = {
  points: MapPoint[];
  lodging?: MapPoint;
  selectedId?: string;
  onSelect: (id: string) => void;
  onMapClick?: (coordinates: Coordinates) => void;
  onPlaceSelect?: (point: MapPoint) => void;
  onViewportChange?: (bounds: MapBounds | undefined) => void;
  discoveryPoints?: MapPoint[];
  showLodgingLabels?: boolean;
  selectedDiscoveryId?: string;
  hideBasemapPlaces?: boolean;
  initialView?: MapView;
  basemap?: MapBasemap;
  cameraCommand?: MapCameraCommand;
  className?: string;
  token?: string;
  missingTokenHint?: string;
};
const styles = { standard: "mapbox://styles/mapbox/standard", satellite: "mapbox://styles/mapbox/satellite-streets-v12" };

function bedIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "size-4");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 15h18M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3m-7-5v5");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}

type LabelBounds = { left: number; right: number; top: number; bottom: number };

function overlaps(first: LabelBounds, second: LabelBounds) {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
}

export function MapCanvas({ points, lodging, selectedId, onSelect, onMapClick, onPlaceSelect, onViewportChange, discoveryPoints, selectedDiscoveryId, showLodgingLabels = false, hideBasemapPlaces = false, initialView = BUDAPEST_VIEW, basemap = "standard", cameraCommand,
  className = "", token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "", missingTokenHint }: MapCanvasProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const engine = useRef<typeof import("mapbox-gl").default | null>(null);
  const appliedBasemap = useRef<MapBasemap | null>(null);
  const markerEntries = useRef<{ marker: Marker; dispose: () => void }[]>([]);
  const { resolvedTheme } = useTheme();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const latest = useRef({ onSelect, onMapClick, onPlaceSelect, onViewportChange, hideBasemapPlaces, initialView, basemap, dark: resolvedTheme === "dark" });
  useEffect(() => { latest.current = { onSelect, onMapClick, onPlaceSelect, onViewportChange, hideBasemapPlaces, initialView, basemap, dark: resolvedTheme === "dark" }; });

  useEffect(() => {
    if (!isPublicMapToken(token)) return;
    let cancelled = false;
    let instance: MapboxMap | undefined;
    let observer: ResizeObserver | undefined;
    const disposers: (() => void)[] = [];
    void (async () => {
      setStatus("loading");
      latest.current.onViewportChange?.(undefined);
      try {
        const { default: mapbox } = await import("mapbox-gl");
        if (cancelled || !container.current) return;
        if (!mapbox.supported()) { notify.error(WEBGL_ERROR, { id: "map-canvas" }); setStatus("error"); return; }
        const props = latest.current;
        instance = new mapbox.Map({ container: container.current, accessToken: token, style: styles[props.basemap],
          center: props.initialView.center, zoom: props.initialView.zoom, pitch: 0, maxPitch: 0, bearing: 0,
          dragRotate: false, pitchWithRotate: false, touchPitch: false,
          config: props.basemap === "standard" ? { basemap: { show3dObjects: false, lightPreset: props.dark ? "night" : "day", showPointOfInterestLabels: !props.hideBasemapPlaces } } : undefined,
          locale: { "NavigationControl.ZoomIn": "Nagyítás", "NavigationControl.ZoomOut": "Kicsinyítés", "AttributionControl.ToggleAttribution": "Források megjelenítése" } });
        map.current = instance;
        engine.current = mapbox;
        appliedBasemap.current = props.basemap;
        instance.touchZoomRotate.disableRotation();
        instance.addControl(new mapbox.NavigationControl({ showCompass: false }), "top-right");
        const poiAt = (event: MapMouseEvent): MapPoint | null => {
          if (!instance?.isStyleLoaded() || latest.current.hideBasemapPlaces) return null;
          const features = latest.current.basemap === "standard"
            ? instance.queryRenderedFeatures(event.point, { target: { featuresetId: "poi", importId: "basemap" } })
            : instance.queryRenderedFeatures(event.point, { layers: instance.getStyle().layers
              .filter((layer) => layer.type === "symbol" && "source-layer" in layer && layer["source-layer"] === "poi_label").map((layer) => layer.id) });
          for (const feature of features) { const point = pointFromMapFeature(feature); if (point) return point; }
          return null;
        };
        const click = (event: MapMouseEvent) => {
          if (!instance?.isStyleLoaded()) return;
          const place = poiAt(event);
          if (place) { latest.current.onPlaceSelect?.(place); return; }
          latest.current.onMapClick?.([event.lngLat.lng, event.lngLat.lat]);
        };
        const hover = (event: MapMouseEvent) => { if (instance) instance.getCanvas().style.cursor = poiAt(event) ? "pointer" : ""; };
        const leave = () => { if (instance) instance.getCanvas().style.cursor = ""; };
        const reportViewport = () => {
          const notifyViewport = latest.current.onViewportChange;
          if (!notifyViewport || cancelled) return;
          const bounds = instance?.getBounds();
          if (bounds) notifyViewport([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
        };
        const ready = () => { if (!cancelled) { setStatus("ready"); reportViewport(); } };
        const configure = () => {
          if (latest.current.basemap === "standard") {
            instance?.setConfigProperty("basemap", "show3dObjects", false);
            instance?.setConfigProperty("basemap", "lightPreset", latest.current.dark ? "night" : "day");
            instance?.setConfigProperty("basemap", "showPointOfInterestLabels", !latest.current.hideBasemapPlaces);
          }
        };
        const error = (event: ErrorEvent) => {
          if (cancelled) return;
          notify.error(mapErrorMessage(event.error), { id: "map-canvas" });
          setStatus("error");
          latest.current.onViewportChange?.(undefined);
        };
        instance.on("click", click); instance.on("load", ready); instance.on("error", error); instance.on("style.load", configure);
        instance.on("mousemove", hover); instance.on("mouseout", leave);
        instance.on("moveend", reportViewport);
        disposers.push(() => { instance?.off("moveend", reportViewport); });
        disposers.push(() => { instance?.off("mousemove", hover); instance?.off("mouseout", leave); });
        disposers.push(() => { instance?.off("click", click); instance?.off("load", ready); instance?.off("error", error); instance?.off("style.load", configure); });
        observer = new ResizeObserver(() => instance?.resize()); observer.observe(container.current);
        const canvas = instance.getCanvas();
        const lost = (event: Event) => {
          event.preventDefault();
          notify.error(WEBGL_ERROR, { id: "map-canvas" });
          setStatus("error");
          latest.current.onViewportChange?.(undefined);
        };
        canvas.addEventListener("webglcontextlost", lost);
        disposers.push(() => canvas.removeEventListener("webglcontextlost", lost));
      } catch {
        if (!cancelled) { notify.error(WEBGL_ERROR, { id: "map-canvas" }); setStatus("error"); }
      }
    })();
    return () => {
      cancelled = true; observer?.disconnect(); disposers.forEach((dispose) => dispose());
      markerEntries.current.forEach(({ marker, dispose }) => { dispose(); marker.remove(); }); markerEntries.current = [];
      instance?.remove(); map.current = null; engine.current = null;
    };
  }, [token, attempt]);

  useEffect(() => {
    const instance = map.current;
    const mapbox = engine.current;
    if (!instance || !mapbox || status !== "ready") return;
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
  }, [points, selectedId, status, attempt]);

  useEffect(() => {
    const instance = map.current;
    const mapbox = engine.current;
    if (!instance || !mapbox || status !== "ready" || !lodging) return;
    const element = document.createElement("div");
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", `Szállás: ${lodging.label}`);
    element.className = "grid size-8 place-items-center rounded-full border-2 border-white bg-violet-700 text-white shadow-lg";
    element.style.pointerEvents = "none";
    element.append(bedIcon());
    const offset: [number, number] = points.some((point) => sameMapPlace(point, lodging)) ? [0, -18] : [0, 0];
    const marker = new mapbox.Marker({ element, anchor: "bottom", offset }).setLngLat(lodging.coordinates).addTo(instance);
    return () => { marker.remove(); };
  }, [lodging, points, status, attempt]);

  useEffect(() => {
    const instance = map.current;
    const mapbox = engine.current;
    if (!instance || !mapbox || status !== "ready" || !discoveryPoints?.length) return;
    const markers = discoveryPoints.map((point) => {
      const button = document.createElement("button");
      const label = document.createElement("span");
      button.type = "button";
      button.title = point.label;
      button.setAttribute("aria-label", `Találat kiválasztása: ${point.label}`);
      button.setAttribute("aria-pressed", String(point.id === selectedDiscoveryId));
      if (showLodgingLabels) {
        button.className = "group/poi grid size-6 place-items-center rounded-sm border border-border bg-surface text-foreground shadow-sm hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
        label.className = "pointer-events-none absolute top-1/2 left-full ml-1 w-max max-w-40 -translate-y-1/2 truncate text-left text-xs font-semibold text-foreground text-shadow-[0_1px_2px_var(--background),0_0_4px_var(--background)] group-hover/poi:visible group-focus-visible/poi:visible";
        label.textContent = point.label;
        button.append(bedIcon(), label);
      } else {
        button.className = `grid size-7 place-items-center rounded-full border-2 border-white bg-action text-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${point.id === selectedDiscoveryId ? "ring-4 ring-brand/45" : ""}`;
        button.textContent = "•";
      }
      button.onclick = (event) => { event.stopPropagation(); latest.current.onPlaceSelect?.(point); };
      return { point, label, marker: new mapbox.Marker({ element: button }).setLngLat(point.coordinates).addTo(instance) };
    });
    const layoutLabels = () => {
      const width = container.current?.clientWidth;
      const height = container.current?.clientHeight;
      if (!width || !height) return;
      const positions = markers.map(({ point }) => instance.project(point.coordinates));
      const occupied: LabelBounds[] = positions.map(({ x, y }) => ({ left: x - 12, right: x + 12, top: y - 12, bottom: y + 12 }));
      markers.forEach(({ label }, index) => {
        const { x, y } = positions[index];
        const halfHeight = label.offsetHeight / 2;
        const bounds = { left: x + 16, right: x + 20 + label.offsetWidth, top: y - halfHeight - 2, bottom: y + halfHeight + 2 };
        const visible = bounds.left >= 0 && bounds.right <= width && bounds.top >= 0 && bounds.bottom <= height
          && !occupied.some((other) => overlaps(bounds, other));
        label.classList.toggle("invisible", !visible);
        if (visible) occupied.push(bounds);
      });
    };
    if (showLodgingLabels) {
      layoutLabels();
      instance.on("moveend", layoutLabels);
      instance.on("resize", layoutLabels);
    }
    return () => {
      if (showLodgingLabels) {
        instance.off("moveend", layoutLabels);
        instance.off("resize", layoutLabels);
      }
      markers.forEach(({ marker }) => marker.remove());
    };
  }, [discoveryPoints, selectedDiscoveryId, showLodgingLabels, status, attempt]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || status !== "ready") return;
    // setStyle retains the existing camera and DOM markers.
    if (appliedBasemap.current !== basemap) { appliedBasemap.current = basemap; instance.setStyle(styles[basemap]); }
  }, [basemap, status]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || basemap !== "standard" || status !== "ready") return;
    const update = () => {
      instance.off("idle", update);
      instance.setConfigProperty("basemap", "lightPreset", resolvedTheme === "dark" ? "night" : "day");
      instance.setConfigProperty("basemap", "showPointOfInterestLabels", !hideBasemapPlaces);
    };
    if (instance.isStyleLoaded()) update();
    else instance.on("idle", update);
    return () => { instance.off("idle", update); };
  }, [resolvedTheme, basemap, status, hideBasemapPlaces]);

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
        <p className="mt-2 text-sm text-muted-foreground">{missing ? missingTokenHint ?? "A térkép és a helykeresés a szolgáltatás beállítása után lesz elérhető. A mintapontokat addig is megnézheted." : invalid || status === "error" ? "Ellenőrizd a kapcsolatot és a térképszolgáltatás beállításait." : "Egy pillanat, és indulhat a felfedezés."}</p>
        {!missing && !invalid && status === "error" && <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Újrapróbálás</button>}
      </div>
    </div>}
  </section>;
}
