import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MapExplorer } from "@/components/maps/map-explorer";
import type { MapCanvasProps } from "@/components/maps/map-canvas";

const mock = vi.hoisted(() => ({ props: null as MapCanvasProps | null, error: vi.fn(), findInfo: vi.fn() }));
vi.mock("@/components/maps/search-api", async (importOriginal) => ({ ...await importOriginal<typeof import("@/components/maps/search-api")>(), findSamplePlace: mock.findInfo }));
vi.mock("@/lib/notifications", () => ({ notify: { error: mock.error } }));
vi.mock("@/components/maps/map-canvas", () => ({ MapCanvas: (props: MapCanvasProps) => {
  mock.props = props;
  return <div aria-label="Teszt térkép"><button onClick={() => props.onMapClick([19.1, 47.5])}>Pont a térképen</button><button onClick={() => props.onSelect("sample:heroes")}>Hősök jelölő</button></div>;
} }));
beforeEach(() => { mock.error.mockClear(); mock.findInfo.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); });
describe("V18: map explorer state", () => {
  it("synchronizes list/markers and supports add/remove/reset without storage", () => {
    render(<MapExplorer />);
    expect(mock.props?.points).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Hely megnyitása: Országház" })); expect(mock.props?.selectedId).toBe("sample:parliament");
    expect(screen.getByRole("button", { name: "Hely megnyitása: Országház" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Hősök jelölő" }));
    expect(screen.getByRole("button", { name: "Hely megnyitása: Hősök tere" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Pont a térképen" }));
    expect(mock.props?.points).toHaveLength(4); expect(mock.props?.points[3].label).toBe("Saját hely 1");
    const selected = mock.props?.selectedId;
    const camera = mock.props?.cameraCommand;
    fireEvent.click(screen.getByRole("button", { name: "Országház eltávolítása" })); expect(mock.props?.points).toHaveLength(3);
    expect(mock.props?.selectedId).toBe(selected); expect(mock.props?.cameraCommand).toBe(camera);
    fireEvent.click(screen.getByRole("button", { name: "Saját hely 1 eltávolítása" })); expect(mock.props?.points).toHaveLength(2);
    expect(mock.props?.selectedId).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: "Műhold" })); expect(mock.props?.basemap).toBe("satellite");
    fireEvent.click(screen.getByRole("button", { name: "Összes pont mutatása" })); expect(mock.props?.cameraCommand).toMatchObject({ type: "fit", coordinates: expect.any(Array) });
    fireEvent.click(screen.getByRole("button", { name: "Alaphelyzet" }));
    expect(mock.props?.selectedId).toBeUndefined(); expect(mock.props?.basemap).toBe("standard");
    expect(mock.props?.cameraCommand).toEqual({ type: "view", view: { center: [19.0402, 47.4979], zoom: 11 } });
  });
  it("collapses the mobile panel", () => {
    render(<MapExplorer />); const toggle = screen.getByRole("button", { name: "Helyek (3)" });
    fireEvent.click(toggle); expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle); expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
  it("loads sample metadata on selection and reuses it for the current page", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test");
    mock.findInfo.mockResolvedValue({ info: { rating: 4.6, priceLevel: "$$" } });
    render(<MapExplorer />);
    expect(mock.findInfo).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Hely megnyitása: Országház" })); });
    expect(screen.getByRole("region", { name: "Országház adatai" })).toHaveTextContent("4,6 / 5");
    fireEvent.click(screen.getByRole("button", { name: "Hely megnyitása: Országház" }));
    expect(mock.findInfo).toHaveBeenCalledOnce();
  });
  it("aborts sample metadata on reset and ignores late responses", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test");
    let resolve!: (value: unknown) => void;
    mock.findInfo.mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<MapExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "Hely megnyitása: Országház" }));
    expect(screen.getByText("Helyadatok betöltése…")).toBeInTheDocument();
    const signal = mock.findInfo.mock.calls[0][2] as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: "Alaphelyzet" })); expect(signal.aborted).toBe(true);
    await act(async () => { resolve({ info: { rating: 5 } }); });
    expect(mock.props?.points.every((point) => !point.info)).toBe(true);
  });
  it("requests location only on click; permission denial leaves existing points intact", () => {
    const getCurrentPosition = vi.fn((_success, failure) => failure({ code: 1 }));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    render(<MapExplorer />); expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Saját helyzet" }));
    expect(mock.error).toHaveBeenCalledWith(expect.stringContaining("Nem engedélyezted"), { id: "map-location" }); expect(mock.props?.points).toHaveLength(3);
  });
  it("adds location coordinates and ignores late location callbacks after reset", () => {
    let success!: PositionCallback;
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: vi.fn((callback) => { success = callback; }) } });
    render(<MapExplorer />);
    fireEvent.click(screen.getByRole("button", { name: "Saját helyzet" }));
    act(() => success({ coords: { longitude: 19, latitude: 47 } } as GeolocationPosition));
    expect(mock.props?.points[3]).toMatchObject({ label: "Saját helyzet", coordinates: [19, 47] });
    fireEvent.click(screen.getByRole("button", { name: "Saját helyzet" })); fireEvent.click(screen.getByRole("button", { name: "Alaphelyzet" }));
    act(() => success({ coords: { longitude: 20, latitude: 48 } } as GeolocationPosition)); expect(mock.props?.points).toHaveLength(3);
  });
});
