"use client";

import { useState } from "react";
import { PlaceInfoPanel } from "@/components/maps/place-info";
import type { MapPoint } from "@/components/maps/types";
import { SortableTripPlaces } from "./sortable-trip-places";
import { TripPlaceRow } from "./trip-place-row";
import { TripPlaceSummary } from "./trip-place-summary";
import type { GetTripPlaceInfo } from "./use-trip-place-info";

type Props = {
  dayNumber: number;
  places: MapPoint[];
  onMove: (id: string, index: number) => void;
  onSelect: (point: MapPoint) => void;
  onRemove: (point: MapPoint) => void;
  getPlaceInfo: GetTripPlaceInfo;
};

export function TripDayPlaces({ dayNumber, places, onMove, onSelect, onRemove, getPlaceInfo }: Props) {
  const [expandedId, setExpandedId] = useState<string>();

  function toggleDetails(point: MapPoint) {
    if (expandedId === point.id) { setExpandedId(undefined); return; }
    setExpandedId(point.id);
    onSelect(point);
  }

  return <SortableTripPlaces dayNumber={dayNumber} places={places} onMove={onMove}
    renderPlace={(place, orderBadge) => {
      const expanded = expandedId === place.id;
      const info = expanded ? getPlaceInfo(place) : undefined;
      return <TripPlaceRow label={place.label} expanded={expanded} orderBadge={orderBadge}
        onToggle={() => toggleDetails(place)}
        onRemove={() => { if (expanded) setExpandedId(undefined); onRemove(place); }}
        summary={info && <TripPlaceSummary point={info.point} />}
        details={info && <PlaceInfoPanel {...info} layout="grid" />} />;
    }} />;
}
