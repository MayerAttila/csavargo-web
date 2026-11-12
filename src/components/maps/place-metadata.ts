import { z } from "zod";
import type { PlaceInfo, OpeningPeriod } from "./types";

const timeSchema = z.object({ day: z.number().int().min(0).max(6), time: z.string().regex(/^(?:[01]\d|2[0-3])[0-5]\d$/) });
const metadataSchema = z.object({
  rating: z.number().min(0).max(5).optional().catch(undefined),
  price_level: z.enum(["$", "$$", "$$$", "$$$$"]).optional().catch(undefined),
  open_hours: z.object({ periods: z.array(z.object({ open: timeSchema, close: timeSchema.optional() })).min(1) }).optional().catch(undefined),
  phone: z.string().trim().min(1).max(100).optional().catch(undefined),
  website: z.url().refine((url) => ["http:", "https:"].includes(new URL(url).protocol)).optional().catch(undefined),
});

export function parsePlaceInfo(metadata: unknown, categories?: string[]): PlaceInfo {
  const result = metadataSchema.safeParse(metadata);
  const data = result.success ? result.data : {};
  return { rating: data.rating, priceLevel: data.price_level, openingHours: data.open_hours?.periods, phone: data.phone, website: data.website, categories };
}

const days = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
const time = (value: string) => `${value.slice(0, 2)}:${value.slice(2)}`;
export function formatOpeningHours(periods: OpeningPeriod[]) {
  const alwaysOpen = periods.length === 1 && periods[0].open.day === 0 && periods[0].open.time === "0000" && !periods[0].close;
  return [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day: days[day], hours: alwaysOpen ? "0–24" : periods.filter((period) => period.open.day === day).map((period) =>
    period.close ? `${time(period.open.time)}–${time(period.close.time)}${period.close.day !== day ? " (következő nap)" : ""}` : `${time(period.open.time)}–nincs zárási adat`).join(", ") || "Zárva" }));
}
