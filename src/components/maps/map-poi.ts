import { z } from "zod";
import type { MapPoint } from "./types";

const featureSchema = z.object({ properties: z.object({ name: z.string().trim().min(1), mapbox_id: z.string().optional() }),
  geometry: z.object({ type: z.literal("Point"), coordinates: z.array(z.number()).min(2) }) });

export function pointFromMapFeature(feature: unknown): MapPoint | null {
  const result = featureSchema.safeParse(feature);
  if (!result.success) return null;
  const { properties, geometry } = result.data;
  const name = properties.name;
  const [longitude, latitude] = geometry.coordinates;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  const lng = longitude >= -180 && longitude <= 180 ? longitude : ((longitude + 180) % 360 + 360) % 360 - 180;
  const providerId = properties.mapbox_id;
  return { id: typeof providerId === "string" ? `mapbox:${providerId}` : `poi:${encodeURIComponent(name.trim())}:${lng.toFixed(6)}:${latitude.toFixed(6)}`,
    label: name.trim(), coordinates: [lng, latitude], source: "map" };
}

export function sameMapPlace(first: MapPoint, second: MapPoint): boolean {
  if (first.id === second.id) return true;
  if (first.label.localeCompare(second.label, "hu", { sensitivity: "base" }) !== 0) return false;
  const dy = (first.coordinates[1] - second.coordinates[1]) * 111_320;
  const dx = (first.coordinates[0] - second.coordinates[0]) * 111_320 * Math.cos(first.coordinates[1] * Math.PI / 180);
  return Math.hypot(dx, dy) < 100;
}
