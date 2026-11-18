import { useEffect, useState } from "react";
import { HiOutlineBuildingLibrary, HiOutlineBuildingOffice2, HiOutlineEllipsisHorizontal, HiOutlineMapPin, HiOutlineSquares2X2 } from "react-icons/hi2";
import { PiCoffee, PiForkKnife, PiTree } from "react-icons/pi";
import { mapErrorMessage } from "@/components/maps/map-errors";
import { listPlaceCategories, type PlaceCategory } from "@/components/maps/search-api";

const quickFilters = [
  { id: "", label: "Összes", Icon: HiOutlineSquares2X2 },
  { id: "tourist_attraction", label: "Látnivalók", Icon: HiOutlineMapPin },
  { id: "museum", label: "Múzeumok", Icon: HiOutlineBuildingLibrary },
  { id: "restaurant", label: "Éttermek", Icon: PiForkKnife },
  { id: "coffee_shop", label: "Kávézók", Icon: PiCoffee },
  { id: "park", label: "Parkok", Icon: PiTree },
  { id: "lodging", label: "Szállások", Icon: HiOutlineBuildingOffice2 },
];

function filterClass(selected: boolean) {
  return `flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-brand ${selected
    ? "border-transparent bg-action text-white" : "border-border/80 bg-surface-alt/55 text-foreground hover:bg-surface-alt"}`;
}

export function TripCategoryFilters({ token, selected, onSelect }: {
  token: string; selected: PlaceCategory | null; onSelect: (value: PlaceCategory | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<PlaceCategory[]>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const customSelected = selected && !quickFilters.some(({ id }) => id === selected.id);

  useEffect(() => {
    if (!open || catalog) return;
    const controller = new AbortController();
    void listPlaceCategories(token, controller.signal).then((items) => {
      if (!controller.signal.aborted) setCatalog(items);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(mapErrorMessage(reason));
    });
    return () => controller.abort();
  }, [open, catalog, token, attempt]);

  return <div className="space-y-2">
    <div role="group" aria-label="Térképes kategóriák" className="flex flex-wrap gap-1.5">
      {quickFilters.map(({ id, label, Icon }) => {
        const active = (selected?.id ?? "") === id;
        return <button key={id} type="button" aria-pressed={active} className={filterClass(active)}
          onClick={() => { onSelect(id ? { id, label } : null); setOpen(false); }}>
          <Icon aria-hidden="true" className="size-4 shrink-0" />{label}
        </button>;
      })}
      <button type="button" aria-expanded={open} className={filterClass(Boolean(customSelected))}
        onClick={() => { setError(undefined); setOpen((value) => !value); }}>
        <HiOutlineEllipsisHorizontal aria-hidden="true" className="size-4 shrink-0" />
        {customSelected ? selected.label : "Továbbiak"}
      </button>
    </div>
    {open && <div className="rounded-xl border border-border/80 bg-background/60 p-2.5">
      {catalog ? <label className="flex flex-wrap items-center gap-2 text-xs font-medium">
        Kategória
        <select value={selected?.id ?? ""} className="h-10 min-w-0 flex-1 basis-40 rounded-lg border border-border bg-surface px-2 text-sm"
          onChange={(event) => {
            const category = catalog.find(({ id }) => id === event.target.value);
            onSelect(category ?? null);
            setOpen(false);
          }}>
          <option value="">Összes</option>
          {catalog.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label> : error ? <p role="status" className="text-xs text-muted-foreground">{error}{" "}
        <button type="button" className="font-semibold text-brand" onClick={() => { setError(undefined); setAttempt((value) => value + 1); }}>Újrapróbálás</button>
      </p> : <p role="status" className="text-xs text-muted-foreground">Kategóriák betöltése…</p>}
    </div>}
  </div>;
}
