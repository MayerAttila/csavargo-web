import type { ReactNode } from "react";
import { HiOutlineBanknotes, HiOutlineChevronRight, HiOutlineClock, HiOutlineGlobeAlt, HiOutlinePhone, HiOutlineStar } from "react-icons/hi2";
import { formatOpeningHours, formatOpeningHoursForDay } from "./place-metadata";
import type { MapPoint, OpeningPeriod } from "./types";

export type PlaceInfoStatus = "loading" | "error";
type Layout = "stack" | "grid";
const ratingFormat = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 });

function OpeningHours({ hours, layout }: { hours: OpeningPeriod[]; layout: Layout }) {
  return <details className={layout === "stack" ? "group/hours mt-3" : "group/hours"}>
    <summary className={`min-h-4 max-w-full cursor-pointer list-none items-center rounded focus-visible:outline-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden ${layout === "stack" ? "flex justify-between gap-2 text-muted-foreground" : "inline-flex gap-1.5 hover:text-brand"}`}>
      {layout === "stack"
        ? <span className="flex items-center gap-2"><HiOutlineClock aria-hidden="true" className="size-4 shrink-0" />Nyitvatartás</span>
        : <span className="min-w-0 wrap-break-word"><span className="font-medium">Ma:</span> {formatOpeningHoursForDay(hours, new Date().getDay())}</span>}
      <HiOutlineChevronRight aria-hidden="true" className={`size-3.5 shrink-0 transition-transform group-open/hours:rotate-90 motion-reduce:transition-none ${layout === "grid" ? "text-brand" : ""}`} />
    </summary>
    <dl className="mt-2 space-y-1.5">
      {formatOpeningHours(hours).map(({ day, hours }) => <div key={day} className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
        <dt className="text-muted-foreground">{day}</dt>
        <dd className="wrap-break-word">{hours}</dd>
      </div>)}
    </dl>
  </details>;
}

function InfoField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <div className="min-w-0">
    <dt className="mb-1 flex items-center gap-1.5 leading-tight text-muted-foreground">{label}</dt>
    <dd className="wrap-break-word leading-relaxed">{children}</dd>
  </div>;
}

export function PlaceInfoPanel({ point, status, onRetry, layout = "stack", className }: {
  point: MapPoint; status?: PlaceInfoStatus; onRetry: () => void; layout?: Layout; className?: string;
}) {
  const info = point.info;
  const isGrid = layout === "grid";
  const panelClass = className ?? (isGrid ? "mx-3 border-t border-border/70 py-3" : "mx-3 border-t border-brand/15 pb-4 pt-3");
  const price = info?.priceLevel
    ? <span title="A szolgáltató relatív árszintje; nem konkrét belépő- vagy fogyasztási ár.">{info.priceLevel}</span>
    : "Nincs adat";

  return <section aria-label={`${point.label} adatai`} className={`${panelClass} @container text-xs text-foreground`}>
    {point.address && (!isGrid || status) && <p className="mb-3 wrap-break-word leading-relaxed text-muted-foreground">{point.address}</p>}
    {status === "loading" ? <p role="status" className="text-muted-foreground">Helyadatok betöltése…</p>
      : status === "error" ? <button type="button" onClick={onRetry} className="min-h-10 rounded-lg px-2 text-brand hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-brand">Helyadatok újrapróbálása</button>
      : isGrid ? <>
        <dl className="grid items-start gap-x-6 gap-y-3 @min-[15rem]:grid-cols-2">
          <InfoField label="Cím">{point.address ?? "Nincs adat"}</InfoField>
          <InfoField label={<><HiOutlinePhone aria-hidden="true" className="size-3.5 shrink-0" />Telefon</>}>{info?.phone ?? "Nincs adat"}</InfoField>
          <InfoField label="Árszint">{price}</InfoField>
          <InfoField label="Nyitvatartás">{info?.openingHours?.length ? <OpeningHours hours={info.openingHours} layout={layout} /> : "Nincs adat"}</InfoField>
        </dl>
        {info?.website && <a href={info.website} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">
          <HiOutlineGlobeAlt aria-hidden="true" className="size-4" />Hivatalos weboldal
        </a>}
      </> : <>
        {info?.categories?.length ? <p className="mb-3 text-muted-foreground">{info.categories.join(" · ")}</p> : null}
        <dl className="space-y-3">
          <div className="flex items-center justify-between gap-2"><dt className="flex items-center gap-2 text-muted-foreground"><HiOutlineStar aria-hidden="true" className="size-4" />Értékelés</dt><dd>{info?.rating !== undefined ? `${ratingFormat.format(info.rating)} / 5` : "Nincs adat"}</dd></div>
          <div className="flex items-center justify-between gap-2"><dt className="flex items-center gap-2 text-muted-foreground"><HiOutlineBanknotes aria-hidden="true" className="size-4" />Árszint</dt><dd>{price}</dd></div>
        </dl>
        {info?.openingHours?.length ? <OpeningHours hours={info.openingHours} layout={layout} /> : <p className="mt-3 flex justify-between gap-2"><span className="flex items-center gap-2 text-muted-foreground"><HiOutlineClock aria-hidden="true" className="size-4" />Nyitvatartás</span><span>Nincs adat</span></p>}
        {(info?.phone || info?.website) && <div className="mt-3 flex items-center justify-between gap-2">
          {info.phone && <p className="flex min-w-0 items-center gap-2">
            <HiOutlinePhone aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="sr-only">Telefon: </span>
            <span className="min-w-0 wrap-break-word">{info.phone}</span>
          </p>}
          {info.website && <a href={info.website} target="_blank" rel="noopener noreferrer" aria-label="Hivatalos weboldal" title="Hivatalos weboldal"
            className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-lg text-brand transition-colors hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-brand"><HiOutlineGlobeAlt aria-hidden="true" className="size-4" /></a>}
        </div>}
      </>}
  </section>;
}
