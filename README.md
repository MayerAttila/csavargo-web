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
Az `src/app/(public)` a nyilvános oldalakat és a beágyazott `(auth)` űrlapokat, az
`src/app/(protected)` a belépést igénylő oldalakat tartalmazza. A route groupok nem módosítják az URL-eket.
A védett layout ellenőrzi a munkamenetet; a személyes adatot használó oldalak is meghívják a közös
`requireServerMe` segédet. A `getServerMe` lekérés egy szerverkérésen belül megosztott, a kérések között nem cache-elődik.
Az áttekintő oldal szerveroldalon ellenőrzi a munkamenetet. A jelszó-visszaállítás minden korábbi munkamenetet visszavon.
A felület saját Tailwind komponenseket használ; a munkamenetet HttpOnly süti kezeli.

## Belépés utáni navigáció

A `(protected)` layout közös alkalmazáskeretet használ. Asztali nézetben keskeny ikonsáv látható,
amely rámutatásra vagy billentyűzetes fókuszra kinyílik; a nyíl gombbal nyitva rögzíthető.
Mobilon a menügomb modális oldalsávot nyit, fókuszcsapdával, Escape-bezárással és háttérgörgetés-tiltással.
Navigációkor és asztali méretre váltáskor bezáródik.

Az oldalsáv alján megjelenítésváltó, kijelentkezés és felhasználói név/e-mail szerepel.
A még fejlesztés alatt álló menüpontok inaktívak, „Hamarosan” jelöléssel; nincs nem létező oldalra mutató link.
A nyilvános oldalakon nincs sidebar. A kijelentkezés minden védett oldalról elérhető, törli a privát query-adatokat.

## Közös input komponens

```tsx
import { Input } from "@/components/ui/input";

<Input type="name" required />
<Input type="email" required />
<Input type="password" autoComplete="new-password" required />
<Input type="password" name="confirmPassword" label="Jelszó megerősítése" autoComplete="new-password" />
```

A típus automatikusan beállítja az ikont, az alapértelmezett magyar címkét, az autocomplete-ot és a mező nevét.
A címke a mezőn belül lebeg: fókusznál vagy kitöltött értéknél feljebb mozdul. A címke valódi, akadálymentes HTML label;
az animáció a csökkentett mozgás beállítását is figyelembe veszi. Minden stílus Tailwind utility, nincs új UI-library.
A `name` típus natív `text` mezőként működik. A `password` mező szem ikonnal kapcsolható látható/rejtett módba.
A szokásos input propok, saját `id`, `name`, `label`, `ref`, `disabled`, `readOnly` és `onChange` is használhatók.
Az `error` hibásnak jelöli a mezőt; a hiba szövegét a hívó komponens toastban jeleníti meg.

## Értesítések

Az egész alkalmazásban React Hot Toast működik, egyetlen `AppToaster` komponenssel a közös providerben.
A `notify` API bármely klienskomponensben használható:

```tsx
import { notify } from "@/lib/notifications";

notify.success("Sikeres mentés!");
notify.error("A mentés nem sikerült.");
notify.promise(saveTrip(), {
  loading: "Mentés…",
  success: "Az utazást elmentettük.",
  error: "Az utazás mentése nem sikerült.",
});
```

A globális QueryClient automatikusan jelez lekérdezési és módosítási hibánál, szerverhiba-részletek megjelenítése nélkül.
A query/mutation `meta.errorMessage` magyar szöveget állíthat be; mutation esetén a `meta.successMessage`
siker-toastot is kérhet. A `meta.silent: true` kikapcsolja az automatikus értesítést, ha a komponens maga kezeli.
A kijelentkezett munkamenet (`UNAUTHORIZED`) nem kap általános hiba-toastot. Az űrlapok validációs és műveleti
visszajelzései kizárólag toastban jelennek meg, ismétlődő inline hiba- vagy sikerüzenet nélkül.
A hibás mezőket az `aria-invalid` attribútum jelöli.
Az auth sikerüzenetei teljes oldalas navigáció után is megjelennek; csak rögzített értesítési kód kerül sessionStorage-ba.
Az auth hibaszövegeit a `authError` a hibakód, HTTP-státusz és művelet alapján választja ki
(például foglalt e-mail-cím, nem engedélyezett webcím, elérhetetlen regisztrációs szolgáltatás).
A szerver nyers belső hibaüzenete nem kerül a felületre.

## Térképes próbaoldal

A belépés után elérhető `/terkep` oldal a Mapbox-integráció kipróbálására szolgál.
A pontok kizárólag memóriában élnek; frissítéskor a három budapesti mintapont tér vissza.
Kereshetsz városra, címre vagy látnivalóra, kattintással saját pontot vehetsz fel, válthatsz
normál/műholdas nézet között, és gombnyomásra lekérheted a saját helyzetedet.
A normál térkép követi a világos/sötét témát. A térkép 2D; útvonaltervezés még nincs.

A térképen látható látnivalók és üzletek feliratára/ikonjára kattintva az adott hely kerül kijelölésre,
névvel és elérhető részletekkel. A már felvett hely nem duplázódik. Csak üres térképfelületre kattintva
készül „Saját hely” pont. A normál stílus a Standard `poi` featuresetet, a műholdas a POI-címkerétegeket használja.

Az `.env.local` fájlban állítsd be a `NEXT_PUBLIC_MAPBOX_TOKEN` változót egy saját **nyilvános `pk.*`**
Mapbox-tokenre. Titkos `sk.*` token nem kerülhet a frontendbe. A Mapbox-fiókban korlátozd az engedélyezett
URL-eket a használt fejlesztői és éles webcímekre; a fejlesztői localhost/LAN-címet is add hozzá, ha használod.
A tokennek térképstílusokhoz/fontokhoz és a Search Box szolgáltatáshoz kell hozzáférnie.
Változtatás után indítsd újra a fejlesztői szervert; éles kiadásnál új build szükséges.
Token nélkül a helylista kipróbálható, a térkép beállításra váró állapotot mutat.

A közös elemek a `src/components/maps` mappában vannak:

- `MapCanvas`: böngészőben betöltött térképmotor, pontok, kijelölés, kattintás, kamerakérések; nincs auth vagy mentés.
- `MapPoint`: stabil `id`, `label`, `[longitude, latitude]`, opcionális `address` és `source`.
- `PlaceSearch`, `PlaceList`: külön is beépíthető kezelőfelület; törlés közvetlenül a helylista soraiban.
- `PlaceInfoPanel`: a kijelölt sor alatt cím, kategória, értékelés, relatív árszint, heti nyitvatartás,
  weboldal és telefon, amennyiben a Mapbox visszaadja. Hiányzó adat nem kap kitalált értéket.

A keresés már a részletes `visit,venue` metaadatokat is kéri. A mintapontok adatait csak kattintáskor
keressük meg, pontos névegyezéssel és legfeljebb 500 méteres távolsággal; a találat csak az aktuális
oldal memóriájában marad. Saját koordinátaponthoz nem társítunk automatikusan egy közeli üzletet.
Az árszint `$`–`$$$$` jelölés, nem konkrét belépőjegyár vagy forintbecslés; a szolgáltató adatlefedettsége helyenként eltér.
- `MapExplorer`: kizárólag a próbaoldal állapota, mintapontjai és gombjai.

A befogadó komponens kezeli a pontokat és a kijelölést. A `MapCanvas` `cameraCommand` új objektummal
ismételhető `view` vagy `fit` kamerakérést fogad. A téma/stílusváltás megőrzi a kamerát és a pontokat;
a komponens a konténerméretet is figyeli, és kilépéskor felszabadítja az erőforrásokat.
A Mapbox vendor CSS a root layoutban van, saját stílusok kizárólag Tailwind utilityk.

A kereső a [Search Box API](https://docs.mapbox.com/api/search/search-box/) `suggest`/`retrieve`
végpontjait használja, magyar nyelvvel, 350 ms késleltetéssel és session-tokenekkel.
A szolgáltató eredményei ideiglenes használatúak: nem kerülnek localStorage-ba, adatbázisba vagy query-cache-be.
A [Mapbox Standard](https://docs.mapbox.com/map-styles/reference/standard/) stílus 3D objektumai ki vannak kapcsolva.

A unit tesztek mockolják a Mapbox motort és a hálózatot, ezért token nélkül futnak a CI-ben.
Valódi tokennel ellenőrizd a térkép és keresés betöltését, a hely kiválasztását, a 2D/műholdas és témaváltást,
a saját helyzetet, a billentyűzetes használatot, a sidebar átméretezést és a mobilos helypanelt.

## Ellenőrzési parancsok

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
