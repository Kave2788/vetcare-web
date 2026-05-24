# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VetCare** is a PWA for managing veterinary inpatient records (patients, vitals, therapies). It's a vanilla HTML/CSS/JS app with no build tools—all files are static and served directly. Deployed to GitHub Pages and backed by Supabase.

- **Language:** Italian (interface and data labels)
- **User:** Fede (veterinarian)
- **Key Feature:** Mobile-first iOS app with safe-area support, offline-capable service worker, real-time board view
- **Repository:** https://github.com/Kave2788/vetcare-web  
- **Live:** https://kave2788.github.io/vetcare-web/

## Architecture & Data Model

### Frontend Stack
- **No build tools, no framework**: pure HTML/CSS/JS with ES modules
- **CSS:** Dark theme, CSS variables, mobile-first responsive (CSS Grid, Flexbox)
- **UI Pattern:** Multi-page SPA where each .html file is self-contained, imports from `db.js`
- **PWA:** `manifest.json` + `sw.js` (installable as native app, offline fallback for cached assets)

### Database (Supabase)
Three main tables with relational structure:

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **patients** | Animal records | id, name, species, breed, age, weight, status (stable/critical/discharged), admitted_at, owner, notes, food, allergies |
| **vitals** | Vital signs & clinical observations | patient_id, recorded_at, temp, heart_rate, resp_rate, resp_type, dehydration, sensorium, mucosae, feces, urine, urine_output_ml/hours, enteral_ml, water/food_status, notes |
| **therapies** | Drug administration | patient_id, drug, dose, unit, route, frequency, started_at, active, notes, prescriber |

### Key Files

| File | Purpose | Pattern |
|------|---------|---------|
| **index.html** | Patient list (active admissions only) | Imports db.js, renders patient cards with status badges, long-press to delete |
| **patient.html** | Patient detail page | 3 tabs: Anagrafica (demographics), Scheda (status/vitals), Terapie (drugs) |
| **new/edit-patient.html** | Patient add/edit forms | Form input with validation before INSERT/UPDATE |
| **add/edit-vitals.html** | Vitals entry forms | Dropdown enums for resp_type, dehydration, sensorium, mucosae, feces, urine, water/food_status; auto-calc urine_output (ml/kg/h), enteral RER (70×kg^0.75) |
| **add/edit-therapy.html** | Therapy management | Drug autocomplete from drugs.json, dose calculator by weight/age/status |
| **board.html** | Daily shift board (landscape) | Time-based grid (8-20h), patient vitals row + drug rows below, real-time Supabase channel, checkmark-on-click (localStorage per day) |
| **db.js** | All Supabase queries + constants | Exports: loadPatients(), addVital(), stopTherapy(), etc. + label enums (STATUS_LABEL, FREQ_LABELS, DEHYD_LABELS, etc.) |
| **style.css** | Global dark theme | CSS vars (--bg, --card, --accent, etc.), safe-area-inset for iOS, responsive breakpoint @media (max-width: 360px) |
| **sw.js** | Service worker | Cache v-number (e.g., vetcare-v25), network-first for Supabase requests, cache-first for static assets |
| **drugs.json, diets.json** | Lookup tables | JSON arrays for autocomplete (40 drugs, 80+ diets) |
| **manifest.json** | PWA metadata | start_url: /vetcare-web/, scope: /vetcare-web/, standalone display, icons 192/512px |

## Development & Testing

### No Build Process
There's no npm/build step. Just edit files directly and test in browser.

### Running Locally
```bash
# Simple HTTP server (Python 3)
python3 -m http.server 8000

# Visit http://localhost:8000 (or :8001, etc. if 8000 in use)
```

Then open http://localhost:8000/index.html or just http://localhost:8000 (if you configure index.html as default).

**Note on service worker:** When testing locally, the SW may cache aggressively. To clear cache:
- Open DevTools → Application → Service Workers → click "Unregister"
- Clear site data → Storage → Clear Site Data
- Hard refresh (Cmd+Shift+R on Mac)

### Testing in Browser
- **Desktop:** Chrome/Safari DevTools (toggle device toolbar for mobile layout)
- **iOS:** On actual device, visit http://[your-ip]:8000 (not localhost), or deploy to GitHub Pages and test the live URL
- **Key checks for iOS:**
  - Safe area: topbar/FAB not covered by notch/home indicator
  - Touch targets: buttons ≥44×44px
  - Landscape rotation on board.html
  - Service worker registration (offline capability)

### Common Workflows

**Add a new patient field:**
1. Supabase dashboard: add column to `patients` table
2. `new-patient.html`: add form input + label
3. `patient.html` (Anagrafica tab): display field
4. `db.js`: if it's an enum (status, species), add constant export

**Add a new vital sign dropdown:**
1. Supabase: add column to `vitals` table (e.g., `new_sign` text)
2. `db.js`: add `NEW_SIGN_LABELS = { key1:'Label', key2:'Label' }` export
3. `add-vitals.html`: add `<select>` field, populate from db.js constants
4. `patient.html` Scheda tab: display in vitals list

**Update service worker cache:**
- Edit `sw.js` line 1: increment `CACHE = 'vetcare-v26'` (or next version)
- Add new file to ASSETS array if it's a new static asset
- Browser auto-registers new SW on next page load, old cache is deleted by activate listener

**Deploy to GitHub Pages:**
```bash
git add .
git commit -m "Your message"
git push
# Live in ~1-2 minutes at https://kave2788.github.io/vetcare-web/
```

## Key Implementation Details

### Safe Area Handling (iOS)
All sticky/fixed elements must respect safe-area-inset-* to avoid overlapping notch/home indicator:
- **Topbar:** `padding-top: calc(14px + env(safe-area-inset-top))`
- **FAB/Fixed buttons:** `bottom: calc(28px + env(safe-area-inset-bottom))`
- **Page padding:** `padding: 0 16px calc(100px + env(safe-area-inset-bottom))`

See `style.css` lines 32, 35, 99 for examples.

### Service Worker Caching Strategy
- **Network-first:** Supabase URLs (supabase.co, esm.sh) → fetch with fallback to cache if offline
- **Cache-first:** Static assets (.html, .css, .js, .json) → serve from cache, update in background
- **Dynamic cache:** Any other .html/.css/.js fetched live gets cached for future offline use

The service worker **auto-unregisters on index.html load** (lines 15-19) to force fresh registration—this prevents stale SW issues.

### Data Labels & Enums
All dropdown options are defined as constants in `db.js` (STATUS_LABEL, ROUTE_LABELS, FREQ_LABELS, etc.). This centralizes them and avoids duplicate label maintenance. Always import from db.js rather than hardcoding.

### Supabase Queries
All Supabase calls are in `db.js`. Pattern:
```javascript
export async function loadSomething(id) {
  const { data, error } = await db.from('table').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
```
Errors are thrown (not caught) so calling code can handle with try/catch and toast().

### Real-Time Board Updates
`board.html` uses Supabase's `.on('*')` listener on the `board-vitals` channel. On vitals insert/update/delete, the board auto-refreshes the affected patient row. It also re-fetches on page visibility change (tab focus) and has a manual refresh button.

### Form Patterns
- Always validate before INSERT/UPDATE (non-empty required fields, valid dates)
- Show loading state (disable button, show spinner)
- On success: navigate away or show toast + render
- On error: show toast with error message
- Use `localStorage` for form drafts if you want to persist incomplete entries

### Calculations
- **RER (Basal Energy Requirement):** `70 × weight_kg ^ 0.75` kcal/day
- **Urine output normalized:** `ml ÷ hours ÷ weight_kg` → ml/kg/h
- **Dose by weight:** Parse age string (e.g., "4a", "2a 3m") to determine pediatric/geriatric class, then apply correction factors from drugs.json

### File Encoding & Language
- **Encoding:** UTF-8 (all files)
- **Language:** Italian UI + data labels, but code comments/variable names can be English or mixed

## Code Style & Patterns

### CSS
- Use CSS variables from `:root` (--bg, --card, --accent, --text1, --text2, --text3)
- Mobile-first breakpoint: `@media (max-width: 360px)`
- Responsive units: `%`, `rem`, `em`, or `px` where fixed width needed
- Always include safe-area-inset for sticky/fixed/bottom-padded elements

### JavaScript
- **ES modules:** `import`/`export`, no CommonJS
- **Async/await:** Preferred over .then() for readability
- **Error handling:** throw errors from db.js, catch in UI with try/catch + toast
- **DOM manipulation:** Vanilla methods (getElementById, querySelector, innerHTML for rendering)
- **No frameworks/bundlers:** Keep it simple
- **Event listeners:** Use `addEventListener` with options ({ passive: true } for touch events)

### Naming
- HTML files: kebab-case, describe action or entity (new-patient, add-vitals)
- Functions: camelCase, verb-first for actions (loadPatients, addVital, deleteTherapy)
- Constants: UPPER_SNAKE_CASE (STATUS_LABEL, CACHE)
- CSS classes: kebab-case, semantic (patient-card, therapy-pill, form-field)

### Mobile Priority
- Test every change on iOS (both notch-safe and full-screen)
- Touch targets ≥44×44px
- No hover states (use :active instead)
- Landscape layout for board.html (use CSS `@media (orientation: landscape)` or aspect-ratio check)

## Supabase Project

**Project ID:** rwhucgatmrphmakrwwma  
**URL:** https://rwhucgatmrphmakrwwma.supabase.co  
**Anon Key:** Stored in db.js (safe, public key for client-side access)

The app doesn't use any authenticated users—all data is accessed with the public anon key. Future auth (per-clinic login, etc.) would require JWT tokens and policy updates.

## Common Gotchas

1. **Service Worker not updating?** Manually unregister in DevTools or clear cache (see "Testing in Browser" above).
2. **Form doesn't submit?** Check browser console for JS errors. Validate inputs before calling db functions.
3. **Supabase auth fails silently?** db.js throws errors—check try/catch in calling code.
4. **Layout breaks on small screen?** Check @media (max-width: 360px) rules and that padding includes safe-area-inset.
5. **Board not showing real-time updates?** Check Supabase connection + verify vitals table has RLS allow-all policy (if not authenticated).
6. **Therapies don't appear on index?** loadPatients() joins therapies; make sure therapies.active=true if you want them to show in the active therapy count.

## Future Considerations

- **Offline data sync:** Current SW caches HTML/CSS/JS but doesn't persist form submissions offline. Future: IndexedDB queue for offline inserts.
- **Search/filter:** Currently loading all patients on index—fine for <100 patients. Future: pagination or server-side filtering.
- **User auth:** All data public (anon key). Future: clinic login, per-user prescriber field, audit logging.
- **Multi-clinic:** Single Supabase project serves one clinic. Future: tenant isolation.
