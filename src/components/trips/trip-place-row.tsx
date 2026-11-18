import type { ReactNode } from "react";
import { HiOutlineChevronRight, HiOutlineTrash } from "react-icons/hi2";

type Props = {
  label: string;
  expanded: boolean;
  orderBadge: ReactNode;
  details: ReactNode;
  onToggle: () => void;
  onRemove: () => void;
};

export function TripPlaceRow({ label, expanded, orderBadge, details, onToggle, onRemove }: Props) {
  return <>
    <div className="flex items-center gap-2 p-2">
      {orderBadge}
      <button type="button" aria-expanded={expanded} onClick={onToggle}
        className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-1 rounded text-left text-sm font-medium hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">
        <span className="min-w-0 wrap-break-word">{label}</span>
        <HiOutlineChevronRight aria-hidden="true" className={`size-4 shrink-0 text-muted-foreground ${expanded ? "rotate-90" : ""}`} />
      </button>
      <button type="button" aria-label={`${label} törlése`}
        className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-surface-alt hover:text-red-600 focus-visible:outline-2 focus-visible:outline-brand dark:hover:text-red-400"
        onClick={onRemove}>
        <HiOutlineTrash aria-hidden="true" className="size-4" />
      </button>
    </div>
    {expanded && details}
  </>;
}
