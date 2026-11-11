# Csavargó Web

Magyar nyelvű utazástervező frontend. **M1** – landing page, világos/sötét téma, e-mailes regisztráció,
belépés, opcionális e-mail-megerősítés, jelszó-visszaállítás és védett áttekintő oldal.
Az utazásszervező funkciók még fejlesztés alatt állnak.

## Stack
Next.js 16, React 19, TypeScript, Tailwind CSS 4 (custom UI), React Icons, React Hot Toast, MUI X Charts, TanStack Query és Mapbox.

## Local setup
```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Megnyitás: http://localhost:3000

A backendnek és az adatbázisnak futnia kell; a fő repository tartalmazza a Docker Compose-konfigurációt.
Az `API_INTERNAL_URL` a privát API címe, alapértelmezetten `http://127.0.0.1:3001`.
A Next.js az `/api/*` kéréseket erre továbbítja; böngészőben nincs külön API-origin.
Az érték buildkor és futáskor egyezzen.

Oldalak: `/belepes`, `/regisztracio`, `/elfelejtett-jelszo`, `/uj-jelszo`, `/email-megerosites`, `/attekintes`.
Az áttekintő oldal szerveroldalon ellenőrzi a munkamenetet. A jelszó-visszaállítás minden korábbi munkamenetet visszavon.
A felület saját Tailwind komponenseket használ; a munkamenetet HttpOnly süti kezeli.

## Ellenőrzés

`pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm build`.
A teljes Mailpit/Playwright auth-folyamat a fő repository `pnpm test:e2e` parancsával fut.

## Colors
- Brand: `#3B82F6`
- Accent: `#10B981`
- Light: `#F3F4F6`
- Dark: `#222226`

## API typing
A `src/generated/api.ts` fájlt az `openapi-typescript` állítja elő a backend `contracts/openapi.v1.json`
szerződéséből. Frissítés: a fő repositoryban `pnpm contract:generate`, vagy a backend exportja után itt
`pnpm contract:generate` (a szomszédos `../csavargo-api` szükséges). A generált típusok commitolva vannak,
így a frontend önállóan is buildelhető. A Better Auth kliens és szerver verziója egyezzen.
