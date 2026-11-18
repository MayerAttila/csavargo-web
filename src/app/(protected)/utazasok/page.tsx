import type { Metadata } from "next";
import { TripPlanner } from "@/components/trips/trip-planner";

export const metadata: Metadata = { title: "Utazások" };

export default function TripsPage() {
  return <TripPlanner />;
}
