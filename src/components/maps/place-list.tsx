import { HiOutlineTrash } from "react-icons/hi2";
import type { MapPoint } from "./types";
import { PlaceInfoPanel, type PlaceInfoStatus } from "./place-info";

export function PlaceList({ points, selectedId, onSelect, onRemove, infoStates }: { points: MapPoint[]; selectedId?: string; onSelect: (id: string) => void; onRemove: (id: string) => void; infoStates?: Record<string, PlaceInfoStatus | undefined> }) {
  return <div>
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Helyek <span className="ml-1 text-brand">{points.length}</span></h2>
    {points.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Még nincs hely a listán. Keress rá egy helyre, vagy kattints a térképre.</p> :
      <ul aria-label="Felvett helyek" className="space-y-1">{points.map((point, index) => <li key={point.id}
        className={`rounded-xl transition-colors ${point.id === selectedId ? "bg-brand/10 text-brand" : "hover:bg-surface-alt"}`}>
        <div className="flex items-center">
        <button type="button" aria-label={`Hely megnyitása: ${point.label}`} aria-pressed={point.id === selectedId} aria-expanded={point.id === selectedId} onClick={() => onSelect(point.id)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-3 pl-3 pr-1 text-left focus-visible:outline-2 focus-visible:outline-brand">
          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-xs font-bold text-brand">{index + 1}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{point.label}</span><span className="block truncate text-xs text-muted-foreground">{point.address ?? (point.source === "map" ? "Térképen kiválasztott hely" : "Egyéni térképpont")}</span></span>
        </button>
        <button type="button" aria-label={`${point.label} eltávolítása`} title="Hely eltávolítása" onClick={() => onRemove(point.id)}
          className="mr-1 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-500 dark:hover:text-red-400">
          <HiOutlineTrash aria-hidden="true" className="size-4" />
        </button>
        </div>
        {point.id === selectedId && <PlaceInfoPanel point={point} status={infoStates?.[point.id]} onRetry={() => onSelect(point.id)} />}
      </li>)}</ul>}
  </div>;
}
