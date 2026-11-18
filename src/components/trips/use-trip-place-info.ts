import { useEffect, useState } from "react";
import { isPublicMapToken, mapErrorMessage } from "@/components/maps/map-errors";
import type { PlaceInfoStatus } from "@/components/maps/place-info";
import { findSamplePlace } from "@/components/maps/search-api";
import type { MapPoint } from "@/components/maps/types";
import { notify } from "@/lib/notifications";

export type TripPlaceInfo = { point: MapPoint; status?: PlaceInfoStatus; onRetry: () => void };
export type GetTripPlaceInfo = (point: MapPoint) => TripPlaceInfo;

export function useTripPlaceInfo(selected: MapPoint | undefined, token: string): GetTripPlaceInfo {
  const [cache, setCache] = useState<Record<string, MapPoint>>({});
  const [error, setError] = useState<{ id: string; attempt: number }>();
  const [attempt, setAttempt] = useState(0);
  const pending = selected?.source === "map" && !selected.info && !cache[selected.id] && isPublicMapToken(token);

  useEffect(() => {
    if (!selected || !pending) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const match = await findSamplePlace(selected, token, controller.signal);
        if (controller.signal.aborted) return;
        setCache((current) => ({ ...current, [selected.id]: {
          ...selected, address: selected.address ?? match?.address, locality: selected.locality ?? match?.locality, info: match?.info,
        } }));
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError({ id: selected.id, attempt });
          notify.error(mapErrorMessage(reason), { id: "trip-place-info" });
        }
      }
    })();
    return () => controller.abort();
  }, [selected, pending, token, attempt]);

  return (point) => ({
    point: cache[point.id] ?? point,
    status: pending && point.id === selected?.id ? (error?.id === point.id && error.attempt === attempt ? "error" : "loading") : undefined,
    onRetry: () => setAttempt((value) => value + 1),
  });
}
