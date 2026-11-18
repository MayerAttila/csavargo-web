import type { MapPoint } from "@/components/maps/types";
import type { TripPlan } from "@/lib/api";

export function storedPoint({ id, label, coordinates, address, locality }: MapPoint): TripPlan["destination"] {
  return { id, label: label.trim(), coordinates, address, locality };
}

export function restorePoint(point: TripPlan["destination"]): MapPoint {
  const [longitude, latitude] = point.coordinates;
  return { ...point, coordinates: [longitude, latitude], source: "map" };
}
