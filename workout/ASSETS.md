# Assets and licences

## Exercise photos (`public/exercises/*.webp`)

All 28 photos were converted to monochrome, cropped to 4:3, resized to 720 × 540 and saved as WebP. Each exercise has its own file, mapped by the `image` field in `src/domain/exercises.ts`. To swap a photo, replace the file and keep the same name.

| Files | Source | Licence |
| --- | --- | --- |
| `bench-press`, `incline-dumbbell-press`, `seated-cable-row` | Cropped from the project's own design reference, `Workout_App_UI.pdf`, supplied by the project owner | Owner-supplied. Confirm you hold the rights before any public release. |
| The other 25 | [free-exercise-db](https://github.com/yuhonas/free-exercise-db), which restructures [wrkout/exercises.json](https://github.com/wrkout/exercises.json) | [The Unlicense](https://unlicense.org/) (public-domain dedication), as declared by the dataset |

**Provenance caveat.** free-exercise-db publishes its images under the Unlicense, but the original photographers are not credited, and the photos look professionally produced. Before commercial distribution or an app-store release, confirm the rights or replace these files with photos you own or license. The app needs no code changes for this.

Mapping from dataset image to app file: `Side_Lateral_Raise/1 → lateral-raise`, `Barbell_Squat/1 → back-squat`, `Romanian_Deadlift/0 → romanian-deadlift`, `Dumbbell_Lunges/1 → dumbbell-lunge`, `Lying_Leg_Curls/1 → lying-leg-curl`, `Standing_Calf_Raises/1 → standing-calf-raise`, `Standing_Military_Press/1 → overhead-press`, `Wide-Grip_Lat_Pulldown/1 → lat-pulldown`, `Pullups/1 → pull-up`, `One-Arm_Dumbbell_Row/1 → one-arm-dumbbell-row`, `Dumbbell_Bicep_Curl/1 → dumbbell-curl`, `Hammer_Curls/1 → hammer-curl`, `Triceps_Pushdown_-_Rope_Attachment/1 → triceps-pushdown`, `Barbell_Deadlift/0 → deadlift`, `Leg_Press/1 → leg-press`, `Split_Squat_with_Dumbbells/1 → split-squat`, `Goblet_Squat/1 → goblet-squat`, `Barbell_Hip_Thrust/1 → hip-thrust`, `Pushups/0 → push-up`, `Plank/1 → plank`, `Dead_Bug/0 → dead-bug`, `Side_Bridge/1 → side-plank`, `Face_Pull/1 → face-pull`, `Hanging_Leg_Raise/1 → hanging-leg-raise`, `Dips_-_Triceps_Version/0 → triceps-dip`.

The side-plank photo shows the starting position, propped on one forearm, rather than the raised hold. Its alt text says so.

## Fonts, icons, app icon

- **Barlow Condensed** (headings and numerals) and **Inter** (labels): SIL Open Font License 1.1, bundled locally through `@fontsource`. No font CDN is used at runtime.
- **Lucide** line icons: ISC licence.
- The app icon (`public/icons/*`) is a simple dumbbell glyph drawn for this project.
