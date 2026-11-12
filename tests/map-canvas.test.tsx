import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapCanvas } from "@/components/maps/map-canvas";
import type { MapPoint } from "@/components/maps/types";

const mock = vi.hoisted(() => ({ theme: "light", supported: true, instances: [] as FakeMap[], markers: [] as FakeMarker[], observers: [] as { disconnect: ReturnType<typeof vi.fn>; callback: () => void }[], error: vi.fn() }));
class FakeMap {
  events = new Map<string, Set<(event?: unknown) => void>>();
  canvas = document.createElement("canvas");
  touchZoomRotate = { disableRotation: vi.fn() };
  resize = vi.fn(); remove = vi.fn(); addControl = vi.fn(); flyTo = vi.fn(); fitBounds = vi.fn(); setStyle = vi.fn(); setConfigProperty = vi.fn(); isStyleLoaded = () => true;
  constructor(public options: Record<string, unknown>) { mock.instances.push(this); }
  on(name: string, handler: (event?: unknown) => void) { if (!this.events.has(name)) this.events.set(name, new Set()); this.events.get(name)!.add(handler); }
  off(name: string, handler: (event?: unknown) => void) { this.events.get(name)?.delete(handler); }
  emit(name: string, event?: unknown) { this.events.get(name)?.forEach((handler) => handler(event)); }
  getCanvas() { return this.canvas; }
  queryRenderedFeatures = vi.fn().mockReturnValue([]);
  getStyle = () => ({ layers: [{ id: "poi-label", type: "symbol", "source-layer": "poi_label" }, { id: "road-label", type: "symbol", "source-layer": "road" }] });
}
class FakeMarker {
  remove = vi.fn(() => this.element.remove());
  coordinates?: number[];
  constructor(public options: { element: HTMLElement }) { mock.markers.push(this); }
  get element() { return this.options.element; }
  setLngLat(coordinates: number[]) { this.coordinates = coordinates; return this; }
  addTo(map: FakeMap) { (map.options.container as HTMLElement).append(this.element); return this; }
}
vi.mock("mapbox-gl", () => ({ default: { Map: FakeMap, Marker: FakeMarker, NavigationControl: class {}, supported: () => mock.supported } }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: mock.theme }) }));
vi.mock("@/lib/notifications", () => ({ notify: { error: mock.error } }));
const points: MapPoint[] = [{ id: "p1", label: "Országház", coordinates: [19.045, 47.507] }, { id: "p2", label: "Másik pont", coordinates: [19.077, 47.514] }];
beforeEach(() => {
  mock.instances = []; mock.markers = []; mock.observers = []; mock.theme = "light"; mock.supported = true; mock.error.mockClear();
  vi.stubGlobal("ResizeObserver", class {
    disconnect = vi.fn(); observe = vi.fn();
    constructor(callback: () => void) { mock.observers.push({ callback, disconnect: this.disconnect }); }
  });
});
async function loaded() {
  await waitFor(() => expect(mock.instances.length).toBeGreaterThan(0));
  await act(async () => { mock.instances.at(-1)!.emit("load"); });
  await waitFor(() => expect(screen.getByRole("button", { name: "Hely kiválasztása: Országház" })).toBeInTheDocument());
  return mock.instances.at(-1)!;
}
describe("V19/V21: reusable MapCanvas", () => {
  it("shows missing-token state without loading the engine, and rejects secret tokens", async () => {
    const { rerender } = render(<MapCanvas token="" points={points} onSelect={vi.fn()} onMapClick={vi.fn()} />);
    expect(screen.getByText("A térkép beállításra vár")).toBeInTheDocument(); expect(mock.instances).toHaveLength(0);
    rerender(<MapCanvas token="sk.secret" points={points} onSelect={vi.fn()} onMapClick={vi.fn()} />);
    expect(mock.instances).toHaveLength(0); expect(mock.error).toHaveBeenCalledWith(expect.stringContaining("hozzáférése"), { id: "map-canvas" });
  });
  it("synchronizes accessible markers, click events, resize, and frees resources on remount", async () => {
    const onSelect = vi.fn(); const onMapClick = vi.fn();
    const { unmount, rerender } = render(<MapCanvas token="pk.test" points={points} selectedId="p1" onSelect={onSelect} onMapClick={onMapClick} />);
    const instance = await loaded(); expect(instance.options).toMatchObject({ center: [19.0402, 47.4979], zoom: 11, maxPitch: 0 });
    const marker = screen.getByRole("button", { name: "Hely kiválasztása: Országház" });
    expect(marker).toHaveAttribute("aria-pressed", "true"); expect(marker.tabIndex).toBe(0);
    fireEvent.click(marker); expect(onSelect).toHaveBeenCalledWith("p1"); expect(onMapClick).not.toHaveBeenCalled();
    act(() => instance.emit("click", { lngLat: { lng: 19, lat: 47 } })); expect(onMapClick).toHaveBeenCalledWith([19, 47]);
    mock.observers[0].callback(); expect(instance.resize).toHaveBeenCalled();
    rerender(<MapCanvas token="pk.test" points={points.slice(0, 1)} selectedId="p1" onSelect={onSelect} onMapClick={onMapClick} />);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Hely kiválasztása: Másik pont" })).not.toBeInTheDocument());
    unmount(); expect(instance.remove).toHaveBeenCalledOnce(); expect(mock.observers[0].disconnect).toHaveBeenCalledOnce();
    expect([...instance.events.values()].every((listeners) => listeners.size === 0)).toBe(true);
    expect(mock.markers.every((entry) => entry.remove.mock.calls.length > 0)).toBe(true);
    render(<MapCanvas token="pk.test" points={points} onSelect={onSelect} onMapClick={onMapClick} />); await loaded(); expect(mock.instances).toHaveLength(2);
  });
  it("changes styles/theme without replacing the map, camera or markers; accepts camera requests", async () => {
    const props = { token: "pk.test", points, onSelect: vi.fn(), onMapClick: vi.fn() };
    const { rerender } = render(<MapCanvas {...props} />); const instance = await loaded(); const markerCount = mock.markers.length;
    rerender(<MapCanvas {...props} basemap="satellite" />); expect(instance.setStyle).toHaveBeenCalledWith("mapbox://styles/mapbox/satellite-streets-v12");
    expect(instance.flyTo).not.toHaveBeenCalled(); expect(mock.markers).toHaveLength(markerCount);
    mock.theme = "dark"; rerender(<MapCanvas {...props} basemap="standard" />);
    act(() => instance.emit("style.load")); expect(instance.setConfigProperty).toHaveBeenCalledWith("basemap", "lightPreset", "night");
    expect(instance.setConfigProperty).toHaveBeenCalledWith("basemap", "show3dObjects", false); expect(mock.instances).toHaveLength(1);
    rerender(<MapCanvas {...props} cameraCommand={{ type: "fit", coordinates: points.map((point) => point.coordinates) }} />);
    expect(instance.fitBounds).toHaveBeenCalledWith([[19.045, 47.507], [19.077, 47.514]], expect.objectContaining({ padding: 65 }));
    rerender(<MapCanvas {...props} cameraCommand={{ type: "view", view: { center: [20, 48], zoom: 14 } }} />);
    expect(instance.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [20, 48], zoom: 14 }));
  });
  it("selects named POIs before the custom-point handler in standard and satellite styles", async () => {
    const onPlaceSelect = vi.fn(); const onMapClick = vi.fn();
    const props = { token: "pk.test", points, onSelect: vi.fn(), onPlaceSelect, onMapClick };
    const { rerender } = render(<MapCanvas {...props} />); const instance = await loaded();
    instance.queryRenderedFeatures.mockReturnValue([{ properties: { name: "Kávézó" }, geometry: { type: "Point", coordinates: [19.05, 47.5] } }]);
    const event = { point: { x: 50, y: 50 }, lngLat: { lng: 19.06, lat: 47.51 } };
    act(() => instance.emit("click", event));
    expect(onPlaceSelect).toHaveBeenCalledWith(expect.objectContaining({ label: "Kávézó", coordinates: [19.05, 47.5], source: "map" }));
    expect(onMapClick).not.toHaveBeenCalled();
    expect(instance.queryRenderedFeatures).toHaveBeenCalledWith(event.point, { target: { featuresetId: "poi", importId: "basemap" } });
    act(() => instance.emit("mousemove", event)); expect(instance.canvas.style.cursor).toBe("pointer");
    rerender(<MapCanvas {...props} basemap="satellite" />);
    act(() => instance.emit("click", event)); expect(instance.queryRenderedFeatures).toHaveBeenLastCalledWith(event.point, { layers: ["poi-label"] });
    instance.queryRenderedFeatures.mockReturnValue([]); act(() => instance.emit("click", event));
    expect(onMapClick).toHaveBeenCalledOnce(); expect(onMapClick).toHaveBeenCalledWith([19.06, 47.51]);
    act(() => instance.emit("mousemove", event)); expect(instance.canvas.style.cursor).toBe("");
  });
  it("reports WebGL failure and retries with a fresh instance", async () => {
    mock.supported = false;
    render(<MapCanvas token="pk.test" points={points} onSelect={vi.fn()} onMapClick={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("A térkép nem tölthető be")).toBeInTheDocument()); expect(mock.error).toHaveBeenCalledWith(expect.stringContaining("WebGL"), { id: "map-canvas" });
    mock.supported = true; fireEvent.click(screen.getByRole("button", { name: "Újrapróbálás" })); await loaded();
    act(() => mock.instances[0].emit("error", { error: { status: 429 } }));
    expect(mock.error).toHaveBeenLastCalledWith(expect.stringContaining("korlát"), { id: "map-canvas" });
  });
});
