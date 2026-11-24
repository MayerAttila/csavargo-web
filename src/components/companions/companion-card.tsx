import { HiOutlineCalendarDays, HiOutlineCheck, HiOutlineMap, HiOutlineUserGroup } from "react-icons/hi2";
import { UserAvatar } from "@/components/auth/user-avatar";
import type { CompanionLists } from "@/lib/companions-api";

export type AcceptedCompanion = CompanionLists["accepted"][number];
type Props = { disabled: boolean } & (
  | { variant: "accepted"; companion: AcceptedCompanion; onOpen: () => void }
  | { variant: "incoming"; companion: CompanionLists["incoming"][number]; onAccept: () => void; onRemove: () => void }
  | { variant: "outgoing"; companion: CompanionLists["outgoing"][number]; onRemove: () => void }
);

const variants = {
  accepted: { border: "border-border hover:border-brand/40" },
  incoming: { action: "Elutasítás", border: "border-border border-l-2 border-l-brand" },
  outgoing: { action: "Visszavonás", border: "border-border border-l-2 border-l-muted-foreground/35" },
};
export const companionMetrics = [
  { key: "ownedTrips", label: "Saját utazás", icon: HiOutlineMap },
  { key: "sharedTrips", label: "Közös utazás", icon: HiOutlineCalendarDays },
  { key: "companions", label: "Útitárs", icon: HiOutlineUserGroup },
] as const;
const button = "inline-flex min-h-10 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50";

export function CompanionCard(props: Props) {
  const { variant, disabled } = props;
  const { name } = props.companion;
  const { border } = variants[variant];
  const accepted = props.variant === "accepted";

  return (
    <article className={`relative flex h-full items-center gap-x-3 gap-y-1 rounded-xl border bg-surface px-3 py-2 ${border} ${accepted ? "" : "flex-wrap"}`}>
      <div className={`flex min-w-0 flex-1 items-center gap-3 ${accepted ? "" : "basis-36"}`}>
        <UserAvatar name={name} image={accepted ? props.companion.image : undefined}
          className="size-11 rounded-full text-sm" />
        <h3 className="min-w-0 wrap-break-word text-sm font-semibold sm:text-base">{name}</h3>
      </div>
      {accepted ? (
        <>
          <button type="button" disabled={disabled} aria-haspopup="dialog" aria-label={`Útitárs részletei: ${name}`}
            onClick={props.onOpen}
            className="absolute inset-0 z-10 cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-default" />
          <dl className="grid shrink-0 gap-1">
            {companionMetrics.map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-md bg-brand/10">
                <dt className="sr-only">{label}</dt>
                <dd className="flex min-w-10 items-center justify-between gap-1.5 px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                  <Icon aria-hidden="true" className="size-3 text-brand" />
                  {props.companion.stats[key]}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <div className="ml-auto flex flex-wrap justify-end gap-1">
          <button type="button" disabled={disabled} aria-label={`${variants[props.variant].action}: ${name}`} onClick={props.onRemove}
            className={`${button} text-muted-foreground hover:bg-surface-alt hover:text-foreground`}>{variants[props.variant].action}</button>
          {variant === "incoming" && <button type="button" disabled={disabled} aria-label={`Elfogadás: ${name}`}
            onClick={props.onAccept} className={`${button} bg-action text-white hover:bg-action-hover`}>
            <HiOutlineCheck aria-hidden="true" className="size-4" /> Elfogadás
          </button>}
        </div>
      )}
    </article>
  );
}
