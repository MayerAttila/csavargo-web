import { z } from "zod";
import type { MapPoint } from "./types";

const suggestionSchema = z.object({ mapbox_id: z.string(), name: z.string(), place_formatted: z.string().optional(), full_address: z.string().optional() });
export type PlaceSuggestion = z.infer<typeof suggestionSchema>;
const suggestionsSchema = z.object({ suggestions: z.array(suggestionSchema) });
const featureSchema = z.object({
  geometry: z.object({ type: z.literal("Point"), coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]) }),
  properties: z.object({ mapbox_id: z.string(), name: z.string(), full_address: z.string().optional(), place_formatted: z.string().optional() }),
});

async function request(path: string, params: Record<string, string>, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/${path}?${new URLSearchParams(params)}`, { signal, cache: "no-store", credentials: "omit" });
  if (!response.ok) throw Object.assign(new Error("MAPBOX_REQUEST_FAILED"), { status: response.status });
  return response.json();
}

export async function suggestPlaces(query: string, token: string, session: string, signal: AbortSignal): Promise<PlaceSuggestion[]> {
  const data = await request("suggest", { q: query, access_token: token, session_token: session, language: "hu", limit: "5" }, signal);
  return suggestionsSchema.parse(data).suggestions.slice(0, 5);
}

export async function retrievePlace(id: string, token: string, session: string, signal: AbortSignal): Promise<MapPoint> {
  const data = await request(`retrieve/${encodeURIComponent(id)}`, { access_token: token, session_token: session, language: "hu" }, signal);
  const feature = z.object({ features: z.array(featureSchema).min(1) }).parse(data).features[0];
  return { id: `mapbox:${feature.properties.mapbox_id}`, label: feature.properties.name, coordinates: feature.geometry.coordinates,
    address: feature.properties.full_address ?? feature.properties.place_formatted, source: "search" };
}
