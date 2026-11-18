import { useEffect, useState } from "react";
import { mapErrorMessage } from "@/components/maps/map-errors";
import { searchPlaceCategory } from "@/components/maps/search-api";
import type { MapBounds, MapPoint } from "@/components/maps/types";

type CategoryResult = {
  categoryId: string;
  bounds: MapBounds;
  attempt: number;
} & ({ points: MapPoint[]; error?: never } | { error: string; points?: never });

export function useTripCategoryPlaces(categoryId: string | undefined, bounds: MapBounds | undefined, token: string) {
  const [result, setResult] = useState<CategoryResult>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!categoryId || !bounds) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void searchPlaceCategory(categoryId, bounds, token, controller.signal).then((points) => {
        if (!controller.signal.aborted) setResult({ categoryId, bounds, attempt, points });
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted) setResult({ categoryId, bounds, attempt, error: mapErrorMessage(reason) });
      });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [categoryId, bounds, token, attempt]);

  const current = result?.categoryId === categoryId && result?.bounds === bounds && result?.attempt === attempt ? result : undefined;
  return { current, retry: () => setAttempt((value) => value + 1) };
}
