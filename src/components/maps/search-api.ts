import { z } from "zod";
import type { MapBounds, MapPoint } from "./types";
import { parsePlaceInfo } from "./place-metadata";

const suggestionSchema = z.object({ mapbox_id: z.string(), name: z.string(), place_formatted: z.string().optional(), full_address: z.string().optional() });
export type PlaceSuggestion = z.infer<typeof suggestionSchema>;
const suggestionsSchema = z.object({ suggestions: z.array(suggestionSchema) });
const featureSchema = z.object({
  geometry: z.object({ type: z.literal("Point"), coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]) }),
  properties: z.object({ mapbox_id: z.string(), name: z.string(), full_address: z.string().optional(), place_formatted: z.string().optional(),
    context: z.object({ place: z.object({ name: z.string() }).optional(), locality: z.object({ name: z.string() }).optional() }).optional().catch(undefined),
    metadata: z.unknown().optional(), poi_category: z.array(z.string()).optional().catch(undefined) }),
});
const categoryListSchema = z.object({ listItems: z.array(z.object({ canonical_id: z.string(), name: z.string() })) });
export type PlaceCategory = { id: string; label: string };

function toMapPoint(feature: z.infer<typeof featureSchema>): MapPoint {
  const properties = feature.properties;
  return { id: `mapbox:${properties.mapbox_id}`, label: properties.name, coordinates: feature.geometry.coordinates,
    address: properties.full_address ?? properties.place_formatted, locality: properties.context?.place?.name ?? properties.context?.locality?.name,
    source: "search", info: parsePlaceInfo(properties.metadata, properties.poi_category) };
}

async function request(path: string, params: Record<string, string>, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/${path}?${new URLSearchParams(params)}`, { signal, cache: "no-store", credentials: "omit" });
  if (!response.ok) throw Object.assign(new Error("MAPBOX_REQUEST_FAILED"), { status: response.status });
  return response.json();
}

export async function suggestPlaces(query: string, token: string, session: string, signal: AbortSignal, proximity?: string): Promise<PlaceSuggestion[]> {
  const data = await request("suggest", { q: query, access_token: token, session_token: session, language: "hu", limit: "5", ...(proximity ? { proximity, types: "poi" } : {}) }, signal);
  return suggestionsSchema.parse(data).suggestions.slice(0, 5);
}

export async function retrievePlace(id: string, token: string, session: string, signal: AbortSignal): Promise<MapPoint> {
  const data = await request(`retrieve/${encodeURIComponent(id)}`, { access_token: token, session_token: session, language: "hu", attribute_sets: "visit,venue" }, signal);
  const feature = z.object({ features: z.array(featureSchema).min(1) }).parse(data).features[0];
  return toMapPoint(feature);
}

export async function listPlaceCategories(token: string, signal: AbortSignal): Promise<PlaceCategory[]> {
  const data = await request("list/category", { access_token: token, language: "hu" }, signal);
  return categoryListSchema.parse(data).listItems.map(({ canonical_id, name }) => ({ id: canonical_id, label: name }))
    .sort((a, b) => a.label.localeCompare(b.label, "hu"));
}

export async function searchPlaceCategory(id: string, bounds: MapBounds, token: string, signal: AbortSignal): Promise<MapPoint[]> {
  const [west, south, east, north] = bounds;
  const longitudeSpan = east - west;
  if (longitudeSpan <= 0 || north <= south) return [];
  const wrappedWest = ((west + 180) % 360 + 360) % 360 - 180;
  const wrappedEast = wrappedWest + longitudeSpan;
  const minLat = Math.max(-90, south);
  const maxLat = Math.min(90, north);
  // Mapbox accepts only bounding boxes that do not cross the antimeridian.
  let boxes: MapBounds[];
  if (longitudeSpan >= 360) boxes = [[-180, minLat, 180, maxLat]];
  else if (wrappedEast > 180) {
    boxes = [[wrappedWest, minLat, 180, maxLat], [-180, minLat, wrappedEast - 360, maxLat]];
  } else boxes = [[wrappedWest, minLat, wrappedEast, maxLat]];

  const results = await Promise.all(boxes.map(async (box) => {
    const [left, bottom, right, top] = box;
    const data = await request(`category/${encodeURIComponent(id)}`, {
      access_token: token, language: "hu", bbox: box.join(","), limit: boxes.length === 1 ? "25" : "12",
      proximity: `${(left + right) / 2},${(bottom + top) / 2}`, exclude_fields: "photos,reviews",
    }, signal);
    return z.object({ features: z.array(z.unknown()) }).parse(data).features.flatMap((value) => {
      const feature = featureSchema.safeParse(value);
      return feature.success ? [toMapPoint(feature.data)] : [];
    });
  }));
  return [...new Map(results.flat().map((point) => [point.id, point])).values()];
}

export async function findSamplePlace(point: MapPoint, token: string, signal: AbortSignal): Promise<MapPoint | null> {
  const session = crypto.randomUUID();
  const city = point.address?.split(",")[0] ?? "";
  const suggestions = await suggestPlaces(`${point.label} ${city}`.trim().slice(0, 256), token, session, signal, point.coordinates.join(","));
  const match = suggestions.find((item) => item.name.localeCompare(point.label, "hu", { sensitivity: "base" }) === 0);
  if (!match || signal.aborted) return null;
  const place = await retrievePlace(match.mapbox_id, token, session, signal);
  const latitudeDifference = (place.coordinates[1] - point.coordinates[1]) * 111_320;
  const longitudeDifference = (place.coordinates[0] - point.coordinates[0]) * 111_320 * Math.cos(point.coordinates[1] * Math.PI / 180);
  // Do not attach a similarly named venue in another location to a sample point.
  return Math.hypot(latitudeDifference, longitudeDifference) <= (point.source === "map" ? 100 : 500) ? place : null;
}
