export type Coordinates = [longitude: number, latitude: number];

export type OpeningPeriod = { open: { day: number; time: string }; close?: { day: number; time: string } };
export type PlaceInfo = {
  rating?: number;
  priceLevel?: "$" | "$$" | "$$$" | "$$$$";
  openingHours?: OpeningPeriod[];
  phone?: string;
  website?: string;
  categories?: string[];
};

export type MapPoint = {
  id: string;
  label: string;
  coordinates: Coordinates;
  address?: string;
  info?: PlaceInfo;
  source?: "sample" | "search" | "manual" | "geolocation";
};

export type MapView = { center: Coordinates; zoom: number };
export type MapBasemap = "standard" | "satellite";
// Each new object is a camera request, even when the destination is unchanged.
export type MapCameraCommand =
  | { type: "view"; view: MapView }
  | { type: "fit"; coordinates: Coordinates[] };

export const BUDAPEST_VIEW: MapView = { center: [19.0402, 47.4979], zoom: 11 };
