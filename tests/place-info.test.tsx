import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { parsePlaceInfo, formatOpeningHours } from "@/components/maps/place-metadata";
import { PlaceInfoPanel } from "@/components/maps/place-info";
import { findSamplePlace } from "@/components/maps/search-api";

describe("place information", () => {
  it("maps supplied metadata and formats split/overnight opening hours in Hungarian", () => {
    const info = parsePlaceInfo({ rating: 4.61, price_level: "$$", website: "https://example.com", phone: "+3611234567", open_hours: { periods: [
      { open: { day: 1, time: "0800" }, close: { day: 1, time: "1200" } },
      { open: { day: 1, time: "1400" }, close: { day: 2, time: "0200" } },
    ] } });
    render(<PlaceInfoPanel point={{ id: "p", label: "Étterem", coordinates: [19, 47], info }} onRetry={vi.fn()} />);
    expect(screen.getByText("4,61 / 5")).toBeInTheDocument(); expect(screen.getByText("$$")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Nyitvatartás"));
    expect(screen.getByText("08:00–12:00, 14:00–02:00 (következő nap)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hivatalos weboldal" })).toHaveAttribute("href", "https://example.com");
  });
  it("does not invent missing/invalid data or expose unsafe website links", () => {
    const info = parsePlaceInfo({ rating: 99, price_level: "free", website: "javascript:alert(1)", open_hours: { periods: [{ open: { day: 10, time: "2500" } }] } });
    render(<PlaceInfoPanel point={{ id: "p", label: "Hely", coordinates: [19, 47], info }} onRetry={vi.fn()} />);
    expect(screen.getAllByText("Nincs adat")).toHaveLength(3); expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(formatOpeningHours([{ open: { day: 0, time: "0000" } }]).every((day) => day.hours === "0–24")).toBe(true);
  });
  it("shows pending state and supports retry after a delivery error", () => {
    const onRetry = vi.fn(); const point = { id: "p", label: "Hely", coordinates: [19, 47] as [number, number] };
    const { rerender } = render(<PlaceInfoPanel point={point} status="loading" onRetry={onRetry} />);
    expect(screen.getByRole("status")).toHaveTextContent("Helyadatok betöltése");
    rerender(<PlaceInfoPanel point={point} status="error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Helyadatok újrapróbálása" })); expect(onRetry).toHaveBeenCalledOnce();
  });
  it("rejects nearby name mismatches and identically named places far from a sample", async () => {
    const point = { id: "sample", label: "Országház", address: "Budapest, Kossuth Lajos tér 1–3.", coordinates: [19.0452, 47.507] as [number, number] };
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ suggestions: [{ name: "Más hely", mapbox_id: "other" }] }) });
    vi.stubGlobal("fetch", fetchMock);
    try {
      expect(await findSamplePlace(point, "pk.test", new AbortController().signal)).toBeNull(); expect(fetchMock).toHaveBeenCalledOnce();
      expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("q")).toBe("Országház Budapest");
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ suggestions: [{ name: "Országház", mapbox_id: "wrong-location" }] }) });
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ features: [{ geometry: { type: "Point", coordinates: [20, 48] }, properties: { mapbox_id: "wrong-location", name: "Országház" } }] }) });
      expect(await findSamplePlace(point, "pk.test", new AbortController().signal)).toBeNull();
    } finally { vi.unstubAllGlobals(); }
  });
});
