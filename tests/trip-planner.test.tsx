import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TripPlanner } from "@/components/trips/trip-planner";
import type { MapCanvasProps } from "@/components/maps/map-canvas";
import type { MapPoint } from "@/components/maps/types";
import { notify } from "@/lib/notifications";

const pecs: MapPoint = { id: "pecs", label: "Pécs", coordinates: [18.23, 46.07] };
const budapest: MapPoint = { id: "budapest", label: "Budapest", coordinates: [19.04, 47.49] };
const square: MapPoint = { id: "mapbox:square", label: "Széchenyi tér", coordinates: [18.228, 46.076] };
const gallery: MapPoint = { id: "mapbox:gallery", label: "Zsolnay Negyed", coordinates: [18.247, 46.077] };

vi.mock("@/components/maps/place-search", () => ({
  PlaceSearch: ({ label, onSelect }: { label: string; onSelect: (point: MapPoint) => void }) => (
    <div aria-label={label} role="group">
      {(label.startsWith("Úti cél") ? [pecs, budapest] : [square]).map((point) =>
        <button type="button" key={point.id} onClick={() => onSelect(point)}>{point.label}</button>)}
    </div>
  ),
}));

vi.mock("@/components/maps/map-canvas", () => ({
  MapCanvas: ({ cameraCommand, onPlaceSelect, onSelect, points }: MapCanvasProps) => (
    <section aria-label="Teszt térkép">
      <output aria-label="Térképnézet">{JSON.stringify(cameraCommand)}</output>
      <button type="button" disabled={!onPlaceSelect} onClick={() => onPlaceSelect?.(gallery)}>Zsolnay jelölő</button>
      <button type="button" disabled={!onPlaceSelect} onClick={() => onPlaceSelect?.({ ...square, id: "poi:square" })}>Széchenyi jelölő</button>
      {points.map((point) => <button type="button" key={point.id} onClick={() => onSelect(point.id)}>Tervezett: {point.label}</button>)}
    </section>
  ),
}));

vi.mock("@/lib/notifications", () => ({ notify: { error: vi.fn() } }));

afterEach(() => vi.restoreAllMocks());

const button = (name: string) => screen.getByRole("button", { name, exact: true });
const dayList = (day: number) => screen.getByRole("list", { name: `${day}. nap helyszínei` });

async function setDates(user: ReturnType<typeof userEvent.setup>, start: string, end: string) {
  fireEvent.change(screen.getByLabelText("Kezdő dátum"), { target: { value: start } });
  fireEvent.change(screen.getByLabelText("Záró dátum"), { target: { value: end } });
  await user.click(button("Időszak beállítása"));
}

describe("V25: kirándulástervező", () => {
  it("adds search and map picks explicitly, prevents same-day duplicates, and keeps each day ordered independently", async () => {
    const user = userEvent.setup();
    render(<TripPlanner />);
    expect(button("Zsolnay jelölő")).toBeDisabled();
    await user.click(button("Pécs"));
    expect(screen.getByLabelText("Térképnézet")).toHaveTextContent("[18.23,46.07]");
    await setDates(user, "2026-11-18", "2026-11-19");
    expect(screen.getByRole("group", { name: "Napválasztó" })).toHaveTextContent("1. nap / 2");

    await user.click(button("Széchenyi tér"));
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    await user.click(button("Hozzáadás ehhez a naphoz"));
    await user.click(button("Széchenyi jelölő"));
    expect(button("A napi programban szerepel")).toBeDisabled();
    await user.click(button("Zsolnay jelölő"));
    await user.click(button("Hozzáadás ehhez a naphoz"));
    await user.click(button("Zsolnay Negyed előrébb"));
    expect(within(dayList(1)).getAllByRole("listitem")[0]).toHaveTextContent("Zsolnay Negyed");

    await user.click(button("Következő nap"));
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tervezett: Zsolnay Negyed" })).not.toBeInTheDocument();
    await user.click(button("Széchenyi jelölő"));
    await user.click(button("Hozzáadás ehhez a naphoz"));
    expect(dayList(2)).toHaveTextContent("Széchenyi tér");

    await user.click(button("Előző nap"));
    expect(button("Tervezett: Zsolnay Negyed")).toBeInTheDocument();
    expect(screen.getByLabelText("Térképnézet")).toHaveTextContent('"type":"fit"');
    await user.click(button("Széchenyi tér törlése"));
    expect(dayList(1)).not.toHaveTextContent("Széchenyi tér");
    await user.click(button("Következő nap"));
    expect(dayList(2)).toHaveTextContent("Széchenyi tér");
  });

  it("preserves the draft across destination changes and only discards populated days after confirmation", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { unmount } = render(<TripPlanner />);
    await user.click(button("Pécs"));
    await setDates(user, "2026-11-18", "2026-11-20");
    await setDates(user, "2026-11-18", "2026-11-19");
    expect(confirm).not.toHaveBeenCalled();
    await user.click(button("Következő nap"));
    await user.click(button("Zsolnay jelölő"));
    await user.click(button("Hozzáadás ehhez a naphoz"));

    await user.click(button("Budapest"));
    expect(dayList(2)).toHaveTextContent("Zsolnay Negyed");
    expect(screen.getByLabelText("Térképnézet")).toHaveTextContent("[19.04,47.49]");
    await setDates(user, "2026-11-19", "2026-11-18");
    expect(notify.error).toHaveBeenCalled();
    await setDates(user, "2026-11-19", "2026-11-20");
    expect(dayList(1)).toHaveTextContent("Zsolnay Negyed");
    expect(screen.getByRole("group", { name: "Napválasztó" })).toHaveTextContent("2026. november 19.");
    await setDates(user, "2026-11-20", "2026-11-20");
    expect(dayList(1)).toHaveTextContent("Zsolnay Negyed");
    expect(screen.getByLabelText("Kezdő dátum")).toHaveValue("2026-11-19");
    await setDates(user, "2026-11-20", "2026-11-20");
    expect(button("Előző nap")).toBeDisabled();
    expect(button("Következő nap")).toBeDisabled();
    await setDates(user, "2026-11-19", "2026-11-20");
    await user.click(button("Előző nap"));
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    unmount();
    render(<TripPlanner />);
    expect(screen.getByLabelText("Kezdő dátum")).toHaveValue("");
    expect(screen.getByRole("group", { name: "Úti cél keresése" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Napválasztó" })).not.toBeInTheDocument();
  });

  it("counts calendar days inclusively across a daylight-saving transition", async () => {
    const user = userEvent.setup();
    render(<TripPlanner />);
    await setDates(user, "2026-03-28", "2026-03-30");
    expect(screen.getByRole("group", { name: "Napválasztó" })).toHaveTextContent("1. nap / 3");
    await user.click(button("Következő nap"));
    await user.click(button("Következő nap"));
    expect(screen.getByRole("group", { name: "Napválasztó" })).toHaveTextContent("2026. március 30.");
    expect(button("Következő nap")).toBeDisabled();
  });
});
