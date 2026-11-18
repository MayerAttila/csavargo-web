import { useCallback, useMemo, useState } from "react";
import { HiOutlineCheck, HiOutlineListBullet, HiOutlineMap, HiOutlineMapPin, HiOutlinePlus } from "react-icons/hi2";
import { MapCanvas } from "@/components/maps/map-canvas";
import { isPublicMapToken } from "@/components/maps/map-errors";
import { sameMapPlace } from "@/components/maps/map-poi";
import { PlaceInfoPanel } from "@/components/maps/place-info";
import { PlaceSearch } from "@/components/maps/place-search";
import type { PlaceCategory } from "@/components/maps/search-api";
import type { MapBounds, MapCameraCommand, MapPoint } from "@/components/maps/types";
import { lodgingCategory, TripCategoryFilters } from "./trip-category-filters";
import { TripPlaceSummary } from "./trip-place-summary";
import { useTripCategoryPlaces } from "./use-trip-category-places";
import type { TripPlaceInfo } from "./use-trip-place-info";

type Props = {
  token: string;
  activeDay?: number;
  points: MapPoint[];
  lodging?: MapPoint;
  candidate?: TripPlaceInfo;
  selectedId?: string;
  camera?: MapCameraCommand;
  view: "map" | "list";
  onViewChange: (view: "map" | "list") => void;
  onLodgingPick?: (point: MapPoint) => void;
  onCancelLodgingPick: () => void;
  onSelect: (point: MapPoint) => void;
  onAdd: () => void;
};

const views = [
  { id: "map", label: "Térkép", Icon: HiOutlineMap },
  { id: "list", label: "Lista nézet", Icon: HiOutlineListBullet },
] as const;
const emptyPoints: MapPoint[] = [];

export function TripPlaceWorkspace({ token, activeDay, points, lodging, candidate, selectedId, camera, view, onViewChange,
  onLodgingPick, onCancelLodgingPick, onSelect, onAdd }: Props) {
  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [bounds, setBounds] = useState<MapBounds>();
  const showFilters = view === "map" && isPublicMapToken(token);
  const mapCategory = onLodgingPick ? lodgingCategory : category;
  const categoryId = showFilters ? mapCategory?.id : undefined;
  const mapPoints = onLodgingPick ? emptyPoints : points;
  const { current: results, retry } = useTripCategoryPlaces(categoryId, bounds, token);
  const resultCount = results?.points?.length;
  const discoveryPoints = useMemo(() => results?.points?.filter((result) =>
    !mapPoints.some((point) => sameMapPlace(result, point))), [results, mapPoints]);
  const updateBounds = useCallback((next: MapBounds | undefined) => {
    setBounds((current) => next && current?.every((value, index) => value === next[index]) ? current : next);
  }, []);
  const selectOnMap = onLodgingPick ?? onSelect;

  return <section aria-label="Helyek kiválasztása" className="min-w-0 space-y-3 rounded-2xl border border-border/80 bg-surface p-3 shadow-sm sm:p-4">
    <div className="flex flex-wrap items-start gap-3">
      <div role="group" aria-label="Helyek nézete" className="flex shrink-0 gap-0.5 rounded-xl border border-border/80 bg-background/70 p-1">
        {views.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={view === id} onClick={() => onViewChange(id)}
          className={`flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand ${view === id ? "bg-action text-white shadow-sm" : "text-muted-foreground hover:bg-surface-alt hover:text-foreground"}`}>
          <Icon aria-hidden="true" className="size-4" />{label}
        </button>)}
      </div>
      <div className="min-w-0 flex-[1_1_15rem]">
        <PlaceSearch key={activeDay} token={token} onSelect={onSelect} label="Látnivaló keresése" />
      </div>
    </div>
    {showFilters && <fieldset disabled={Boolean(onLodgingPick)} className="min-w-0">
      <TripCategoryFilters token={token} selected={mapCategory} onSelect={setCategory} />
    </fieldset>}
    {onLodgingPick && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand/10 px-3 py-2 text-sm">
      <p role="status">Kattints a szállásra vagy a helyére a térképen.</p>
      <button type="button" onClick={onCancelLodgingPick}
        className="rounded-lg px-2 py-1 font-medium hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-brand">Mégse</button>
    </div>}
    <div hidden={view !== "map"}>
      <MapCanvas token={token} points={mapPoints} lodging={lodging} selectedId={selectedId} cameraCommand={camera}
        onSelect={(id) => { const point = points.find((item) => item.id === id); if (point) selectOnMap(point); }}
        onPlaceSelect={selectOnMap}
        onMapClick={onLodgingPick ? ([longitude, latitude]) => {
          const lng = longitude >= -180 && longitude <= 180 ? longitude : ((longitude + 180) % 360 + 360) % 360 - 180;
          onLodgingPick({
            id: `lodging:${lng},${latitude}`, label: "Térképen megjelölt szállás", coordinates: [lng, latitude],
          });
        } : undefined}
        onViewportChange={updateBounds} discoveryPoints={discoveryPoints} selectedDiscoveryId={candidate?.point.id}
        showLodgingLabels={categoryId === lodgingCategory.id}
        hideBasemapPlaces={Boolean(categoryId)}
        missingTokenHint="Az úti cél és a látnivalók kereséséhez be kell állítani a térképszolgáltatást."
        className="h-[46svh] min-h-72 lg:h-[clamp(24rem,55svh,44rem)]" />
    </div>
    {categoryId && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <p role="status">{!bounds ? "A kategóriakereséshez be kell töltődnie a térképnek."
        : results?.error ?? (resultCount === undefined ? "Közeli helyek keresése…"
          : resultCount ? `${resultCount} találat a térképen` : "Nincs találat ezen a térképterületen.")}</p>
      {results?.error && <button type="button" className="rounded px-1 font-semibold text-brand focus-visible:outline-2" onClick={retry}>Újrapróbálás</button>}
    </div>}
    {view === "list" && <section aria-label="A nap helyei" className="min-h-72 space-y-3 rounded-xl border border-border/70 bg-background/55 p-4">
      <h2 className="text-sm font-semibold">A nap helyei</h2>
      {points.length ? <ol className="grid gap-2 xl:grid-cols-2">
        {points.map((point, index) => <li key={point.id} className="min-w-0">
          <button type="button" aria-pressed={point.id === selectedId} onClick={() => onSelect(point)}
            className={`flex min-h-14 w-full items-center gap-2.5 rounded-xl border p-2.5 text-left focus-visible:outline-2 focus-visible:outline-brand ${point.id === selectedId ? "border-brand/60 bg-brand/10" : "border-border/80 bg-surface hover:bg-surface-alt"}`}>
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-xs font-bold text-brand">{index + 1}</span>
            <span className="min-w-0">
              <span className="block wrap-break-word text-sm font-semibold">{point.label}</span>
              {point.address && <span className="block wrap-break-word text-xs text-muted-foreground">{point.address}</span>}
            </span>
          </button>
        </li>)}
      </ol> : <p className="text-sm text-muted-foreground">A kiválasztott naphoz még nincs hozzáadott hely.</p>}
    </section>}
    {candidate && <section aria-label="Kiválasztott hely" className="space-y-3 rounded-xl border border-border/80 bg-surface-alt/50 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brand/12 text-brand">
          <HiOutlineMapPin className="size-6" />
        </span>
        <div className="min-w-0 flex-[1_1_10rem]">
          <h2 className="wrap-break-word text-base font-semibold tracking-tight">{candidate.point.label}</h2>
          <TripPlaceSummary point={candidate.point} />
        </div>
        <button type="button" onClick={onAdd} disabled={Boolean(selectedId)}
          className="flex min-h-10 items-center gap-1.5 rounded-xl bg-action px-3 text-xs font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:bg-surface-alt disabled:text-muted-foreground">
          {selectedId ? <><HiOutlineCheck aria-hidden="true" className="size-4" /> A napi programban szerepel</>
            : <><HiOutlinePlus aria-hidden="true" className="size-4" /> Hozzáadás ehhez a naphoz</>}
        </button>
      </div>
      <PlaceInfoPanel {...candidate} layout="grid" className="border-t border-border/70 pt-3" />
    </section>}
  </section>;
}
