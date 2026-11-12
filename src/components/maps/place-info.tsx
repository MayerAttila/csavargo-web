import { HiOutlineClock, HiOutlineStar, HiOutlineBanknotes, HiOutlineGlobeAlt, HiOutlineChevronRight } from "react-icons/hi2";
import { formatOpeningHours } from "./place-metadata";
import type { MapPoint } from "./types";

export type PlaceInfoStatus = "loading" | "error";
export function PlaceInfoPanel({ point, status, onRetry }: { point: MapPoint; status?: PlaceInfoStatus; onRetry: () => void }) {
  const info = point.info;
  return <section aria-label={`${point.label} adatai`} className="mx-3 border-t border-brand/15 pb-4 pt-3 text-xs text-foreground">
    {point.address && <p className="mb-3 leading-relaxed text-muted-foreground">{point.address}</p>}
    {status === "loading" ? <p role="status" className="text-muted-foreground">Helyadatok betöltése…</p> : status === "error" ? <button type="button" onClick={onRetry} className="min-h-10 rounded-lg px-2 text-brand hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-brand">Helyadatok újrapróbálása</button> : <>
      {info?.categories?.length ? <p className="mb-3 text-muted-foreground">{info.categories.join(" · ")}</p> : null}
      <dl className="space-y-3">
        <div className="flex items-center justify-between gap-2"><dt className="flex items-center gap-2 text-muted-foreground"><HiOutlineStar aria-hidden="true" className="size-4" />Értékelés</dt><dd>{info?.rating !== undefined ? `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(info.rating)} / 5` : "Nincs adat"}</dd></div>
        <div className="flex items-center justify-between gap-2"><dt className="flex items-center gap-2 text-muted-foreground"><HiOutlineBanknotes aria-hidden="true" className="size-4" />Árszint</dt><dd>{info?.priceLevel ? <span title="A szolgáltató relatív árszintje; nem konkrét belépő- vagy fogyasztási ár.">{info.priceLevel}</span> : "Nincs adat"}</dd></div>
      </dl>
      {info?.openingHours?.length ? <details className="group/hours mt-3"><summary className="flex min-h-4 cursor-pointer list-none items-center justify-between gap-2 rounded text-muted-foreground focus-visible:outline-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><HiOutlineClock aria-hidden="true" className="size-4 shrink-0" />Nyitvatartás</span><HiOutlineChevronRight aria-hidden="true" className="size-3.5 shrink-0 transition-transform group-open/hours:rotate-90 motion-reduce:transition-none" /></summary>
        <dl className="mt-1 space-y-1.5">{formatOpeningHours(info.openingHours).map(({ day, hours }) => <div key={day} className="flex justify-between gap-2"><dt className="text-muted-foreground">{day}</dt><dd className="text-right">{hours}</dd></div>)}</dl>
      </details> : <p className="mt-3 flex justify-between gap-2"><span className="flex items-center gap-2 text-muted-foreground"><HiOutlineClock aria-hidden="true" className="size-4" />Nyitvatartás</span><span>Nincs adat</span></p>}
      {(info?.phone || info?.website) && <div className="mt-3 flex items-center justify-between gap-2">
        {info.phone && <p className="min-w-0 break-words text-muted-foreground">Telefon: <span className="text-foreground">{info.phone}</span></p>}
        {info.website && <a href={info.website} target="_blank" rel="noopener noreferrer" aria-label="Hivatalos weboldal" title="Hivatalos weboldal"
          className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-lg text-brand transition-colors hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-brand"><HiOutlineGlobeAlt aria-hidden="true" className="size-4" /></a>}
      </div>}
    </>}
  </section>;
}
