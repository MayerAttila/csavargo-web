"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { HiOutlineUsers, HiOutlineXMark } from "react-icons/hi2";
import { ManageTripInvitations } from "./manage-trip-invitations";

type Props = { count: number; name: string } & (
  { slug: string; userId: string } | { slug?: never; userId?: never }
);

const badgeClass = "relative col-start-2 row-start-1 grid size-9 place-items-center self-center rounded-full bg-brand/10 text-foreground";

export function TripCompanionBadge({ count, name, slug, userId }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const label = `${count} útitárs`;
  const icon = <>
    <HiOutlineUsers aria-hidden="true" className="size-4" />
    <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-action px-0.5 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-surface">
      {count}<span className="sr-only"> útitárs</span>
    </span>
  </>;

  if (slug === undefined) return <span title={label} className={badgeClass}>{icon}</span>;

  return <>
    <button type="button" aria-haspopup="dialog" aria-label={`Útitársak kezelése – ${name}, ${label}`} title={label}
      onClick={() => { dialog.current?.showModal(); setOpen(true); }}
      className={`${badgeClass} z-10 cursor-pointer hover:bg-brand/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}>
      {icon}
    </button>
    <dialog ref={dialog} aria-labelledby={titleId} onClose={() => setOpen(false)}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-background p-4 text-foreground shadow-xl backdrop:bg-black/60 sm:p-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-xl font-semibold">Útitársak kezelése</h2>
          <p className="mt-1 wrap-break-word text-sm text-muted-foreground">{name}</p>
        </div>
        <button type="button" aria-label="Bezárás" onClick={() => dialog.current?.close()}
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand">
          <HiOutlineXMark aria-hidden="true" className="size-5" />
        </button>
      </header>
      {open && <ManageTripInvitations slug={slug} userId={userId} onChanged={() => router.refresh()} />}
    </dialog>
  </>;
}
