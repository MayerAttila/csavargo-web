"use client";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { HiOutlineSquares2X2, HiOutlineGlobeEuropeAfrica, HiOutlineCalendarDays, HiOutlineMap,
  HiOutlineBanknotes, HiOutlineTicket, HiArrowRightOnRectangle, HiOutlineBars3,
  HiOutlineXMark, HiOutlineMoon, HiOutlineSun, HiOutlineChevronDoubleLeft, HiOutlineChevronDoubleRight } from "react-icons/hi2";
import { Brand } from "@/components/brand";
import type { Me } from "@/lib/api";

const plannedNavigation = [
  { label: "Utazások", Icon: HiOutlineGlobeEuropeAfrica },
  { label: "Útiterv", Icon: HiOutlineCalendarDays },
  { label: "Költségek", Icon: HiOutlineBanknotes },
  { label: "Foglalások", Icon: HiOutlineTicket },
];
const rowClass = "flex h-11 w-full items-center gap-1.5 lg:h-9 overflow-hidden rounded-lg px-1.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const slotClass = "flex w-8 shrink-0 items-center justify-center";
const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

type SidebarProps = { user: Me["user"]; pending: boolean; onLogout: () => void };
type MenuProps = SidebarProps & { expanded: boolean; mobile?: boolean; onNavigate?: () => void; onToggle: () => void };

function SidebarMenu({ user, pending, onLogout, expanded, mobile = false, onNavigate, onToggle }: MenuProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  const textClass = `min-w-0 whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none ${expanded ? "opacity-100" : "opacity-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100"}`;
  const dark = hydrated && resolvedTheme === "dark";
  const ThemeIcon = dark ? HiOutlineSun : HiOutlineMoon;
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toLocaleUpperCase("hu");
  const active = pathname === "/attekintes";
  return <>
    <header className="flex h-10 shrink-0 items-center gap-1.5 overflow-hidden px-2">
      <Brand href="/attekintes" className="[&>span:last-child]:hidden [&>span:first-child]:size-7 [&_img]:size-10.5" />
      <span className={`${textClass} flex-1 text-base font-bold tracking-tight text-brand`}>csavargó.</span>
      <button type="button" onClick={onToggle} aria-label={mobile ? "Menü bezárása" : expanded ? "Rögzítés feloldása" : "Oldalsáv rögzítése"}
        title={mobile ? "Menü bezárása" : expanded ? "Rögzítés feloldása" : "Oldalsáv rögzítése"}
        aria-pressed={mobile ? undefined : expanded}
        className={`${textClass} flex size-9 shrink-0 items-center justify-center rounded-lg lg:size-8 text-muted-foreground hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand`}>
        {mobile ? <HiOutlineXMark aria-hidden="true" className="size-4.5" /> : expanded ? <HiOutlineChevronDoubleLeft aria-hidden="true" className="size-4" /> : <HiOutlineChevronDoubleRight aria-hidden="true" className="size-4" />}
      </button>
    </header>
    <nav aria-label="Fő navigáció" className="mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <p className={`${textClass} mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground`}>Tervezés</p>
      <div className="space-y-0.5">
        <Link href="/attekintes" aria-label="Áttekintés" aria-current={active ? "page" : undefined} title="Áttekintés" onClick={onNavigate}
          className={`${rowClass} ${active ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-surface-alt hover:text-foreground"}`}>
          <span className={slotClass}><HiOutlineSquares2X2 aria-hidden="true" className="size-4.5" /></span>
          <span className={textClass}>Áttekintés</span>
        </Link>
        <Link href="/terkep" aria-label="Térkép" aria-current={pathname === "/terkep" ? "page" : undefined} title="Térkép" onClick={onNavigate}
          className={`${rowClass} ${pathname === "/terkep" ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-surface-alt hover:text-foreground"}`}>
          <span className={slotClass}><HiOutlineMap aria-hidden="true" className="size-4.5" /></span><span className={textClass}>Térkép</span>
        </Link>
        {plannedNavigation.map(({ label, Icon }) => <button key={label} type="button" disabled aria-label={`${label} – hamarosan`} title={`${label} – hamarosan`}
          className={`${rowClass} cursor-not-allowed text-muted-foreground/50`}>
          <span className={slotClass}><Icon aria-hidden="true" className="size-4.5" /></span>
          <span className={`${textClass} flex-1`}>{label}</span>
          <span className={`${textClass} rounded-md bg-surface-alt px-1.5 py-0.5 text-[9px]`}>Hamarosan</span>
        </button>)}
      </div>
    </nav>
    <footer className="mt-3 shrink-0 space-y-0.5">
      <button type="button" disabled={!hydrated} aria-label={dark ? "Világos mód" : "Sötét mód"} title={dark ? "Világos mód" : "Sötét mód"}
        onClick={() => setTheme(dark ? "light" : "dark")}
        className={`${rowClass} text-muted-foreground hover:bg-surface-alt hover:text-foreground`}>
        <span className={slotClass}><ThemeIcon aria-hidden="true" className="size-4.5" /></span>
        <span className={textClass}>{dark ? "Világos mód" : "Sötét mód"}</span>
      </button>
      <button type="button" disabled={pending} onClick={onLogout} aria-label="Kijelentkezés" title="Kijelentkezés"
        className={`${rowClass} text-red-600 hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-50 dark:text-red-400`}>
        <span className={slotClass}><HiArrowRightOnRectangle aria-hidden="true" className="size-5 shrink-0" /></span>
        <span className={textClass}>{pending ? "Kijelentkezés…" : "Kijelentkezés"}</span>
      </button>
      <div className="mt-2 flex h-12 items-center gap-1.5 overflow-hidden border-t border-border px-1.5" title={`${user.name} · ${user.email}`}>
        <span className={slotClass}><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-[10px] font-bold text-brand" aria-hidden="true">{initials}</span></span>
        <div className={`${textClass} flex-1`}><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div>
      </div>
    </footer>
  </>;
}

export function Sidebar(props: SidebarProps) {
  const [pinned, setPinned] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const pathname = usePathname();
  const closeMobile = useCallback(() => { dialog.current?.close(); document.body.classList.remove("overflow-hidden"); }, []);
  useEffect(() => { closeMobile(); }, [pathname, closeMobile]);
  useEffect(() => {
    if (!window.matchMedia) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => { if (desktop.matches) closeMobile(); };
    desktop.addEventListener("change", onResize);
    return () => { desktop.removeEventListener("change", onResize); document.body.classList.remove("overflow-hidden"); };
  }, [closeMobile]);
  return <>
    <aside aria-label="Oldalsáv" className={`group/sidebar hidden shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-sm transition-[width] duration-300 motion-reduce:transition-none lg:flex ${pinned ? "w-56" : "w-14 hover:w-56 focus-within:w-56"}`}>
      <SidebarMenu {...props} expanded={pinned} onToggle={() => setPinned((value) => !value)} />
    </aside>
    <header className="flex items-center justify-between rounded-2xl border border-border bg-surface px-3 py-2 lg:hidden">
      <Brand href="/attekintes" />
      <button type="button" aria-label="Menü megnyitása" aria-haspopup="dialog" aria-controls={id}
        onClick={() => { dialog.current?.showModal(); document.body.classList.add("overflow-hidden"); }}
        className="flex size-11 items-center justify-center rounded-xl text-foreground hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-brand">
        <HiOutlineBars3 aria-hidden="true" className="size-6" />
      </button>
    </header>
    <dialog ref={dialog} id={id} aria-label="Navigáció" onClose={() => document.body.classList.remove("overflow-hidden")}
      onClick={(event) => { if (event.target === event.currentTarget) closeMobile(); }}
      className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[calc(100vw-2rem)] border-0 bg-transparent p-2 text-foreground backdrop:bg-black/50 lg:hidden">
      <div className="group/sidebar flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl">
        <SidebarMenu {...props} expanded mobile onNavigate={closeMobile} onToggle={closeMobile} />
      </div>
    </dialog>
  </>;
}
