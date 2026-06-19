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

## Current Issues
- A course must be added via "Add Course" before starting a game (DB was reset)
- Analytics page uses aggregate of all participants — needs per-user filtering

## Verification Plan
- [x] Data Integrity: Verify that a game can be saved and retrieved correctly from the database.
- [x] Calculation Accuracy: Manually verify that the statistics match the raw data.
- [x] Visuals: Ensure charts update correctly when new game data is added.
- [x] Responsive Test: Verify the scoring form is usable on a mobile device.
- [x] **Live scoring: Totals, progress dots, and participant switching update in real time as strokes/putts are entered**
