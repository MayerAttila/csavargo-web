import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TripForm } from "@/components/trips/trip-form";
import { TripPlanner } from "@/components/trips/trip-planner";
import type { MapCanvasProps } from "@/components/maps/map-canvas";
import type { MapPoint } from "@/components/maps/types";
import { getTripPlan, saveTripPlan, type SavedTripPlan } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { findSamplePlace, listPlaceCategories, searchPlaceCategory } from "@/components/maps/search-api";

const pecs: MapPoint = { id: "pecs", label: "Pécs", coordinates: [18.23, 46.07] };
const budapest: MapPoint = { id: "budapest", label: "Budapest", coordinates: [19.04, 47.49] };
const square: MapPoint = { id: "mapbox:square", label: "Széchenyi tér", coordinates: [18.228, 46.076], info: { rating: 4.5 } };
const gallery: MapPoint = { id: "mapbox:gallery", label: "Zsolnay Negyed", coordinates: [18.247, 46.077], source: "map" };

vi.mock("@/components/maps/place-search", () => ({
  PlaceSearch: ({ label, onSelect, selectedValue }: { label: string; onSelect: (point: MapPoint) => void; selectedValue?: string }) => (
    <div aria-label={label} role="group">
      {label === "Szállás keresése" && <input aria-label={label} value={selectedValue ?? ""} readOnly />}
      {(label.startsWith("Úti cél") ? [pecs, budapest] : label === "Szállás keresése" ? [] : [square]).map((point) =>
        <button type="button" key={point.id} onClick={() => onSelect(point)}>{point.label}</button>)}
    </div>
  ),
}));

vi.mock("@/components/maps/map-canvas", () => ({
  MapCanvas: ({ cameraCommand, onMapClick, onPlaceSelect, onSelect, onViewportChange, points, discoveryPoints }: MapCanvasProps) => (
    <section aria-label="Teszt térkép">
      <output aria-label="Térképnézet">{JSON.stringify(cameraCommand)}</output>
      <button type="button" onClick={() => onViewportChange?.([18, 46, 19, 47])}>Térképterület megadása</button>
      <button type="button" disabled={!onPlaceSelect} onClick={() => onPlaceSelect?.(gallery)}>Zsolnay jelölő</button>
      {onMapClick && <button type="button" onClick={() => onMapClick([380, 46.075])}>Üres térképpont</button>}
      <button type="button" disabled={!onPlaceSelect} onClick={() => onPlaceSelect?.({ ...square, id: "poi:square" })}>Széchenyi jelölő</button>
      {points.map((point) => <button type="button" key={point.id} onClick={() => onSelect(point.id)}>Tervezett: {point.label}</button>)}
      {discoveryPoints?.map((point) => <button type="button" key={point.id} onClick={() => onPlaceSelect?.(point)}>Találat: {point.label}</button>)}
    </section>
  ),
}));

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/api", () => ({ createTrip: vi.fn(), getTripPlan: vi.fn(), saveTripPlan: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ notify: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/maps/search-api", () => ({ findSamplePlace: vi.fn(), searchPlaceCategory: vi.fn(), listPlaceCategories: vi.fn() }));

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllEnvs(); });

const button = (name: string) => screen.getByRole("button", { name, exact: true });
const dayButton = (day: number) => within(screen.getByRole("group", { name: "Napválasztó" }))
  .getByRole("button", { name: new RegExp(`^${day}\\. nap`) });
const dayList = (day: number) => screen.getByRole("list", { name: `${day}. nap helyszínei` });

const date = "2026-11-18";
function savedTrip(start = date, end = start): SavedTripPlan {
  return { slug: "pecs-2026-11", name: "Pécs", version: 1, plan: { destination: pecs, start, end, days: [] } };
}

describe("V25: kirándulástervező", () => {
  it("V31: chooses a mapped place or coordinate as lodging without adding a daily stop", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test");
    vi.mocked(searchPlaceCategory).mockImplementation(async (category) => category === "lodging" ? [gallery] : []);
    const user = userEvent.setup();
    const date = "2026-11-18";
    render(<TripPlanner slug="pecs-2026-11" initialSaved={{
      slug: "pecs-2026-11", name: "Pécs", version: 1,
      plan: { destination: pecs, start: date, end: date, days: [] },
    }} />);
    const pick = button("Szállás kiválasztása a térképen");
    await user.click(button("Múzeumok"));
    await user.click(button("Térképterület megadása"));
    await user.click(pick);
    expect(button("Szállások")).toHaveAttribute("aria-pressed", "true");
    expect(button("Múzeumok")).toBeDisabled();
    await user.click(await screen.findByRole("button", { name: "Találat: Zsolnay Negyed" }));
    expect(searchPlaceCategory).toHaveBeenCalledWith("lodging", [18, 46, 19, 47], "pk.test", expect.any(AbortSignal));
    expect(screen.getByRole("textbox", { name: "Szállás keresése" })).toHaveValue(gallery.label);
    expect(pick).toHaveAttribute("aria-pressed", "false");
    expect(button("Múzeumok")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("region", { name: "Kiválasztott hely" })).not.toBeInTheDocument();
    await user.click(pick);
    await user.click(button("Mégse"));
    expect(button("Múzeumok")).toHaveAttribute("aria-pressed", "true");
    await user.click(pick);
    await user.click(button("Üres térképpont"));
    expect(screen.getByRole("textbox", { name: "Szállás keresése" })).toHaveValue("Térképen megjelölt szállás");
    await user.click(pick);
    expect(screen.getByLabelText("Térképnézet")).toHaveTextContent(JSON.stringify({
      type: "view", view: { center: [20, 46.075], zoom: 15 },
    }));
  });

  it("V31: opens the map centered on the saved lodging independently of daily stops", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test");
    const user = userEvent.setup();
    const date = "2026-11-18";
    const lodging = { id: "hotel", label: "Pécsi Hotel", coordinates: [18.225, 46.074] } satisfies MapPoint;
    render(<TripPlanner slug="pecs-2026-11" initialSaved={{
      slug: "pecs-2026-11", name: "Pécs", version: 1,
      plan: { destination: pecs, lodging, start: date, end: date, days: [] },
    }} />);
    await user.click(button("Lista nézet"));
    await user.click(button("Szállás kiválasztása a térképen"));
    expect(button("Térkép")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Térképnézet")).toHaveTextContent(
      JSON.stringify({ type: "view", view: { center: lodging.coordinates, zoom: 15 } }),
    );
    expect(button("Terv mentése")).toBeDisabled();
  });

  it("retries an unavailable plan and restores the saved itinerary", async () => {
    const trip = savedTrip();
    trip.plan.days = [{ date, stops: [{ id: square.id, label: square.label, coordinates: square.coordinates }] }];
    vi.mocked(getTripPlan).mockRejectedValueOnce(new Error("TRIP_UNAVAILABLE")).mockResolvedValueOnce(trip);
    const user = userEvent.setup();
    render(<TripPlanner slug={trip.slug} />);
    await user.click(button("Újrapróbálás"));
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(screen.queryByRole("group", { name: "Napválasztó" })).not.toBeInTheDocument();
    await user.click(button("Újrapróbálás"));
    expect(await screen.findByRole("heading", { name: "Pécs" })).toBeVisible();
    expect(dayList(1)).toHaveTextContent("Széchenyi tér");
    expect(button("Terv mentése")).toBeDisabled();
    expect(saveTripPlan).not.toHaveBeenCalled();
  });

  it("keeps unsaved daily stops after a version conflict", async () => {
    const trip = savedTrip();
    vi.mocked(saveTripPlan).mockRejectedValueOnce(new Error("TRIP_CONFLICT"));
    const user = userEvent.setup();
    render(<TripPlanner slug={trip.slug} initialSaved={trip} />);
    await user.click(button("Széchenyi tér"));
    await user.click(button("Hozzáadás ehhez a naphoz"));
    await user.click(button("Terv mentése"));
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith(expect.stringContaining("máshol módosították"), expect.anything()));
    expect(dayList(1)).toHaveTextContent("Széchenyi tér");
    expect(button("Terv mentése")).toBeEnabled();
  });

  it("searches the visible map when a category is selected, cancels stale results, and keeps the itinerary", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test");
    let finishOld!: (points: MapPoint[]) => void;
    vi.mocked(searchPlaceCategory).mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
      .mockResolvedValue([square, gallery]);
    vi.mocked(listPlaceCategories).mockResolvedValue([{ id: "parking_lot", label: "Parkoló" }]);
    const user = userEvent.setup();
    render(<TripPlanner slug="pecs-2026-11" initialSaved={savedTrip()} />);
    await user.click(button("Térképterület megadása"));
    await user.click(button("Széchenyi tér"));
    await user.click(button("Hozzáadás ehhez a naphoz"));

    await user.click(button("Múzeumok"));
    await waitFor(() => expect(searchPlaceCategory).toHaveBeenCalledWith("museum", [18, 46, 19, 47], "pk.test", expect.any(AbortSignal)));
    const oldSignal = vi.mocked(searchPlaceCategory).mock.calls[0][3];
    await user.click(button("Továbbiak"));
    await user.selectOptions(await screen.findByRole("combobox", { name: "Kategória" }), "parking_lot");
    expect(oldSignal.aborted).toBe(true);
    expect(await screen.findByRole("button", { name: "Találat: Zsolnay Negyed" })).toBeVisible();
    await act(async () => finishOld([{ ...gallery, id: "stale", label: "Régi találat" }]));
    expect(screen.queryByRole("button", { name: "Találat: Régi találat" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Találat: Széchenyi tér" })).not.toBeInTheDocument();
    expect(button("Tervezett: Széchenyi tér")).toBeVisible();
    await user.click(button("Találat: Zsolnay Negyed"));
    await user.click(button("Hozzáadás ehhez a naphoz"));
    expect(dayList(1)).toHaveTextContent("Zsolnay Negyed");
    await user.click(button("Összes"));
    expect(button("Tervezett: Zsolnay Negyed")).toBeVisible();
  });
  it("adds search and map picks explicitly, prevents same-day duplicates, and keeps each day ordered independently", async () => {
    const user = userEvent.setup();
    render(<TripPlanner slug="pecs-2026-11" initialSaved={savedTrip(date, "2026-11-19")} />);
    expect(screen.getByLabelText("Térképnézet")).toHaveTextContent("[18.23,46.07]");
    expect(screen.getByRole("group", { name: "Napválasztó" })).toHaveTextContent("1. nap / 2");

    await user.click(button("Széchenyi tér"));
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    await user.click(button("Hozzáadás ehhez a naphoz"));
    expect(within(dayList(1)).queryByRole("button", { name: /átrendezése$/ })).not.toBeInTheDocument();
    await user.click(button("Széchenyi jelölő"));
    expect(button("A napi programban szerepel")).toBeDisabled();
    await user.click(button("Zsolnay jelölő"));
    await user.click(button("Hozzáadás ehhez a naphoz"));
    button("Zsolnay Negyed átrendezése").focus();
    await user.keyboard("{Enter}{ArrowUp}{Enter}");
    expect(within(dayList(1)).getAllByRole("listitem")[0]).toHaveTextContent("Zsolnay Negyed");

    await user.click(dayButton(2));
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tervezett: Zsolnay Negyed" })).not.toBeInTheDocument();
    await user.click(button("Széchenyi jelölő"));
    await user.click(button("Hozzáadás ehhez a naphoz"));
    expect(dayList(2)).toHaveTextContent("Széchenyi tér");

    await user.click(dayButton(1));
    expect(button("Tervezett: Zsolnay Negyed")).toBeInTheDocument();
    expect(screen.getByLabelText("Térképnézet")).toHaveTextContent('"type":"fit"');
    await user.click(button("Széchenyi tér törlése"));
    expect(dayList(1)).not.toHaveTextContent("Széchenyi tér");
    await user.click(dayButton(2));
    expect(dayList(2)).toHaveTextContent("Széchenyi tér");
  });

  it("counts calendar days inclusively across a daylight-saving transition", async () => {
    const user = userEvent.setup();
    render(<TripPlanner slug="pecs-2026-11" initialSaved={savedTrip("2026-03-28", "2026-03-30")} />);
    expect(screen.getByRole("group", { name: "Napválasztó" })).toHaveTextContent("1. nap / 3");
    await user.click(dayButton(3));
    expect(screen.getByRole("group", { name: "Napválasztó" })).toHaveTextContent("2026. március 30.");
    expect(dayButton(3)).toHaveAttribute("aria-pressed", "true");
  });

  it("lets every day in a longer trip be selected directly by date", async () => {
    render(<TripPlanner slug="pecs-2026-11" initialSaved={savedTrip(date, "2027-01-10")} />);
    const picker = screen.getByLabelText("Nap kiválasztása");
    expect(picker).toHaveAttribute("max", "2027-01-10");
    fireEvent.change(picker, { target: { value: "2027-01-10" } });
    expect(picker).toHaveValue("2027-01-10");
    expect(screen.getByRole("group", { name: "Napválasztó" })).toHaveTextContent("54. nap / 54");
  });

  it.each(["mouse", "touch"])("reorders by the drag handle with %s input and lets the user toggle place details", async (pointerType) => {
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test");
    vi.mocked(findSamplePlace).mockResolvedValue({ ...gallery, address: "Pécs, Zsolnay Vilmos utca", info: { rating: 4.8 } });
    const user = userEvent.setup();
    render(<TripPlanner slug="pecs-2026-11" initialSaved={savedTrip()} />);
    await user.click(button("Széchenyi tér"));
    await user.click(button("Hozzáadás ehhez a naphoz"));
    await user.click(button("Zsolnay jelölő"));
    await user.click(button("Hozzáadás ehhez a naphoz"));

    const list = dayList(1);
    const [first, second] = within(list).getAllByRole("listitem");
    vi.spyOn(list, "getBoundingClientRect").mockReturnValue({ left: 0, right: 300 } as DOMRect);
    vi.spyOn(first, "getBoundingClientRect").mockReturnValue({ top: 0, height: 50 } as DOMRect);
    vi.spyOn(second, "getBoundingClientRect").mockReturnValue({ top: 60, height: 50 } as DOMRect);
    const handle = button("Zsolnay Negyed átrendezése");
    expect(handle).toHaveTextContent("2");
    handle.setPointerCapture = vi.fn();
    const pointer = { button: 0, pointerId: 1, isPrimary: true, pointerType, clientX: 100 };
    fireEvent.pointerDown(handle, { ...pointer, clientY: 85 });
    fireEvent.pointerMove(handle, { ...pointer, clientY: 15 });
    fireEvent.pointerCancel(handle, pointer);
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("Széchenyi tér");
    fireEvent.pointerDown(handle, { ...pointer, clientY: 85 });
    fireEvent.pointerMove(handle, { ...pointer, clientY: 15 });
    fireEvent.pointerUp(handle, { ...pointer, clientY: 15 });
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("Zsolnay Negyed");
    expect(within(screen.getByRole("region", { name: "Teszt térkép" })).getAllByRole("button", { name: /^Tervezett/ })[0]).toHaveTextContent("Zsolnay Negyed");
    const preview = screen.getByRole("region", { name: "Kiválasztott hely" });
    expect(await within(preview).findByText("4,8", { exact: true })).toBeVisible();
    expect(preview).toHaveTextContent("Pécs, Zsolnay Vilmos utca");
    expect(findSamplePlace).toHaveBeenCalledTimes(1);

    await user.click(button("Zsolnay Negyed"));
    const details = within(list).getByRole("region", { name: "Zsolnay Negyed adatai" });
    expect(button("Zsolnay Negyed")).toHaveAccessibleDescription(/4,8/);
    expect(details).toHaveTextContent("Pécs, Zsolnay Vilmos utca");
    await user.click(button("Zsolnay Negyed"));
    expect(details).not.toBeInTheDocument();
    await user.click(button("Zsolnay Negyed"));
    expect(findSamplePlace).toHaveBeenCalledTimes(1);
    await user.click(within(list).getByRole("button", { name: "Széchenyi tér", exact: true }));
    expect(within(list).getByRole("button", { name: "Széchenyi tér", exact: true })).toHaveAccessibleDescription(/4,5/);
  });
});

describe("Utazás szerkesztése", () => {
  it("retains lodging and in-range stops, and confirms removing out-of-range days", async () => {
    const user = userEvent.setup();
    const trip = savedTrip(date, "2026-11-20");
    trip.plan.lodging = { id: "hotel", label: "Hotel", coordinates: [18.225, 46.074] };
    trip.plan.days = [{ date, stops: [gallery] }, { date: "2026-11-20", stops: [square] }];
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.mocked(saveTripPlan).mockResolvedValue(trip);
    render(<TripForm trip={trip} />);
    await user.click(button("Úti cél cseréje"));
    await user.click(button("Budapest"));
    fireEvent.change(screen.getByLabelText("Záró dátum"), { target: { value: "2026-11-17" } });
    await user.click(button("Módosítások mentése"));
    expect(notify.error).toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Záró dátum"), { target: { value: "2026-11-19" } });
    await user.click(button("Módosítások mentése"));
    expect(saveTripPlan).not.toHaveBeenCalled();
    await user.click(button("Módosítások mentése"));
    expect(saveTripPlan).toHaveBeenCalledWith(trip.slug, {
      ...trip.plan, destination: budapest, end: "2026-11-19", days: [trip.plan.days[0]],
    }, trip.version, trip.name);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/utazasok"));
  });
});
