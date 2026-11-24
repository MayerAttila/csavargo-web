import { HiArrowUturnLeft, HiCheck, HiOutlineCalendarDays, HiOutlineMap, HiOutlineUserGroup, HiXMark } from "react-icons/hi2";
import { UserAvatar } from "@/components/auth/user-avatar";
import type { CompanionLists } from "@/lib/companions-api";

export type AcceptedCompanion = CompanionLists["accepted"][number];
type Props = { disabled: boolean } & (
  | { variant: "accepted"; companion: AcceptedCompanion; onOpen: () => void }
  | { variant: "incoming"; companion: CompanionLists["incoming"][number]; onAccept: () => void; onRemove: () => void }
  | { variant: "outgoing"; companion: CompanionLists["outgoing"][number]; onRemove: () => void }
);

const variants = {
  accepted: { classes: "flex-col items-stretch gap-3 border-border bg-surface p-3 shadow-sm hover:border-brand/50 sm:p-4" },
  incoming: { action: "Elutasítás", icon: HiXMark, classes: "flex-wrap items-center gap-3 border-border bg-surface-alt/50 p-3" },
  outgoing: { action: "Visszavonás", icon: HiArrowUturnLeft, classes: "flex-wrap items-center gap-3 border-border bg-surface-alt/50 p-3" },
};
export const companionMetrics = [
  { key: "ownedTrips", label: "Saját utazás", cardLabel: "utazás", icon: HiOutlineMap },
  { key: "sharedTrips", label: "Közös utazás", cardLabel: "közös út", icon: HiOutlineCalendarDays },
  { key: "companions", label: "Útitárs", cardLabel: "útitárs", icon: HiOutlineUserGroup },
] as const;
const button = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 sm:text-sm";

export function CompanionCard(props: Props) {
  const { variant, disabled } = props;
  const { name } = props.companion;
  const accepted = props.variant === "accepted";
  const pendingAction = accepted ? null : variants[props.variant];

  return (
    <article className={`relative isolate flex h-full rounded-2xl border transition-colors ${variants[variant].classes}`}>
      <header className={`flex min-w-0 items-center ${accepted ? "min-h-20 gap-3 sm:min-h-22" : "flex-1 basis-28 gap-3"}`}>
        <UserAvatar name={name} image={accepted ? props.companion.image : undefined}
          className={`${accepted ? "size-12 sm:size-14" : "size-10"} rounded-full text-base ring-2 ring-brand/10`} />
        <h3 className={`min-w-0 text-sm leading-tight font-bold wrap-anywhere sm:text-base ${accepted ? "max-w-2/5" : ""}`}>{name}</h3>
      </header>
      {accepted ? (
        <>
          <button type="button" disabled={disabled} aria-haspopup="dialog" aria-label={`Útitárs részletei: ${name}`}
            onClick={props.onOpen}
            className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-default" />
          <dl className="mt-auto grid grid-cols-3 gap-2">
            {companionMetrics.map(({ key, cardLabel, icon: Icon }) => (
              <div key={key} className="grid min-w-0 grid-cols-[auto_minmax(0,auto)] items-center justify-center gap-x-1 rounded-xl border border-border/70 bg-surface-alt/85 px-1 py-2 text-xs leading-tight xl:gap-x-1.5 xl:text-sm">
                <dt className="col-start-2 row-start-1 wrap-break-word">{cardLabel}</dt>
                <dd className="col-start-1 row-start-1 flex items-center gap-1 font-semibold tabular-nums">
                  <Icon aria-hidden="true" className="size-3.5 shrink-0 text-action xl:size-4 dark:text-brand" />
                  {props.companion.stats[key]}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : pendingAction && (
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          {variant === "incoming" && <button type="button" disabled={disabled} aria-label={`Elfogadás: ${name}`}
            onClick={props.onAccept} className={`${button} border-transparent bg-action text-white hover:bg-action-hover`}>
            <HiCheck aria-hidden="true" className="size-4" /> Elfogadás
          </button>}
          <button type="button" disabled={disabled} aria-label={`${pendingAction.action}: ${name}`} onClick={props.onRemove}
            className={`${button} border-border bg-surface text-foreground hover:bg-surface-alt`}>
            <pendingAction.icon aria-hidden="true" className="size-4" /> {pendingAction.action}
          </button>
        </div>
      )}
    </article>
  );
}
