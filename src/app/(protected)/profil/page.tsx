import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  HiArrowRight, HiOutlineCheckCircle, HiOutlineClock, HiOutlineEnvelope, HiOutlineGlobeEuropeAfrica, HiOutlineUsers,
} from "react-icons/hi2";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { UserAvatar } from "@/components/auth/user-avatar";
import { currentTripDate } from "@/components/trips/trip-calendar";
import { statuses, tripStatus, type TripStatus } from "@/components/trips/trip-card";
import type { TripSummary } from "@/lib/api";
import type { CompanionLists } from "@/lib/companions-api";
import { loadServerApi, requireServerMe } from "@/lib/server-session";

export const metadata: Metadata = { title: "Profilom" };

const numberFormat = new Intl.NumberFormat("hu-HU");
const tripStatuses = ["planning", "upcoming", "past"] as const satisfies readonly TripStatus[];
const badgeClass = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold";

function ActivityCard({ href, title, Icon, iconClassName, count, description, children }: {
  href: string;
  title: string;
  Icon: IconType;
  iconClassName: string;
  count: number | undefined;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <Link href={href} className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex size-11 items-center justify-center rounded-xl ${iconClassName}`}>
            <Icon aria-hidden="true" className="size-6" />
          </span>
          <HiArrowRight aria-hidden="true" className="size-5 text-muted-foreground transition-colors group-hover:text-foreground" />
        </div>
        <h2 className="mt-4 font-semibold group-hover:underline">{title}</h2>
        <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
          {count === undefined ? <span aria-hidden="true">–</span> : numberFormat.format(count)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </Link>
      {children}
    </div>
  );
}

export default async function ProfilePage() {
  const { user } = await requireServerMe();
  const [trips, companions] = await Promise.all([
    loadServerApi<TripSummary[]>("/api/trips"),
    loadServerApi<CompanionLists>("/api/companions"),
  ]);
  const today = currentTripDate();
  const tripCounts: Record<TripStatus, number> = { planning: 0, upcoming: 0, past: 0 };
  for (const trip of trips ?? []) tripCounts[tripStatus(trip, today)] += 1;

  const incoming = companions?.incoming.length ?? 0;
  const outgoing = companions?.outgoing.length ?? 0;
  const VerificationIcon = user.emailVerified ? HiOutlineCheckCircle : HiOutlineClock;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pt-2 sm:space-y-6 sm:pt-5">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Profilom</h1>
      <header className="flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-linear-to-br from-brand/15 via-surface to-accent/15 p-5 shadow-sm sm:gap-5 sm:p-8">
        <UserAvatar name={user.name} className="size-16 rounded-2xl text-2xl ring-1 ring-brand/20 sm:size-20 sm:text-3xl" />
        <p className="min-w-0 text-2xl font-bold tracking-tight wrap-anywhere sm:text-3xl">{user.name}</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
        <ActivityCard href="/utazasok" title="Utazásaim" Icon={HiOutlineGlobeEuropeAfrica}
          iconClassName="bg-brand/15 text-blue-800 dark:text-blue-300" count={trips?.length}
          description={trips === null ? "Az utazások száma nem érhető el." : "Saját mentett utazás"}>
          {!!trips?.length && (
            <ul aria-label="Utazások állapot szerint" className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {tripStatuses.map((status) => {
                const { label, color, Icon } = statuses[status];
                return <li key={status} className={`${badgeClass} ${color}`}>
                  <Icon aria-hidden="true" className="size-4" />
                  {label} <span className="tabular-nums">{numberFormat.format(tripCounts[status])}</span>
                </li>;
              })}
            </ul>
          )}
        </ActivityCard>

        <ActivityCard href="/utitarsak" title="Útitársaim" Icon={HiOutlineUsers}
          iconClassName="bg-accent/15 text-emerald-800 dark:text-emerald-300" count={companions?.accepted.length}
          description={companions === null ? "Az útitársak száma nem érhető el." : "Visszaigazolt útitárs"}>
          {(incoming > 0 || outgoing > 0) && (
            <ul aria-label="Függő útitársjelölések" className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {incoming > 0 && <li className={`${badgeClass} bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200`}>{numberFormat.format(incoming)} beérkezett jelölés</li>}
              {outgoing > 0 && <li className={`${badgeClass} bg-surface-alt text-foreground`}>{numberFormat.format(outgoing)} elküldött jelölés</li>}
            </ul>
          )}
        </ActivityCard>
      </div>

      <section aria-labelledby="account-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 id="account-heading" className="text-lg font-semibold">Fiókadataim</h2>
        <dl className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <HiOutlineEnvelope aria-hidden="true" className="size-5" /> E-mail-cím
            </dt>
            <dd className="mt-1 font-medium wrap-anywhere">{user.email}</dd>
          </div>
          <div>
            <dt className="sr-only">E-mail-cím megerősítése</dt>
            <dd className={`${badgeClass} ${user.emailVerified
              ? "bg-accent/15 text-emerald-800 dark:text-emerald-300"
              : "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"}`}>
              <VerificationIcon aria-hidden="true" className="size-4" />
              {user.emailVerified ? "Megerősítve" : "Megerősítésre vár"}
            </dd>
          </div>
        </dl>
        {!user.emailVerified && (
          <div className="mt-5 border-t border-border pt-4">
            <ResendVerificationButton email={user.email} notificationId="profile-verification" />
          </div>
        )}
      </section>
    </div>
  );
}
