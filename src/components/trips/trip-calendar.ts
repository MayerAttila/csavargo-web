export type TripDateRange = { start: number; end: number };
export type TripDateInputs = { start: string; end: string };

const dayInMilliseconds = 86_400_000;
const fullDate = new Intl.DateTimeFormat("hu-HU", { dateStyle: "full", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric", timeZone: "UTC" });
const localDate = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "Europe/Budapest" });

export function currentTripDate() {
  return localDate.format(new Date());
}

export function calendarDay(value: string) {
  // UTC calendar days keep the duration consistent across daylight saving changes.
  return Date.parse(`${value}T00:00:00Z`) / dayInMilliseconds;
}

export function dateInputValue(day: number) {
  return new Date(day * dayInMilliseconds).toISOString().slice(0, 10);
}

export function tripDateLabel(day: number, compact = false) {
  return (compact ? shortDate : fullDate).format(day * dayInMilliseconds);
}
