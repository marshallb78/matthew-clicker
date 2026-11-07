# Matthew Clicker v1.1 — Ultimate Mega Edition

A chaotic, funny, fast-paced browser clicker game built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **Web Audio API**, and **Firebase (Auth + Firestore)**.

---

## Key Features in v1.1

- **Fast-Click Animation Engine:** Uses a restartable Web Animations API controller (`element.animate(...)`) in [`src/components/ClickerArea.tsx`](src/components/ClickerArea.tsx) so rapid clicking (even at 30+ clicks/second) never leaves Matthew stuck enlarged and always returns to `scale(1, 1)`.
- **31 Permanent Matthew Skins & Special Characters:**
  - All 16 core milestone Matthews + **Mathjew** (features a temporary bruised reaction on click before fading back to normal) + **Mathgoon** (distinct character) + 5 Realm Matthews + 2 Achievement Matthews + **World Champion Matthew** (#1 Season Winner exclusive) + 5 **Rare Matthew Storm Live Event Skins**.
  - Every skin uses an individually replaceable placeholder file under [`public/assets/skins/`](public/assets/skins/).
  - Earned skins automatically unlock, trigger a cosmetic **Matthew Rain** celebration, and immediately equip.
  - Locked skins are strictly enforced via [`equipSkin()`](src/data/skins.ts) across all UI, save, and cloud code paths. Settings contains zero skin selection controls.
- **5 Seasonal Realms & Uper Completion:**
  - Progress through **Earth** (`1×`), **Under** (`2.5×`, dark crimson abyss theme), **Ocean** (`6×`), **Space** (`16×`), and **Uper** (`50×`, the Final Realm).
  - Unlocking **Uper** displays the official `"Matthew Clicker"` completion badge ([`public/assets/completion/matthew-clicker-uper-complete.svg`](public/assets/completion/matthew-clicker-uper-complete.svg)), instructs the player to save/copy it and send it to **`gt3`**, and unlocks Endless Mode.
- **Gem Economy & Uncapped Offline Earnings:**
  - **Normal Active Play:** `3 Gems` per `10 minutes` of active play.
  - **Matthew Storm Active Play:** `10 Gems` per `10 minutes` of active event participation.
  - **Daily Login Bonus:** `+5 Gems` once per day (`America/New_York`).
  - **Offline Earnings:** Uncapped Matthew Coin generation while away (**no 8-hour cap**), while strictly awarding `0 Gems` offline.
- **30-Day Competitive Seasons & Worldwide Leaderboard:**
  - Synchronized 30-day seasons reset seasonal coins, upgrades, rebirths, and realms while permanently preserving all unlocked skins, gems, and career history.
  - Worldwide seasonal leaderboard (`leaderboards/{seasonId}/entries`) ranks players by validated `seasonalScore` with deterministic tie-breaking and awards **World Champion Matthew** to the #1 winner.
- **Friday 2× Bonus & Matthew Storm Live Event:**
  - **Friday 2× Points:** Automatically doubles coin earnings every Friday (`America/New_York`) and stacks multiplicatively with Matthew Storm wave multipliers.
  - **Matthew Storm Live Event:** Scheduled for **Friday, November 13, 2026, 9:45 AM – 3:00 PM EST** (`2026-11-13T09:45:00-05:00` to `15:00:00-05:00`), featuring a 10-second unskippable fullscreen lightning countdown, dark purple storm atmosphere, random 4×–15× waves, 1 clickable **Giant Rare Matthew** per wave, an **Event Shop** (5 limited skins at 50 Gems each, open throughout the entire event including between waves), an **Event Recap** screen, and an isolated **`START LIVE EVENT — TEST`** button.
- **Intro Cutscene & Easter Eggs:**
  - Features a loading screen and skippable intro cutscene where a **Giant Hand** enters the screen and transitions into the **"Matthew Virty Edit"** sequence (replayable anytime from Settings or by typing `virty`; type `rain` for Matthew Rain).

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run automated unit tests (Vitest)
npm test

# Build for production
npm run build
```

---

## Documentation Index

- [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) — Complete Firebase Console setup, Auth, Firestore rules, and index configuration.
- [`FIREBASE_MAINTENANCE.md`](FIREBASE_MAINTENANCE.md) — How to manage seasons, reschedule live events, and monitor Firestore usage.
- [`ASSET_REPLACEMENT_GUIDE.md`](ASSET_REPLACEMENT_GUIDE.md) — Exact file paths and dimensions to replace any skin placeholder with custom artwork.
- [`TESTING_CHECKLIST.md`](TESTING_CHECKLIST.md) — Automated and manual QA verification checklist.
- [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) — Production build and GitHub Pages / Firebase Hosting instructions.
