# Everwick architecture

Everwick is a concept habit and fitness tracker (fictional brand) built with React Native, Expo SDK 58 and TypeScript
(strict). It runs on iOS, Android and the web from one codebase. There is no backend: everything is stored on the
device.

## Stack

| Concern | Choice |
|---|---|
| App framework | Expo SDK 58, React Native 0.88, React 19.3, new architecture |
| Navigation | Expo Router 58 (file-based, typed routes): a stack with a tab group, modals for add/edit/Pro |
| Language | TypeScript strict, path alias `@/` for `src/` |
| State | One React context + a pure reducer (`src/data/store.tsx`, `src/data/reducer.ts`) |
| Storage | AsyncStorage (localStorage on web), one versioned JSON document |
| Validation | zod 4 schemas at every trust boundary (storage reads, file imports) |
| Animation | Reanimated 4 (worklets on the UI thread), layout animations, react-native-svg for drawing |
| Gestures | react-native-gesture-handler 3 (hook API: `usePanGesture`, `useCompetingGestures`) |
| Charts | Custom SVG (react-native-svg): ring, bars, heatmap |
| Notifications | expo-notifications local schedules (native); a web build that explains reminders ring on the phone |
| Haptics | expo-haptics behind `src/lib/haptics.ts` (no-op on web, respects the in-app setting) |
| Fonts | Bricolage Grotesque + Plus Jakarta Sans via `@expo-google-fonts` (bundled, OFL) |
| Tests | vitest (unit), Playwright (web end-to-end and QA sweep), axe-core |

## Folder structure

```
src/
  app/                 Expo Router routes (each file is a screen)
    (tabs)/            Today (index), Progress, Profile + the tab layout
    habit/             new (modal), [id]/index (detail), [id]/edit (modal)
    onboarding.tsx, pro.tsx, notifications.tsx, +not-found.tsx, _layout.tsx
  components/
    ui/                Design-system components (Text, Button, Card, Sheet, Toast, Confetti, ...)
    today/             Today screen pieces (HabitRow, SortableHabitList, WeekStrip, DayCard, ...)
    progress/ habit/ onboarding/ profile/   Feature components per screen
    illustrations/     <Illustration>, SVG fallbacks, soft-3D SVG helpers
    brand/ navigation/ system/              Logo, TabBar, WebFrame, DeviceChrome, Portal, ModalLayer
  content/             Illustration slot manifest and generated asset map
  data/                Types, seed, stats, insights, achievements, chart series, form and onboarding rules,
                       reducer, store, persistence, migrations, schemas, reminder plan
  lib/                 clock, haptics, reminders, share, importFile, heroTransition, openHabit, measure,
                       gestures, launchFlags
  theme/               Tokens, colors (light and dark), shadows, contrast helpers, ThemeProvider
tests/                 vitest unit tests; tests/e2e for Playwright
scripts/               qa.ts, capture.ts, serve.ts, generate-icons.ts, sync-illustrations.ts
assets/                images (icons, splash), brand (SVG sources), illustrations (soft 3D PNGs, no longer shown)
```

## State

`StoreProvider` (in `src/data/store.tsx`) owns one `AppState` and exposes `useStore()`, plus selectors such as
`useHabits()` (active habits), `usePausedHabits()`, `useHabit(id)` and `useToday()`.

- Every change is an `Action` handled by the pure `reducer` (`src/data/reducer.ts`), unit-tested without React.
- `actions` is a stable object (`toggle`, `increment`, `setValue`, `skip`, `reorder`, `addHabit`, `updateHabit`,
  `deleteHabit`, `resetDemoData`, `previewImport`/`importData`, `snapshot`/`restore`, ...).
- **Undo** is snapshot based everywhere: a screen keeps `actions.snapshot()` and its Undo puts back exactly what
  changed. Check-ins and skips (Today and detail) use `restoreDay()` (`components/habit/detailModel.ts`), which
  restores that habit's value, skip and original check-in time for that day and leaves later changes alone; delete,
  reset and import restore the whole snapshot.
- Every check-in action lives in one hook, `useCheckIns()` (`components/habit/useDayActions.ts`): check in, +1/-1,
  clear, skip and unskip for any habit on any day, each with its haptic, a one-line toast and an exact Undo; the
  last open habit of today shows one "Perfect day" toast instead. Today's rows (tap, swipe, keyboard), habit detail
  and the day sheets all call it (`useDayActions(habit)` binds it to one habit), so their copy and rules can't drift.
  The tap/swipe rules, every toast's copy, the day card's "what's left" sentence and the reorder merge are pure
  functions in `components/today/todayModel.ts` (tested).
- One toast at a time: a new toast replaces the one on screen, so quick actions in a row never stack bars over the
  list (each earlier action can still be undone from its row or day sheet).
- Check-in times are recorded only for check-ins on the same day. A late check-in for a past day stores no time
  (`at: null` in the reducer), so it can't skew the time-of-day insights or unlock Early riser.
- `status` is `loading | ready | error`; every screen renders a skeleton, its content, or an error with Retry.
  The storage error (`StorageErrorState`) also offers "Start fresh with demo data", behind a confirm dialog.
- `saveError` is set when a write to storage fails (full or blocked storage). The root layout shows a toast once,
  with Retry (`actions.retrySave`), instead of letting changes go unsaved silently.
- Paused habits (`archived`) are hidden from Today, charts and reminders but never lost: Profile lists them under
  Paused habits with Resume, Today links to them, and the pause toast says where they went.
- The current day (`today`) comes from `src/lib/clock.ts` so tests and showcase captures can freeze time; it rolls
  over at midnight.

## Data layer

All logic is pure TypeScript with no React Native imports, so it runs in vitest:

- `types.ts`: `Habit`, `AppState`, `History` (`logs`, `skips`, `times`), settings.
- `dates.ts`: local calendar-day keys (`YYYY-MM-DD`), computed at local noon so DST never skips a day.
- `seed.ts` + `prng.ts`: 60 days of deterministic demo history (mulberry32 PRNG seeded per habit) relative to today,
  telling a story: a 47-day water streak saved by a freeze, a broken meditation streak, weaker weekends, an improving
  evening habit, a Mon/Wed/Fri workout. Untouched demo data is regenerated each new day so the app always looks current.
  Today follows the clock: a check-in whose usual time hasn't come yet is left open, and Water's glasses fill up
  through the day (past days never change, so tests stay deterministic).
- `stats.ts`: schedules, skips, streaks with **streak freezes**, completion rates, chart series, heatmap buckets, a
  habit's check-in count (`habitCheckins`, summed for Profile) and its usual check-in time (`usualCheckinTime`: the
  median over 60 days rounded to 5 minutes, shown on habit detail and in the Progress rhythm card alike).
  One rule for every completion number: `periodStats` (future days ignored; habits still open today left out) and
  `rollingCompletion` ("the last 30 days" and the 30 before). Progress > Month, the trend insight and Profile all read
  `rollingCompletion`, and points are taken from the rounded percentages people see, so the same figure appears
  everywhere (a test pins this on the seed). `topLiveStreak` is the one "longest streak" for Today, Progress and Profile.
  Streak rules: unscheduled and skipped days are neutral; every 7 check-ins in a row earn a freeze (max 2); a missed
  due day spends a freeze while a streak is live; today stays open until it is done.
- `streakCopy.ts`: how streaks are worded, in one place. A streak counts check-ins in a row on the habit's own
  schedule, so a daily habit says "48 days" and "See you tomorrow", while a Mon/Wed/Fri workout says "7 check-ins in a
  row", "make it 7 in a row" and "See you Monday" (its next due day). Habit detail, Today's rows and day card,
  Progress streaks, Profile, toasts and spoken labels all use it.
- `insights.ts` (Progress): the most consistent weekday, cross-habit pairings ("On days you meditate, you read 34%
  more often", or "you check off “No phone after 10pm”" when a name isn't an action; at least 8 days on each side and
  a relative lift of 15% or more), streak-risk
  weekdays (missed at least half the time over 8 weeks), the month-over-month trend and the usual time of day.
  Insight cards unlock after a week of check-ins.
- `progressSeries.ts` (Progress): Week and Month windows, chart bars with stable date slots (so bars morph between
  ranges), period stats, chart summaries for screen readers, a day's detail for the heatmap sheet, the streak board.
- `achievements.ts` (Profile): 7- and 30-day streaks, 100 check-ins, perfect week (7 perfect days in a row; days with
  nothing due are neutral) and early riser (5 check-ins before 7:00 AM). Streak medals follow exactly the same rules
  as `streakInfo` (a property test compares them on 60 random histories), and each medal knows when it was unlocked
  and with which habit. Medals evaluate archived habits too, so pausing a habit never takes a medal away.
- `habitForm.ts` (Add/Edit): the form's zod schema with plain-language messages, defaults (sprout, ember, every day,
  once a day, 9:00 AM reminder), frequency presets and duplicate-name checks.
- `limits.ts`: every length and range limit (name 40, detail 60, unit 20, goal 1 to 99, notes 2,000). The form and
  the storage/import schemas both read it, so anything that imports cleanly can be edited and saved unchanged
  (`tests/limits.test.ts` imports a goal of 50, renames the habit and checks the goal survives).
- `onboardingPlan.ts`: which starter habits the picked goals add (never a duplicate, idempotent). Onboarding offers
  six goals, each with its own icon tile; older goal keys stay valid for stored data.
- `reminderPlan.ts`: the weekly reminder pattern (`planReminders`, shown in the Reminders timeline) and what the phone
  actually schedules (`phoneSchedule`: repeating daily and weekly triggers, see Reminders).

Screen-level models that are pure but specific to one screen sit next to it: `components/habit/detailModel.ts`
(calendar states, month grid, the Today card's and streak tiles' wording, Undo restores),
`components/reminders/reminderSummary.ts` (the day timelines) and `components/profile/profileModel.ts` (the stats
card). All unit tests live in `tests/`.

## Persistence, schema versions and migrations

- One JSON document under `everwick/state` in AsyncStorage, written 200 ms after the last change.
- Each document carries `version` (currently **2**). On read: `JSON.parse`, then `migrate()` (`migrations.ts`) runs
  `MIGRATIONS[v]` step by step up to `SCHEMA_VERSION`, then `AppStateSchema` (zod) validates the result.
  Corrupt or newer data raises `StorageFormatError`, which the UI shows as the storage error state with Retry and
  "Start fresh with demo data".
- v1 to v2 added `skips`, `times` and `seenAchievements`. Adding v3 means: bump `SCHEMA_VERSION`, add `MIGRATIONS[2]`,
  add a fixture test. Published migrations are never edited.
- **Export** writes a versioned file (`app: "Everwick"`, `schema`, data, and a note that it never left the device).
  **Import** parses, migrates and validates with `ExportFileSchema`, explains problems in plain language
  ("Drink water (habit 1): the daily goal must be a whole number from 1 to 99.", "The check-in times for Meditate
  10 minutes have a day that isn't valid (2026-13-45)."): habits are named, never shown by their internal id. It
  never shows zod's own wording, rejects impossible dates and unknown version numbers, shows a
  summary, and replaces data only after confirmation (with Undo). Migrations keep anything a file already carries.
  On iOS and Android the export is written to the cache as `everwick-export-<date>.json` and offered in the share
  sheet (expo-file-system + expo-sharing); the web downloads the same file.
  Files are picked by `src/lib/importFile.ts` (expo-document-picker, then expo-file-system's `File.text()`) on
  iOS and Android, and by `importFile.web.ts` (a hidden file input) on the web.

## Reminders

`src/lib/reminders.ts` (iOS/Android) asks for permission only from an explicit button, configures an Android channel,
and `syncReminders()` replaces all scheduled notifications with the plan from `phoneSchedule`: each habit on its days,
morning and evening nudges and the Sunday review, as **repeating** daily and weekly triggers, under the iOS limit of 64.
Repeating triggers mean reminders never run out, even for someone who stops opening the app for weeks (the person
reminders exist for). They can't skip a single day, so a reminder that should stay quiet later today (its habit is
already done or skipped, or it's the evening check-in on a perfect day) is scheduled around today: a daily reminder
becomes weekly ones for the other six weekdays plus a one-off for the same weekday next week, and a weekly one becomes
a one-off for next week. The store re-plans after every check-in, on launch and at midnight, which turns those
stand-ins back into plain repeating triggers. The trade-off: if the app is never opened again after a day like that,
that one weekday slot rings once more (next week) and then not until the next launch.
Tapping a habit's reminder opens that habit, also on a cold start (`useReminderTaps` in the root layout).
`src/lib/reminders.web.ts` is picked by Metro on web: the same API, no expo-notifications import, and the UI explains
that reminders ring on the phone. Inside the showcase phone frame (`?device=1`) it stands in for the phone app instead:
it answers like a phone where notifications are allowed and counts what the phone would schedule, so captures show
the copy people see on their phone. Nothing is scheduled and nothing rings.

## Animation and gestures

- Reanimated shared values and worklets keep animation on the UI thread; JavaScript only commits results
  (`scheduleOnRN`). Springs come from `motion.spring` in `src/theme/tokens.ts`.
- **Today list** (`SortableHabitList`): each row has a horizontal pan (swipe right = check in, left = skip; rubber
  band, haptic tick when armed) competing with a long-press pan (hold 300 ms, drag to reorder). Rows have a fixed,
  font-scaled height so slots are multiples of the row step; neighbors spring between slots and the order is committed
  once on drop. On touch screens on the web the rows keep vertical scrolling (touch-action pan-y, set in each composed
  gesture's config through `lib/gestures.ts`); once a row is lifted the list blocks page scrolling until it drops.
  Every gesture has a non-gesture twin: VoiceOver and TalkBack get Check in, Skip, Move up and Move down as actions
  on the row's button; keyboards get **S** (skip) and **Alt+Up/Down** (move) on a focused row; and the Reorder mode
  in the section header shows Move up / Move down buttons on every row.
- **Check-in**: color fill, bounce, spark burst and ripple; the streak number pops. Finishing the day scrolls the
  celebration card into view first, then the flame springs up, a ring of light pulses from the card and about 80
  pieces of confetti (paper, streamers, dots, small flames) burst from the card's center with drag, gravity and
  flutter, with a success haptic and one "Perfect day" toast that replaces the check-in toast. The confetti layer is
  clipped to the app column (`overflow: clip` on web), so pieces flying past the edge never widen a phone's page.
- **List to detail**: the row measures its icon tile before navigating (`lib/openHabit.ts` with `lib/measure.ts` and
  `lib/heroTransition.ts`); the detail screen springs its hero icon from that rect, which works on native and web
  without platform-specific shared elements. While the tile flies, the title and cards wait (`useEnter(afterFlight)`,
  about 300 ms), so the tile only ever crosses the empty, tinted hero; as it lands it cross-fades into the larger icon
  tile, which springs up from 0.8 in place.
- **Charts**: one ember ramp (amber for a light day to ember for a strong one; a perfect day is full ember with a
  bright cap, never a different hue). Bars grow from the baseline with a stagger and morph between Week and Month
  (shared days slide and resize, the rest fade). Today, while habits are still open, is drawn as progress so far
  inside a dashed outline of the whole day, like the days still to come, so it never reads as a bad day under the
  average line ("Today so far" in the legend and the spoken summary). A pan plus a tap gesture scrub a highlight and tooltip with a selection haptic; the plot is
  also a focusable slider (arrow keys on web, increment/decrement for screen readers). Heatmap cells open a day sheet.
  The chart motion is time-based (eased) rather than physics springs, so frozen-clock captures always settle.
- **Achievements**: medals unlocked since the last visit pop in one by one on Profile (spring scale, shine sweep,
  confetti, celebrate haptic), then are marked seen.
- Reduced motion (`useReducedMotion`) turns every decorative animation off.

## Web presentation

`WebFrame` renders the app as a 430 px phone column on a branded backdrop on wide screens and edge to edge on phones.
On phones the root uses `overflow: clip` and the tab navigator cross-fades instead of sliding on the web, so nothing
can scroll the page sideways (a translated inactive tab scene could otherwise be scrolled into view by a
scroll-into-view). `scripts/qa.ts` checks this with plain clicks during the all-done confetti.
The web build ships every route in one bundle (`asyncRoutes: { web: false }` in app.json): route chunks are small,
and loading one on first navigation left a blank frame between Today and a habit's detail.
On iOS and Android, sheets and dialogs are real modals (`ModalLayer`: a transparent React Native `Modal`, so Android
Back closes them and screen readers stay inside); on the web they render through `Portal` so they stay inside the
column, with a focus trap, Escape and focus return. Sheets can be dragged down by the handle or header to dismiss.
Launch flags (`?state=`, `?theme=`, `?onboarded=`, `?device=1`) exist for QA and showcase captures
(`src/lib/launchFlags.ts`). They are safe in production: data from `?state=fresh|empty` is never written to storage,
a forced theme or onboarding value is saved as it was before the flag, and only `device` survives a reload.

Captures set `Date` to 2026-10-23 17:40 at page load and let it tick (an init script in `scripts/capture.ts`).
Use that init script for showcase captures too, not `page.clock.setFixedTime`: Playwright's clock also fakes
`requestAnimationFrame` and timers, which leaves springs mid-way (seeded screens then take 3 to 5 s to appear), and a
`Date` that never moves stalls React Navigation's JS-driven transitions. Wait for content (a `[data-testid^=screen-]`
with no `[aria-busy=true]`), never a fixed delay.

## Accessibility

Every control has a role and label; composite rows use a stretched button with the full spoken label over
`aria-hidden` visuals, so the visible text and the accessible name never disagree. 44 pt minimum touch targets
(small buttons reach 48 through hitSlop on iOS and Android). One documented exception: the 13-week heatmap's day
cells are about 23 pt so 91 days fit a phone width; its accessible path is the arrow keys (one tab stop), each
cell's spoken label, and the day sheet's Previous/Next day buttons. Dynamic Type up to 1.4x (rows grow with the
font scale), AA contrast in both themes (enforced by `tests/contrast.test.ts`, including the segmented control's
thumb against its track), reduced motion respected.

Keyboard and screen readers on the web:
- Headings have levels (`Text heading level`): the screen title is h1 (on New habit, Edit habit and Reminders that
  is the header title), sections h2, cards h3. Every screen's `<main>` is named after the screen. Headings and
  sentence-length body copy keep their last words together (`lib/typography.ts`: short words like "in a" travel with
  the tail), so no line ends on a lone word.
- Screens with a floating header (habit detail, New and Edit habit) render it first inside the screen
  (`Screen overlay`), so Back and Close are the first Tab stops and go inert with the screen.
- A screen that isn't focused (a tab you left, a screen under a pushed one) is `inert`, so Tab never lands on hidden
  controls. After navigation focus moves to the new screen's title, and going back returns it to the control you
  left from (`Screen`).
- Radio groups, tab lists and grids (icon and color pickers, week strip, segmented controls, heatmap filters, the
  habit calendar, time presets) are one tab stop with arrow keys (`useRovingFocus`); Space works on switches,
  checkboxes, radios and tabs (once per press: key repeats are ignored), and Enter on in-app links (react-native-web
  maps neither by default).
- Escape closes sheets, dialogs and the modal screens (New habit, Edit habit, Upgrade to Pro), through the same path
  as their Close button, so a changed form still asks "Discard changes?". It listens in the capture phase, so it works
  while typing in a field (react-native-web's TextInput stops key events from bubbling).
- Undo toasts wait while hovered or focused, give focus back when they leave, and have a full 44x44 action.
- Field errors are linked to their inputs (`aria-describedby`).
- `scripts/qa.ts` runs axe on every route and state, then an in-app navigation pass (tabs, detail, Edit habit, New
  habit and back) that fails if focus stays on `<body>` after a navigation or a Tab stop lands inside hidden or inert
  content.

## Testing

| Command | What it covers |
|---|---|
| `npm run typecheck` | `tsc --noEmit`, strict, with `noUnusedLocals` |
| `npm test` | vitest (all in `tests/`): dates, seed determinism and story, streaks with schedules, skips and freezes, streak wording per schedule, rates, heatmap, chart series, insights, achievements, habit form validation, shared limits, onboarding plan, migrations, import validation, reducer, reminder plan and phone schedule, screen models, typography, contrast (including check-button rims and switches) |
| `npm run e2e` | Playwright on the web build: onboarding, then check in a habit, then Progress, then dark mode; Profile's data tools (export, start from scratch + Undo, import of a broken and a real file, reset demo data, a medal's sheet); pausing a habit and finding it again; keyboard reorder and skip; swipe to check in; scrubbing the chart; New habit (inline errors, duplicate names, Esc asks before discarding, save with Undo) and Edit with Undo; habit detail (a Mon/Wed/Fri streak's wording, calendar back-fill, delete with Undo) |
| `npm run qa` | every route and state variant at 390/768/1280/1440 in light and dark: overflow, console errors, failed requests, and axe at every scroll position; then in-app navigation (tabs, detail, Edit and New habit, back) with focus checks, axe and a Tab walk; then the all-done confetti at 390 with full motion (the page must never get wider) |
| `npm run export:native` | bundles the iOS and Android JavaScript, a check that the app bundles for both platforms |
| `npm run doctor` | expo-doctor dependency and config checks |

Linting: there is no ESLint config yet. Strict TypeScript with `noUnusedLocals` covers the basics; the next step is
`npx expo lint` (eslint-config-expo, which brings react-hooks/exhaustive-deps) plus Prettier, with `lint` and
`format:check` scripts called from `scripts/qa.ts`.

## Building for the stores

Nothing here is tied to an account; these are the steps a client would follow with their own Apple and Google
developer accounts.

1. Set real identifiers in `app.json` (`ios.bundleIdentifier`, `android.package`; the demo uses
   `com.example.everwick`), the version, and the store description.
2. Icons and splash are generated from the logo: edit `scripts/generate-icons.ts` (SVG sources land in
   `assets/brand/`) and run `npm run icons`.
3. `eas.json` defines three profiles: **development** (an internal simulator build: iOS simulator app and an Android
   APK of the regular app; add `expo-dev-client` and `"developmentClient": true` to turn it into a dev-client build),
   **preview** (internal distribution for testers) and **production** (store builds, auto-incremented build numbers,
   Android App Bundle). There are no EAS Update channels (expo-updates isn't installed). With an Expo account: `npx eas-cli build --profile production --platform all`, then
   `npx eas-cli submit`. Signing credentials are created by EAS on first build; none are stored in this repo.
4. Local alternative without EAS: `npx expo prebuild` generates the native projects, then build in Xcode and Android
   Studio.

## Illustrations pipeline

Slots are typed in `src/content/illustrations.ts` (usage and art notes per slot). `<Illustration slot size />`
(`src/components/illustrations/Illustration.tsx`) draws every slot as flat vector art in code, at the size it is given.

The PNG pipeline from the first version is still in the repository, but no screen reads it anymore: drop
`<slot>.png` into `assets/illustrations/` and run `npm run illustrations`; it regenerates
`src/content/illustrationSources.ts` with static `require()` calls (Metro only bundles static requires), typed by slot
so a missing or misspelled slot fails the typecheck. The SVG fallbacks in `src/components/illustrations/fallbacks/`
belong to that first version too.
