# Verification report

**Result:** 17/17 unit tests and 55/55 end-to-end checks passed on the production build (`npm run build && npm run preview`).

The checks ran in headless Chromium (Playwright) with an emulated touch phone at **390 × 844**. A second run at **360 × 640** covered layout, keyboard and save-failure checks. Animations were off (`prefers-reduced-motion: reduce`). The device clock read Monday 23 Nov 2026. Screenshots from the run are in [`docs/screenshots/`](docs/screenshots). The script is [`tests/e2e/flows.cjs`](tests/e2e/flows.cjs).

## 1. Setup, edit a plan, substitute an exercise, Today shows the revision — pass

- Setup refuses an empty name. *Create my plan* saves preferences and builds a 4-day template (Mon Upper A, Tue Lower A, Thu Upper B, Sat Lower B; rest Wed, Fri, Sun), then opens Today.
- Moving Thursday's workout to Friday for **this date only** changes this week only. Next week is unchanged.
- In Edit workout, *Swap exercise* opened the library in Replace mode and swapped Lateral raise for Hammer curl in the same position. Seated row moved up with the keyboard (arrow keys on the drag handle).
- Leaving with unsaved changes offered *Keep editing* or *Discard edits*. Save returned to the originating preview. Today's *Preview exercises* showed the revised routine.

## 2. Two dumbbell sets, reload mid-rest, finisher, double Save — pass

- The Incline dumbbell press column read **kg / hand**. Logged 20 × 10 and 22 × 8. Typed 7 reps into set 3 without logging, then **reloaded during the rest timer**.
- After the reload: same exercise, both rows checked with their values, the unlogged "7" still in set 3, and the rest timer still counting from its stored timestamp (01:29 before, 01:28 after).
- Editing a checked row, adjusting rest, skipping rest, and opening the exercise guide then coming back (same exercise, same unfinished set) all worked.
- Last exercise offered *Start 5-min abs finisher* and *Review session*. In the finisher: the labelled 5 s transition showed; Pause froze the countdown; Resume continued; Skip advanced exactly one interval; skipping the final interval opened the summary with the finisher marked completed.
- The summary counted only exercises with completed sets (1 exercise, 2 sets) and showed the best set (22 kg/hand × 8).
- **Save was clicked twice in the same tick.** Result: one History row, one completed record in IndexedDB, no draft left. Today showed 1 of 4 sessions with the card marked Completed. Progress plotted a single point at 22 kg / hand × 8.

## 3. Saved session stays as performed after a template edit — pass

- The saved session's set-by-set breakdown matched what was logged, including the note.
- Upper body A was then renamed to "Upper body A v2", the incline press removed, and Push-up added from the library.
- The historical session still showed "Upper body A" with its incline press sets. Today showed the new version.

## 4. Measurements, edit, unit switch, export agreement — pass

- Non-numeric input was rejected. Logged weight 93.4 kg (today) and waist 81.5 cm (yesterday, picked from the date sheet).
- Logging weight again for the same date showed the existing entry and offered *Update existing entry*. Tapping the entry then opened it for editing, and it was changed to 92.6 kg.
- After switching to lb and in: the screen, the chart's accessible label and `measurements.csv` all read **204.1 lb** and **32.1 in**. The CSV also kept the stored values (92.6 kg, 81.5 cm). `sets.csv` showed 44.1 lb displayed and 20 kg stored. History showed 48.5 lb/hand × 8. Stored records were not rewritten.

## 5. First use, empty, rest-day, offline and small-phone keyboard states — pass

- First use opens setup. Progress, History and Measurements each show an empty state that leads back to logging.
- On a rest day, Today shows the next workout, *Show next workout* and *Browse plan*.
- **Offline:** with the network disabled after the first load, the reload was served by the service worker with data intact, the offline banner showed, and the exercise photos loaded from cache.
- Returning to a tab restored its exercise selection and scroll position.
- **Keyboard:** at 360 px wide, the viewport was shrunk to 360 px tall (about the space left above a phone keyboard) with the reps input focused. The input and the *Log set* button were both on screen and not overlapping.
- **Save failure:** with IndexedDB writes made to fail, Save showed an error with **Retry** and kept the draft, which survived a reload. Retry then committed the session exactly once.
- At 360 px there was no horizontal scrolling on any main screen, including at 130% text size. Every visible control was at least 44 × 44 px and had an accessible name. No page errors were logged.

## Not verified on a physical device

These need a real phone. The emulator cannot confirm them:

- **On-screen keyboard on iOS Safari.** It was simulated by shrinking the viewport. The app also lifts the footer using `visualViewport`, but this has not been seen on an iPhone.
- **Haptics.** These use the Vibration API, which iPhone Safari does not support. Settings says so there and turns the switch off. Android vibration was not felt.
- **Timer sound** with the ring/silent switch, and audio unlocking after a phone lock.
- **A real phone lock or app switch.** Timers derive from timestamps, and reload reconciliation is tested. No beep fires while the screen is locked, because web apps cannot run timers in the background.
- **Add to Home Screen** and standalone launch on iOS and Android, and how long Safari keeps storage for a site that was not added to the Home Screen.
- **Physical-device performance and screen readers.** Accessible names and focus traps were checked programmatically, not with VoiceOver or TalkBack.
