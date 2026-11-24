import { HiOutlineXMark } from "react-icons/hi2";

export function ModalCloseButton({ onClose, disabled, label = "Bezárás" }: {
  onClose: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button type="button" onClick={onClose} disabled={disabled} aria-label={label} title={label}
      className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-muted-foreground hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-default disabled:opacity-50">
      <HiOutlineXMark aria-hidden="true" className="size-5" />
    </button>
  );
}
