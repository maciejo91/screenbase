# Screenbase

A personal, Mobbin-style library of UI screenshots, focused on web SaaS and CRM products.
It runs locally and stores everything as plain files: images live in a folder and metadata lives in one JSON file. There is no database.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (`radix-nova` style, `neutral` base color) · lucide-react · fuse.js · sharp.

## Run

```bash
npm install
npm run dev          # http://localhost:3000, hot reload while you hack on it
# or, the fastest option for everyday use:
npm run build && npm run start   # production server on :3000
```

Images you import while the production server is running are served right away through a fallback route (`/api/media/*`), so you don't need to rebuild after an import.

## Using it

| | |
|---|---|
| **Search** | `/` focuses it. Typing a screen type (`dashboard`, `pricing`, `kanban`…) shows exactly that type. Typing an app name plus something else (`Example CRM A table`) scopes to that app. Other text is fuzzy-matched across app, type, tags, category and description, and every word must match. `Enter` opens the first result. |
| **Filters** | Type / App / Patterns chips. Multiple chips within a row are OR'ed for type and app, and AND'ed for patterns. The counts are faceted, meaning they reflect the current search. |
| **⌘K / Ctrl+K** | Command palette: jump to a type, app, pattern, a single screen, or Import. |
| **Detail** | Click a card. `←/→` (or `j/k`) moves to the previous or next screen in the current results, and `Esc` closes. Everything in the side panel is editable and saves straight to `data/screens.json` (screen type, tags, notes, app, category, source). You can also delete a screen there. |
| **App view** | `/apps/<App name>` lists all screens of one product in import order. Get there by clicking the app name on a card or in the detail panel. |
| **Shareable URLs** | Search, filters and the open screen are kept in the URL, e.g. `/?q=table&tag=filters&s=<id>`. |
| **Import (UI)** | Drag files **or folders** anywhere onto the page, or use the **Import** button. A folder's name becomes the app name unless you pick one. Screen type is guessed from the file name (`03-pricing.png` → pricing). |

## Import from the CLI

```bash
npm run import -- ~/Screenshots/crm                    # sub-folders become app names
npm run import -- ./hubspot --app HubSpot --source https://hubspot.com
npm run import -- ./shots --app Attio --type dashboard --tags "charts,filters"
```

- Scans the folder recursively for png, jpg, jpeg, webp, gif, avif and svg files.
- Copies each image to `public/screens/` and writes a 640×400 webp thumbnail to `public/thumbs/`.
- Adds an entry with **empty tags** and description, ready to tag in the UI.
- Duplicate images (same content hash) are skipped, so re-running is safe.
- Files are added in natural name order, which is the order the app view shows them. Prefix flows with `01-`, `02-`, … to keep them in sequence.

Other scripts:

```bash
npm run thumbs                 # generate thumbnails for entries missing them (npm run thumbs -- --all to redo every one)
npm run seed                   # (re)create the 12 demo placeholder screens
npm run seed -- --count 300    # stress test: 300 placeholder entries
npm run remove-placeholders    # delete every entry with source "placeholder" (and its files)
```

## Metadata format: `data/screens.json`

An array of entries like this:

```json
{
  "id": "2b1d25f46cd4",
  "file": "hubspot-2b1d25f46cd4.png",
  "thumb": "2b1d25f46cd4.webp",
  "width": 1600,
  "height": 1000,
  "app": "HubSpot",
  "category": "CRM",
  "screenType": "pipeline/kanban",
  "tags": ["kanban", "filters", "bulk actions"],
  "description": "Deals board with stage totals in column headers.",
  "source": "https://app.hubspot.com/…",
  "addedAt": "2026-10-29T15:37:57.096Z"
}
```

| field | meaning |
|---|---|
| `id` | First 12 characters of the image's SHA-1 hash (the demo entries use `placeholder-NN`). |
| `file` | Full-size image in `public/screens/`. |
| `thumb` | 640×400 webp thumbnail in `public/thumbs/`, used only in the grid. |
| `width`, `height` | Original pixel size. It sets the image size in the detail view so nothing jumps while loading. |
| `app` | Product name. |
| `category` | E.g. `CRM`, `Helpdesk`, `Analytics`. |
| `screenType` | One of `dashboard`, `list/table`, `detail/record`, `pipeline/kanban`, `onboarding`, `pricing`, `settings`, `login`, `empty state`, `modal`, `search`, `reports`, `inbox`, `calendar`, `other`, or anything you type. `untagged` means it hasn't been classified yet. |
| `tags` | Patterns or features, stored lowercase. |
| `description` | Short note. |
| `source` | A URL, `own`, or `placeholder` (demo data). |
| `addedAt` | ISO timestamp. The library shows newest first; the app view shows oldest first. |

You can edit the JSON by hand. The dev server picks up changes on reload, and so does `next start`, because the pages read the file on every request.

## Performance notes

- The grid only loads small webp thumbnails (≈3–30 KB each) at a fixed 16:10 ratio, so the layout never shifts. The first 8 load eagerly and the rest lazily. Cards render progressively in pages of 60 and use `content-visibility: auto`.
- Search runs entirely in the browser (fuse.js, memoized, `useDeferredValue`) and returns instantly.
- The detail dialog, command palette and import dialog are code-split and load the first time you open them. The detail view shows the cached thumbnail as a placeholder and preloads the previous and next full images.
- About 150 kB of first-load JS. Tested with 300 entries: about 60 fps while scrolling, and prev/next in the detail view is instant.

## Project layout

```
app/
  page.tsx                  library (all screens)
  apps/[app]/page.tsx       app view
  api/screens/route.ts      GET list
  api/screens/[id]/route.ts PATCH (edit) / DELETE
  api/upload/route.ts       POST multipart upload (UI import)
  api/media/[...path]       serves images added after `next build`
components/
  Library.tsx               search, filters, URL state, drag & drop, wiring
  ScreenGrid.tsx            thumbnail grid (progressive, memoized cards)
  Lightbox.tsx              detail dialog + inline editing
  ImportDialog.tsx          upload UI
  CommandPalette.tsx        ⌘K
  FilterRow.tsx, Combobox.tsx, AppAvatar.tsx
  ui/                       shadcn/ui components
lib/
  ingest.mjs                shared import logic (hashing, copying, sharp thumbnails), used by both the CLI and the API
  search.ts                 query understanding + fuse config
  store.ts                  read/write screens.json (writes are serialized)
  types.ts, url.ts, files.ts
scripts/                    import, thumbs, seed, remove-placeholders
data/screens.json           metadata
public/screens, public/thumbs
```
