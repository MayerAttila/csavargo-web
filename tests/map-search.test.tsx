import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlaceSearch } from "@/components/maps/place-search";
import { mapErrorMessage } from "@/components/maps/map-errors";
import { retrievePlace } from "@/components/maps/search-api";

const { error } = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ notify: { error } }));
const suggestion = { mapbox_id: "budapest", name: "Budapest", place_formatted: "Magyarország" };
const feature = { geometry: { type: "Point", coordinates: [19.04, 47.49] }, properties: { mapbox_id: "budapest", name: "Budapest", full_address: "Budapest, Magyarország" } };
let fetchMock: ReturnType<typeof vi.fn>;
function response(data: unknown, status = 200) { return { ok: status === 200, status, json: async () => data }; }
async function advance(ms = 350) { await act(async () => { vi.advanceTimersByTime(ms); }); }
function search(value: string) { fireEvent.change(screen.getByRole("combobox"), { target: { value } }); }
beforeEach(() => {
  vi.useFakeTimers(); error.mockClear(); fetchMock = vi.fn().mockResolvedValue(response({ suggestions: [suggestion] })); vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("V20: Mapbox search", () => {
  it("debounces 350ms, requires 3 characters, and uses Hungarian with a shared suggest/retrieve session", async () => {
    const onSelect = vi.fn();
    render(<PlaceSearch token="pk.test" onSelect={onSelect} />);
    search("Bu"); await advance(); expect(fetchMock).not.toHaveBeenCalled();
    search("Bud"); await advance(349); expect(fetchMock).not.toHaveBeenCalled(); await advance(1);
    const first = new URL(fetchMock.mock.calls[0][0]);
    expect(first.searchParams.get("limit")).toBe("5"); expect(first.searchParams.get("language")).toBe("hu");
    expect(first.searchParams.get("session_token")).toMatch(/^[\da-f-]{36}$/);
    fetchMock.mockResolvedValueOnce(response({ features: [feature] }));
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-activedescendant");
    await act(async () => { fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" }); });
    const retrieve = new URL(fetchMock.mock.calls[1][0]);
    expect(retrieve.pathname).toContain("retrieve/budapest");
    expect(retrieve.searchParams.get("session_token")).toBe(first.searchParams.get("session_token"));
    expect(retrieve.searchParams.get("attribute_sets")).toBe("visit,venue");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "mapbox:budapest", label: "Budapest", coordinates: [19.04, 47.49], address: "Budapest, Magyarország", source: "search" }));
    search("Buda"); await advance();
    expect(new URL(fetchMock.mock.calls[2][0]).searchParams.get("session_token")).not.toBe(first.searchParams.get("session_token"));
  });
  it("aborts old work and ignores late responses even when the transport ignores abort", async () => {
    let resolveOld!: (value: unknown) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    render(<PlaceSearch token="pk.test" onSelect={vi.fn()} />);
    search("Bud"); await advance(); const signal = fetchMock.mock.calls[0][1].signal;
    search("Paris"); expect(signal.aborted).toBe(true); await advance();
    await act(async () => { resolveOld(response({ suggestions: [{ ...suggestion, name: "Régi találat" }] })); });
    expect(screen.queryByText("Régi találat")).not.toBeInTheDocument(); expect(screen.getByRole("option")).toHaveTextContent("Budapest");
  });
  it("cancels an in-flight retrieve when the query changes and on unmount", async () => {
    const onSelect = vi.fn(); let resolveRetrieve!: (value: unknown) => void;
    const { unmount } = render(<PlaceSearch token="pk.test" onSelect={onSelect} />);
    search("Bud"); await advance(); fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolveRetrieve = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: /Budapest/ }));
    const signal = fetchMock.mock.calls[1][1].signal;
    search("Paris"); expect(signal.aborted).toBe(true);
    await act(async () => { resolveRetrieve(response({ features: [feature] })); });
    expect(onSelect).not.toHaveBeenCalled(); await advance();
    const latestSignal = fetchMock.mock.calls[2][1].signal; unmount(); expect(latestSignal.aborted).toBe(true);
  });
  it("closes on Escape and rotates expired sessions", async () => {
    render(<PlaceSearch token="pk.test" onSelect={vi.fn()} />);
    search("Bud"); await advance(); const oldSession = new URL(fetchMock.mock.calls[0][0]).searchParams.get("session_token");
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" }); expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await advance(180_000); search("Buda"); await advance();
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get("session_token")).not.toBe(oldSession);
  });
  it("disables unconfigured search, reports safe errors and supports retry", async () => {
    const { rerender } = render(<PlaceSearch token="" onSelect={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeDisabled(); rerender(<PlaceSearch token="pk.test" onSelect={vi.fn()} />);
    fetchMock.mockResolvedValueOnce(response({}, 429)); search("Bud"); await advance();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("korlát"), { id: "map-search" });
    fireEvent.click(screen.getByRole("button", { name: "Újra" })); await advance(); expect(screen.getByRole("option")).toBeInTheDocument();
    expect(mapErrorMessage({ status: 401 })).toContain("hozzáférése"); expect(mapErrorMessage(new Error("secret"))).toContain("internetkapcsolatot");
  });
  it("rejects malformed coordinates from the provider", async () => {
    fetchMock.mockResolvedValueOnce(response({ features: [{ ...feature, geometry: { type: "Point", coordinates: [19, 999] } }] }));
    await expect(retrievePlace("test", "pk.test", "session", new AbortController().signal)).rejects.toThrow();
  });
  it("refreshes expired suggestions instead of retrieving with an expired session", async () => {
    render(<PlaceSearch token="pk.test" onSelect={vi.fn()} />);
    search("Bud"); await advance(); await advance(180_000);
    fireEvent.click(screen.getByRole("button", { name: /Budapest/ }));
    expect(error).toHaveBeenCalledWith(expect.stringContaining("elévültek"), { id: "map-search" });
    await advance(); expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([url]) => new URL(url).pathname.endsWith("suggest"))).toBe(true);
  });
});
