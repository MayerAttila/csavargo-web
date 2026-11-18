import { HiMiniStar } from "react-icons/hi2";
import type { MapPoint } from "@/components/maps/types";

const ratingFormat = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 });

export function TripPlaceSummary({ point }: { point: MapPoint }) {
  const description = [point.locality, point.info?.categories?.join(", ")].filter(Boolean).join(" · ");
  const rating = point.info?.rating;
  if (!description && rating === undefined) return null;

  return <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs font-normal text-muted-foreground">
    {description && <span className="wrap-break-word">{description}</span>}
    {rating !== undefined && <>
      {description && <span aria-hidden="true">·</span>}
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <HiMiniStar aria-hidden="true" className="size-3.5 text-amber-500" />
        <span className="sr-only">Értékelés: </span>{ratingFormat.format(rating)}<span className="sr-only"> / 5</span>
      </span>
    </>}
  </span>;
}
