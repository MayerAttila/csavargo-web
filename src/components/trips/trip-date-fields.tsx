import type { TripDateInputs } from "./trip-calendar";

const fieldClass = "h-11 min-w-0 w-full rounded-xl border border-border/80 bg-background/70 px-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-brand";

export function TripDateFields({ dates, onDates }: { dates: TripDateInputs; onDates: (dates: TripDateInputs) => void }) {
  return <>
    <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
      Kezdő dátum
      <input className={fieldClass} type="date" required value={dates.start}
        onChange={(event) => onDates({ ...dates, start: event.target.value })} />
    </label>
    <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
      Záró dátum
      <input className={fieldClass} type="date" required min={dates.start || undefined} value={dates.end}
        onChange={(event) => onDates({ ...dates, end: event.target.value })} />
    </label>
  </>;
}
