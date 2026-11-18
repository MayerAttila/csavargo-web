import { useId, useRef, useState } from "react";
import { HiOutlineCheck, HiOutlineChevronDown } from "react-icons/hi2";
import { PiAirplane, PiBoat, PiBus, PiCar, PiDotsThree, PiMinus, PiTrain } from "react-icons/pi";
import type { TripTravel, TripTravelLeg } from "@/lib/api";

type Mode = NonNullable<TripTravelLeg["mode"]>;

const modes = {
  plane: { label: "Repülő", Icon: PiAirplane },
  train: { label: "Vonat", Icon: PiTrain },
  bus: { label: "Autóbusz", Icon: PiBus },
  car: { label: "Autó", Icon: PiCar },
  boat: { label: "Hajó", Icon: PiBoat },
  other: { label: "Egyéb", Icon: PiDotsThree },
};
const emptyMode = { label: "Nincs megadva", Icon: PiMinus };
const options = [{ ...emptyMode, mode: undefined }, ...(Object.keys(modes) as Mode[]).map((mode) => ({ ...modes[mode], mode }))];

const fieldClass = "h-9 rounded-lg border border-border bg-background text-foreground focus-visible:outline-2 focus-visible:outline-brand";

function TripTravelModePicker({ title, mode, onSelect }: { title: string; mode?: Mode; onSelect: (mode?: Mode) => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const optionsId = useId();
  const { label, Icon } = mode ? modes[mode] : emptyMode;

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return <div className="relative shrink-0" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={(event) => {
    if (open && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }}>
    <button ref={trigger} type="button" aria-label={`${title} módja: ${label}`} title={label} aria-expanded={open}
      aria-controls={optionsId} onClick={() => setOpen((current) => !current)}
      className={`${fieldClass} flex cursor-pointer items-center gap-0.5 px-1.5 hover:bg-surface-alt`}>
      <Icon aria-hidden="true" className="size-4" />
      <HiOutlineChevronDown aria-hidden="true" className="size-3 text-muted-foreground" />
    </button>
    <div id={optionsId} hidden={!open} role="group" aria-label={`${title} közlekedési módjai`}
      className="absolute top-full right-0 z-20 mt-1 w-40 rounded-xl border border-border bg-surface p-1 shadow-lg">
      {options.map(({ label, Icon, mode: option }) => <button type="button" key={label} aria-pressed={mode === option}
        onClick={() => { onSelect(option); close(); }}
        className="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-xs font-medium hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-brand aria-pressed:bg-brand/10">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {mode === option && <HiOutlineCheck aria-hidden="true" className="size-3.5 text-brand" />}
      </button>)}
    </div>
  </div>;
}

type Props = {
  kind: keyof TripTravel;
  value?: TripTravelLeg;
  onChange?: (value?: TripTravelLeg) => void;
};

export function TripTravelLegFields({ kind, value, onChange }: Props) {
  if (!onChange && !value) return null;

  const arrival = kind === "arrival";
  const title = arrival ? "Érkezés" : "Távozás";
  const { mode, time } = value ?? {};
  const ModeIcon = mode ? modes[mode].Icon : undefined;

  function change(mode: TripTravelLeg["mode"], time: TripTravelLeg["time"]) {
    onChange?.(mode || time ? { mode, time } : undefined);
  }

  return <section aria-label={title} className="flex min-w-0 items-center gap-1.5 rounded-xl border border-border/70 bg-surface p-1.5 sm:gap-2">
    <h3 className="mr-auto shrink-0 pl-0.5 text-xs font-semibold">{title}</h3>
    {onChange ? <>
      <TripTravelModePicker title={title} mode={mode} onSelect={(value) => change(value, time)} />
      <input type="time" aria-label={`${title} Ideje`} className={`${fieldClass} w-24 min-w-0 px-1 text-xs tabular-nums`}
        value={time ?? ""} onChange={(event) => change(mode, event.currentTarget.value || undefined)} />
    </> : <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
      {ModeIcon && <ModeIcon aria-hidden="true" className="size-4 shrink-0" />}
      {mode && modes[mode].label}{mode && time && " · "}{time && <time dateTime={time}>{time}</time>}
    </p>}
  </section>;
}
