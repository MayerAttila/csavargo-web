"use client";

import { useEffect, useRef, useState } from "react";
import { isPublicMapToken, mapErrorMessage } from "@/components/maps/map-errors";
import { PlaceInfoPanel, type PlaceInfoStatus } from "@/components/maps/place-info";
import { findSamplePlace } from "@/components/maps/search-api";
import type { MapPoint } from "@/components/maps/types";
import { notify } from "@/lib/notifications";
import { SortableTripPlaces } from "./sortable-trip-places";
import { TripPlaceRow } from "./trip-place-row";

type Props = {
  dayNumber: number;
  places: MapPoint[];
  token: string;
  onMove: (id: string, index: number) => void;
  onSelect: (point: MapPoint) => void;
  onRemove: (point: MapPoint) => void;
};

export function TripDayPlaces({ dayNumber, places, token, onMove, onSelect, onRemove }: Props) {
  const [expandedId, setExpandedId] = useState<string>();
  const [infoStatus, setInfoStatus] = useState<PlaceInfoStatus>();
  const [enriched, setEnriched] = useState<Record<string, MapPoint>>({});
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function loadDetails(point: MapPoint) {
    if (point.info || enriched[point.id] || point.source !== "map" || !isPublicMapToken(token)) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setInfoStatus("loading");
    try {
      const match = await findSamplePlace(point, token, controller.signal);
      if (controller.signal.aborted) return;
      setEnriched((current) => ({ ...current, [point.id]: { ...point, address: point.address ?? match?.address, info: match?.info } }));
      setInfoStatus(undefined);
    } catch (error) {
      if (controller.signal.aborted) return;
      setInfoStatus("error");
      notify.error(mapErrorMessage(error), { id: "trip-place-info" });
    }
  }

  function closeDetails() {
    request.current?.abort();
    setExpandedId(undefined);
    setInfoStatus(undefined);
  }

  function toggleDetails(point: MapPoint) {
    closeDetails();
    if (expandedId === point.id) return;
    setExpandedId(point.id);
    onSelect(point);
    void loadDetails(point);
  }

  return <SortableTripPlaces dayNumber={dayNumber} places={places} onMove={onMove}
    renderPlace={(place, index, dragHandle) => {
      const expanded = expandedId === place.id;
      return <TripPlaceRow label={place.label} position={index + 1} expanded={expanded} dragHandle={dragHandle}
        onToggle={() => toggleDetails(place)}
        onRemove={() => { if (expanded) closeDetails(); onRemove(place); }}
        details={<PlaceInfoPanel point={enriched[place.id] ?? place} status={infoStatus} onRetry={() => void loadDetails(place)} />} />;
    }} />;
}
