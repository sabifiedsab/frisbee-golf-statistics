# Frisbee Golf Statistics Website Plan

## Context
The user wants to build a website to track statistics from their frisbee golf games. The goal is to move from manual tracking to a digital system that provides insights through data visualization.

## Requirements
- **Core Stats**: Basic Scoring (total strokes, putts, and birdies/par/bogies per hole).
- **Key Feature**: Data Visualizations (charts and graphs to track progress over time).
- **Tech Stack**: T3-style stack (Next.js, TypeScript, Prisma, SQLite, Tailwind CSS, Recharts).

## Implementation Status

### 1. Phase 1: Foundation [COMPLETED]
- [x] Initialize Next.js project with TypeScript and Tailwind.
- [x] Setup Prisma and SQLite database schema.

### 2. Phase 2: Data Entry [COMPLETED]
- [x] Create a form to log a new game.
- [x] Build a simple dashboard to list recent games.
- [x] Implement scorecard/scoring entry.

### 3. Phase 3: Analytics & Visualization [COMPLETED]
- [x] Implement calculations for average score, putts per hole, and birdie/par/bogey percentages.
- [x] Create visualization pages using Recharts to show score trends over time.

### 4. Phase 4: Polishing [COMPLETED]
- [x] Fix scorecard UI alignment (Hole/Par/Strokes/Putts columns)
- [x] Draft and implement a different UI mode
- [x] Add responsive design for mobile use.
- [x] Add basic input validation.

### 5. Phase 5: User Authentication (NextAuth.js) [COMPLETED]
- [x] Setup NextAuth.js with Credentials provider
- [x] Update Prisma schema to include `User` model
- [x] Implement Registration (username: lowercase, digits only) and Login
- [x] Protect routes for logged-in users (POST/DELETE require auth)
- [x] Added AUTH_SECRET to fix JWT session errors

### 6. Phase 6: Hybrid Player & Game Management [COMPLETED]
- [x] Refactor database with `Participant` model (links `Game` to `User` or guest name via `name`)
- [x] Update scoring structure: `Score` now links to `Participant` (not directly to `Game`)
- [x] Added unique constraint on `(participantId, holeId)` to prevent duplicate scores
- [x] API: POST /api/games creates game with multiple participants
- [x] API: GET /api/games returns games where current user is a participant (per-user stats)
- [x] API: POST /api/scores uses upsert (create or update) instead of always creating
- [x] Removed old PUT /api/scores/[id] endpoint (replaced by upsert POST)
- [x] UI: Add Game page supports guest names and registered user search
- [x] UI: Current user shown as greyed-out "You (username)" in game creation
- [x] UI: Play mode and scorecard default to current user's participant (not first in list)
- [x] UI: Participant switcher in scorecard and play mode for multi-player games
- [x] Data model: games appear in all participants' accounts (shared scorecards)
- [x] **Fix: Play mode & scorecard now track scores in a live per-participant ref** so totals, progress dots, and participant switching reflect edits immediately (previously read the stale server snapshot fetched on mount, so taps appeared not to record)
- [x] **Fix: Save logic debounced (400ms) per participant+hole with an unmount flush** so rapid taps always persist the final value (previously a "saving" guard skipped saves mid-flight and could lose the last value)

### 7. Phase 7: Analytics & Filtering [PENDING]
- [ ] Update analytics logic to filter by `userId` and `Participant`
- [ ] Enable per-player statistics in visualizations

### 8. Phase 8: UX & QoL [COMPLETED]
- [x] Account indicator: avatar with initial in header; hover-open on desktop, tap on touch; dropdown shows username + sign out (redirects to /)
- [x] Chip tabs on home: `Games` | `Analytics` replace the "Recent Games" header; stat cards stay above; `?tab=` URL sync
- [x] Analytics summary on home tab: concise stats (games played, avg score, putts, best round) + sparkline + link to full `/analytics` page
- [x] Start at par: new games default strokes to the hole's par (putts 0); track an `edited` flag so progress dots still reflect progress
- [x] End game: last-hole chevron becomes a Finish button; fills par for untouched holes, toasts, navigates to the scorecard
- [x] Play mode layout: consolidate hole info into the header (`Hole x/total · Par y`), freeing the center for the strokes display
- [x] Scorecard: defaults to par display for holes with no DB record (consistent with play mode)
- [x] Remove dead `/dashboard` redirect route

### 9. Phase 9: Admin, Course Management, Per-Course Analytics, Locale [COMPLETED]
- [x] Admin role: `isAdmin` on User model; carried through JWT + session; ADMIN_USERNAME env var auto-promotes on login
- [x] API gating: POST /api/courses, POST /api/holes, PUT /api/courses/[id], POST /api/courses/[id]/fork all require admin
- [x] Course creation: batch-add holes (Add 9, Add 18, custom count); par uses Stepper component (+/− buttons); admin-gated
- [x] Course editing: edit-in-place for name/location/hole par; blocks deletion of holes with recorded scores
- [x] Course forking: "Save as new course" creates a copy with edits and archives the original (historical games keep pointing at the original)
- [x] Course archival: `isArchived` on Course; archived courses hidden from the Log Game dropdown; admin can see all via `?includeArchived=true`
- [x] Admin dashboard: `/admin` page with course list (including archived), user list, toggle admin status, quick stats
- [x] Admin link in user-menu dropdown (only for admins)
- [x] Per-course analytics: `?courseId=` filter on /api/analytics/trends; course selector dropdown on /analytics page
- [x] Date/time format: DD/MM/YYYY + 24h via `src/lib/format.ts`; replaced all `toLocaleString`/`toLocaleDateString` call sites
- [x] Language preference: `language` on User model; EN/NO toggle in user-menu (persists via PATCH /api/users/me); dummy for future i18n
- [x] Fix: course dropdown on /games/add showed the course ID after selection instead of the name (base-ui Select.Value needs a render function)

## Current Issues
- Analytics page still aggregates across all participants — needs per-user filtering (Phase 7)
- Language toggle is a dummy (persists preference but no UI string translation yet — full i18n is a future phase)

## Verification Plan
- [x] Data Integrity: Verify that a game can be saved and retrieved correctly from the database.
- [x] Calculation Accuracy: Manually verify that the statistics match the raw data.
- [x] Visuals: Ensure charts update correctly when new game data is added.
- [x] Responsive Test: Verify the scoring form is usable on a mobile device.
- [x] **Live scoring: Totals, progress dots, and participant switching update in real time as strokes/putts are entered**
- [x] **Admin: Non-admins can't create/edit courses; admin bootstrap via ADMIN_USERNAME env var works on login**
