# Csavargó Web

Magyar nyelvű utazástervező frontend. **M1 scaffold** – a landing page és a téma alapjai készültek el, az utazásszervező funkciók még nem.

## Stack
Next.js 16, React 19, TypeScript, Tailwind CSS 4 (custom UI), React Icons, React Hot Toast, MUI X Charts, TanStack Query és Mapbox.

## Local setup
```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Megnyitás: http://localhost:3000

## Colors
- Brand: `#3B82F6`
- Accent: `#10B981`
- Light: `#F3F4F6`
- Dark: `#222226`

## API typing
A [csavargo-api](https://github.com/MayerAttila/csavargo-api) később verziózott OpenAPI contractot fog publikálni, amelyből a web repository TypeScript DTO-kat generál majd. Ez még nincs implementálva.
