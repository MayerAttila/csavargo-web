"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notifications";
import { isPublicMapToken, mapErrorMessage } from "./map-errors";
import { retrievePlace, suggestPlaces, type PlaceSuggestion } from "./search-api";
import type { MapPoint } from "./types";

type SearchSession = { id: string; startedAt: number; calls: number };
type Results = { query: string; items: PlaceSuggestion[]; session: string };

export function PlaceSearch({ token, onSelect }: { token: string; onSelect: (point: MapPoint) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const session = useRef<SearchSession | null>(null);
  const pending = useRef<AbortController | null>(null);
  const version = useRef(0);
  const listId = useId();
  const enabled = isPublicMapToken(token);
  const items = open && results?.query === query.trim() ? results.items : [];

  function cancel() { version.current++; pending.current?.abort(); }
  function change(value: string) { cancel(); setQuery(value); setResults(null); setActive(-1); setOpen(true); setBusy(false); }

  useEffect(() => {
    if (!enabled || !open || query.trim().length < 3) return;
    const controller = new AbortController();
    const requestVersion = ++version.current;
    pending.current = controller;
    const timer = setTimeout(async () => {
      if (!session.current || Date.now() - session.current.startedAt >= 175_000 || session.current.calls >= 49) {
        session.current = { id: crypto.randomUUID(), startedAt: Date.now(), calls: 0 };
      }
      const current = session.current;
      current.calls++;
      setBusy(true);
      try {
        const suggestions = await suggestPlaces(query.trim(), token, current.id, controller.signal);
        if (!controller.signal.aborted && requestVersion === version.current) setResults({ query: query.trim(), items: suggestions, session: current.id });
      } catch (error) {
        if (!controller.signal.aborted && requestVersion === version.current) notify.error(mapErrorMessage(error), { id: "map-search" });
      } finally {
        if (!controller.signal.aborted && requestVersion === version.current) setBusy(false);
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, token, enabled, open, retry]);
  useEffect(() => () => { pending.current?.abort(); version.current++; }, []);

  async function select(suggestion: PlaceSuggestion) {
    if (!results) return;
    if (!session.current || Date.now() - session.current.startedAt >= 175_000) {
      cancel(); setResults(null); setActive(-1); setOpen(true); setRetry((value) => value + 1);
      notify.error("A találatok elévültek. Frissítjük a keresést, majd válaszd ki újra a helyet.", { id: "map-search" });
      return;
    }
    cancel();
    const controller = new AbortController();
    const requestVersion = version.current;
    pending.current = controller;
    setBusy(true);
    try {
      // Use the exact session that produced this suggestion.
      const point = await retrievePlace(suggestion.mapbox_id, token, results.session, controller.signal);
      if (controller.signal.aborted || requestVersion !== version.current) return;
      session.current = null;
      setQuery(""); setResults(null); setOpen(false); setActive(-1);
      onSelect(point);
    } catch (error) {
      if (!controller.signal.aborted && requestVersion === version.current) notify.error(mapErrorMessage(error), { id: "map-search" });
    } finally {
      if (!controller.signal.aborted && requestVersion === version.current) setBusy(false);
    }
  }

  return <div className="relative" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) { cancel(); setOpen(false); setBusy(false); }
  }}>
    <Input type="search" value={query} maxLength={256} disabled={!enabled} role="combobox" aria-autocomplete="list"
      aria-expanded={items.length > 0} aria-controls={listId} aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
      aria-describedby={`${listId}-hint`} onChange={(event) => change(event.target.value)}
      onFocus={() => setOpen(true)} onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); cancel(); setOpen(false); setBusy(false); }
        if (event.key === "ArrowDown" && items.length) { event.preventDefault(); setActive((index) => (index + 1) % items.length); }
        if (event.key === "ArrowUp" && items.length) { event.preventDefault(); setActive((index) => (index <= 0 ? items.length - 1 : index - 1)); }
        if (event.key === "Enter") { event.preventDefault(); if (items[active] && !busy) void select(items[active]); }
      }} />
    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <p id={`${listId}-hint`} role="status">{busy ? "Helyek keresése…" : results?.query === query.trim() && !items.length && open ? "Nincs találat." : "Város, cím vagy látnivaló · legalább 3 karakter"}</p>
      {enabled && query.trim().length >= 3 && <button type="button" className="shrink-0 rounded px-1 py-2 text-brand focus-visible:outline-2" onClick={() => { cancel(); setOpen(true); setRetry((value) => value + 1); }}>Újra</button>}
    </div>
    {items.length > 0 && <ul id={listId} role="listbox" aria-label="Talált helyek" className="absolute inset-x-0 top-14 z-20 overflow-hidden rounded-2xl border border-border bg-surface p-1 shadow-xl">
      {items.map((item, index) => <li id={`${listId}-${index}`} role="option" aria-selected={active === index} key={item.mapbox_id}
        className={`rounded-xl ${active === index ? "bg-brand/10" : ""}`}>
        <button type="button" tabIndex={-1} disabled={busy} onMouseDown={(event) => event.preventDefault()} onClick={() => void select(item)}
          className="w-full rounded-xl p-3 text-left hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">
          <span className="block text-sm font-medium">{item.name}</span><span className="block text-xs text-muted-foreground">{item.full_address ?? item.place_formatted}</span>
        </button>
      </li>)}
    </ul>}
  </div>;
}
