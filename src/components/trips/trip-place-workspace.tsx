import { useState, type Ref } from "react";
import { HiOutlineCheck, HiOutlineListBullet, HiOutlineMap, HiOutlineMapPin, HiOutlinePlus, HiOutlineStar } from "react-icons/hi2";
import { MapCanvas } from "@/components/maps/map-canvas";
import { PlaceSearch } from "@/components/maps/place-search";
import type { MapCameraCommand, MapPoint } from "@/components/maps/types";

type Props = {
  token: string;
  activeDay?: number;
  canPlan: boolean;
  points: MapPoint[];
  candidate?: MapPoint;
  selectedId?: string;
  camera?: MapCameraCommand;
  searchRef: Ref<HTMLInputElement>;
  onSelect: (point: MapPoint) => void;
  onAdd: () => void;
};

const views = [
  { id: "map", label: "Térkép", Icon: HiOutlineMap },
  { id: "list", label: "Lista nézet", Icon: HiOutlineListBullet },
] as const;
const ratingFormat = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 });

export function TripPlaceWorkspace({ token, activeDay, canPlan, points, candidate, selectedId, camera, searchRef, onSelect, onAdd }: Props) {
  const [view, setView] = useState<"map" | "list">("map");

  return <section aria-label="Helyek kiválasztása" className="min-w-0 space-y-3 rounded-2xl border border-border/80 bg-surface p-3 shadow-sm sm:p-4">
    <div className="flex flex-wrap items-start gap-3">
      <div role="group" aria-label="Helyek nézete" className="flex shrink-0 gap-0.5 rounded-xl border border-border/80 bg-background/70 p-1">
        {views.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}
          className={`flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand ${view === id ? "bg-action text-white shadow-sm" : "text-muted-foreground hover:bg-surface-alt hover:text-foreground"}`}>
          <Icon aria-hidden="true" className="size-4" />{label}
        </button>)}
      </div>
      {canPlan ? <div className="min-w-0 flex-[1_1_15rem]">
        <PlaceSearch key={activeDay} token={token} onSelect={onSelect} label="Látnivaló keresése" inputRef={searchRef} />
      </div> : <p className="flex min-h-10 flex-1 basis-40 items-center text-sm text-muted-foreground">Válassz úti célt és időszakot a látnivalók hozzáadásához.</p>}
    </div>
    <div hidden={view !== "map"}>
      <MapCanvas token={token} points={points} selectedId={selectedId} cameraCommand={camera}
        onSelect={(id) => { const point = points.find((item) => item.id === id); if (point) onSelect(point); }}
        onPlaceSelect={canPlan ? onSelect : undefined}
        missingTokenHint="Az úti cél és a látnivalók kereséséhez be kell állítani a térképszolgáltatást."
        className="h-[46svh] min-h-72 lg:h-[clamp(24rem,55svh,44rem)]" />
    </div>
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
    {candidate && <section aria-label="Kiválasztott hely" className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-surface-alt/50 p-3 sm:p-4">
      <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brand/12 text-brand">
        <HiOutlineMapPin className="size-6" />
      </span>
      <div className="min-w-0 flex-[1_1_10rem]">
        <h2 className="wrap-break-word text-base font-semibold tracking-tight">{candidate.label}</h2>
        {candidate.address && <p className="mt-0.5 wrap-break-word text-sm text-muted-foreground">{candidate.address}</p>}
        {candidate.info?.rating !== undefined && <p className="mt-1 flex items-center gap-1.5 text-xs font-medium">
          <HiOutlineStar aria-hidden="true" className="size-4 text-amber-500" />
          {ratingFormat.format(candidate.info.rating)} / 5
        </p>}
      </div>
      <button type="button" onClick={onAdd} disabled={Boolean(selectedId)}
        className="flex min-h-10 items-center gap-1.5 rounded-xl bg-action px-3 text-xs font-semibold text-white hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:bg-surface-alt disabled:text-muted-foreground">
        {selectedId ? <><HiOutlineCheck aria-hidden="true" className="size-4" /> A napi programban szerepel</>
          : <><HiOutlinePlus aria-hidden="true" className="size-4" /> Hozzáadás ehhez a naphoz</>}
      </button>
    </section>}
  </section>;
}
