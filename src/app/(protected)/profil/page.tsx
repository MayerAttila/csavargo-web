import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  HiArrowRight, HiOutlineGlobeEuropeAfrica, HiOutlineUsers,
} from "react-icons/hi2";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { ProfileIdentity } from "@/components/auth/profile-identity";
import { ProfilePassword } from "@/components/auth/profile-password";
import { PageContent } from "@/components/layout/page-content";
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
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
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
  const me = await requireServerMe();
  const { user } = me;
  const [trips, companions] = await Promise.all([
    loadServerApi<TripSummary[]>("/api/trips"),
    loadServerApi<CompanionLists>("/api/companions"),
  ]);
  const today = currentTripDate();
  const tripCounts: Record<TripStatus, number> = { planning: 0, upcoming: 0, past: 0 };
  for (const trip of trips ?? []) tripCounts[tripStatus(trip, today)] += 1;

  const incoming = companions?.incoming.length ?? 0;
  const outgoing = companions?.outgoing.length ?? 0;

  return (
    <PageContent>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Profilom</h1>
      <ProfileIdentity initialMe={me} />

      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)]">
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
        <section aria-labelledby="security-heading" className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:col-span-2 sm:p-6 xl:col-span-1">
          <h2 id="security-heading" className="text-lg font-semibold">Fiókbiztonság</h2>
          <ProfilePassword />
          {!user.emailVerified && (
            <div className="mt-5 border-t border-border pt-4">
              <ResendVerificationButton email={user.email} notificationId="profile-verification" />
            </div>
          )}
        </section>
      </div>
    </PageContent>
  );
}
