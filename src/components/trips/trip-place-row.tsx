import type { ReactNode } from "react";
import { HiOutlineChevronRight, HiOutlineTrash } from "react-icons/hi2";

type Props = {
  label: string;
  position: number;
  expanded: boolean;
  dragHandle: ReactNode;
  details: ReactNode;
  onToggle: () => void;
  onRemove: () => void;
};

export function TripPlaceRow({ label, position, expanded, dragHandle, details, onToggle, onRemove }: Props) {
  return <>
    <div className="flex items-center gap-2 p-2">
      <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">{position}</span>
      <button type="button" aria-expanded={expanded} onClick={onToggle}
        className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-1 rounded text-left text-sm font-medium hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">
        <span className="min-w-0 wrap-break-word">{label}</span>
        <HiOutlineChevronRight aria-hidden="true" className={`size-4 shrink-0 text-muted-foreground ${expanded ? "rotate-90" : ""}`} />
      </button>
      {dragHandle}
      <button type="button" aria-label={`${label} törlése`}
        className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-surface-alt hover:text-red-600 focus-visible:outline-2 focus-visible:outline-brand dark:hover:text-red-400"
        onClick={onRemove}>
        <HiOutlineTrash aria-hidden="true" className="size-4" />
      </button>
    </div>
    {expanded && details}
  </>;
}
