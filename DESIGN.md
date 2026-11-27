# Everwick design system

Everwick is a concept habit and fitness tracker (fictional brand). The idea behind the brand: every day you keep a
habit is a small point of light, and a streak is the flame you keep lit. The visual language follows that idea
literally: **paper and ink, and one flame**. Everything is neutral until something is done; a done check-in, a kept
day and a streak are the only things that light up.

Everything here is implemented as tokens in `src/theme/` (colors in `colors.ts`, scale and motion in `tokens.ts`,
shadows in `shadows.ts`). Screens never hard-code a color, size or duration.

## 1. Concept and mood

- **Lit or unlit.** The flame color (`#EF5F17` by day, `#FF7A2E` by night) means one thing: done. Check buttons,
  done days in the week strip and calendars, completion bars and rings, the heatmap and streak flames. Nothing else
  is orange, so the screen reads at a glance.
- **Actions are ink.** Primary buttons, the active tab and switches use ink (`#121214` by day, `#F4F4F5` by night),
  never the flame color, so "tap here" and "you did it" never compete.
- **Flat.** Cards sit on a neutral canvas with at most a hairline of shadow. No gradient washes, glows or blurred
  blobs; only layers that float over content (tab bar, sheets, toasts) cast a real shadow.
- **One count, said once.** Each number appears in one place with a word next to it ("3 habits left", "47 days").
  Small labels are plain words in sentence case, never tracked-out capitals.
- **Habits keep their color on the glyph only**: a neutral tile with the icon in the habit's hue. Done states use the
  flame color whatever the habit's color (`theme.lit()`), so a full list stays calm.
- **Dark mode is designed, not inverted:** a near-black canvas, surfaces that step up in lightness instead of
  casting shadows, hairline borders and a brighter flame.

## 2. Color

### Core palette (light / dark)

| Token | Light | Dark | Role |
|---|---|---|---|
| `canvas` | `#F4F4F5` | `#0D0D0F` | App background |
| `surface` | `#FFFFFF` | `#17171A` | Cards, rows |
| `surfaceMuted` | `#EDEDF0` | `#202024` | Inputs, segmented tracks, tips, icon tiles |
| `surfaceRaised` | `#FFFFFF` | `#222226` | Sheets, dialogs |
| `line` / `lineStrong` | `#E4E4E8` / `#D2D2D8` | `#26262B` / `#34343A` | Hairlines, dashed outlines |
| `ink` | `#121214` | `#F4F4F5` | Primary text |
| `inkMuted` | `#4E4E56` | `#B4B4BC` | Secondary text |
| `inkSubtle` | `#66666F` | `#94949E` | Tertiary text (still AA) |
| `accent` / `onAccent` | `#121214` / `#FFFFFF` | `#F4F4F5` / `#121214` | Actions: primary buttons, active states |
| `accentText` / `accentSoft` | `#121214` / `#E8E8EC` | `#F4F4F5` / `#2A2A30` | Links, selected chips, active tab pill |
| `success` / `successText` / `successSoft` | `#EF5F17` / `#B23F06` / `#FDEBDF` | `#FF7A2E` / `#FF9A5C` / `#3A2216` | The flame: everything done |
| `danger` / `dangerText` / `dangerSoft` | `#DC2626` / `#B91C1C` / `#FDE8E8` | `#F87171` / `#FCA5A5` / `#3A1A1A` | Destructive, errors |
| `freeze` / `freezeText` / `freezeSoft` | `#2563EB` / `#1D4ED8` / `#E7EEFD` | `#60A5FA` / `#93C5FD` / `#172238` | Streak freezes (habit detail only) |
| `swipeCheck` / `swipeSkip` | `#B8450A` / `#4E4E56` | `#FF7A2E` / `#3A3A42` | Swipe action backgrounds |
| `track` | `#E7E7EB` | `#26262B` | Ring and bar tracks, unlit days |
| `switchOff` | `#7C7C86` | `#8A8A96` | An off switch's outline and knob (3:1 on every surface) |
| `brand` | `#EF5F17` (flat) | `#FF7A2E` (flat) | Kept for the flame mark; no gradients |

### Data colors

- **Completion chart:** one flame ramp. Bar height is the rate; a light day is a pale flame (the track mixed toward
  the flame), a strong day the full flame color. A perfect day is full height with a bright cap. No green, no red.
- **Heatmap:** the flame at 22/45/72/100% over the card by day; by night the surface mixed toward the flame, so mid
  levels read as warm light. Days before the first habit are dotted outlines.
- **Insight mini charts:** the flame for the highlighted value, a pale tint for the rest.

### Habit colors

Each habit color keeps five tones per theme, but only `ink` (the glyph on its tile) and `solid` (its swatch in the
color picker and its line on the reminder timeline) show the hue. `soft` is the same neutral tile for every habit
(`#EFEFF2` / `#222226`) and `rim`, the outline of an unchecked check button, is a neutral gray (`#7C7C86` /
`#72727C`) that reads 3:1 on every surface.

### Contrast-checked pairs

All text pairs meet WCAG AA (4.5:1); icons on solid fills and control outlines meet 3:1. These are enforced by
`tests/contrast.test.ts`, so a palette change that breaks AA fails the test suite.

| Pair | Light | Dark |
|---|---|---|
| ink on canvas | 17.0:1 | 17.7:1 |
| inkMuted on surface | 8.2:1 | 8.7:1 |
| inkSubtle on surfaceMuted | 4.9:1 | 5.4:1 |
| onAccent on accent (buttons) | 18.7:1 | 17.0:1 |
| successText on surface | 5.8:1 | 8.5:1 |
| successText on successSoft | 5.0:1 | 7.1:1 |
| dangerText on dangerSoft | 5.5:1 | 8.2:1 |
| freezeText on freezeSoft | 5.8:1 | 8.8:1 |
| swipe label on swipeCheck | 5.4:1 | 7.4:1 |
| check on the lit fill | 3.3:1 | 7.4:1 |
| habit ink on its tile (lowest) | 4.9:1 | 7.6:1 |
| check-button rim on card (lowest) | 4.1:1 | 3.8:1 |
| off switch on surface | 4.1:1 | 5.2:1 |

## 3. Typography

- **Display: Bricolage Grotesque** (700, 800). Characterful, slightly condensed grotesque for greetings, screen titles
  and big numbers. Used sparingly.
- **UI and body: Plus Jakarta Sans** (400 to 800). Friendly geometric sans with open counters, great at small sizes.
- Both are self-hosted via `@expo-google-fonts` (OFL) and loaded with `expo-font`; nothing is fetched at runtime.
- Numbers that change (streaks, percentages, counts) use tabular figures (`<Text tabular>`).
- Dynamic Type: `<Text>` scales with the system font size up to 1.4x; layouts that depend on height (habit rows) grow
  with the font scale (`useRowHeight`).

| Variant | Font | Size / line height | Use |
|---|---|---|---|
| `hero` | Bricolage 800 | 34 / 38, -1 tracking | Onboarding headlines |
| `display` | Bricolage 800 | 28 / 32 | Greeting, screen titles, empty states |
| `numeral` | Bricolage 800 | 40 / 44 | Big stats |
| `numeralSm` | Bricolage 800 | 24 / 28 | Ring centers, stat tiles |
| `title` | Jakarta 700 | 20 / 26 | Section and card titles |
| `headline` | Jakarta 700 | 16 / 21 | Row titles |
| `body` / `bodyStrong` | Jakarta 500 / 600 | 15 / 22 | Body copy |
| `callout` | Jakarta 500 | 14 / 20 | Supporting copy |
| `caption` | Jakarta 600 | 13 / 18 | Meta, chips |
| `overline` | Jakarta 700 | 13 / 18, sentence case | Small labels ("Schedule", "This week", dates) |
| `button` | Jakarta 700 | 16 / 20 | Buttons |
| `tab` | Jakarta 700 | 11 / 14 | Tab labels |

## 4. Space, radius, grid

- **4-point spacing scale** (`space`): 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64.
- **Layout:** 20 pt page gutter, 16 pt card padding, 12 pt between list rows, 28 pt between sections, tab bar 64 pt
  floating 12 pt above the home indicator. A canvas-colored fade starts 40 pt above the bar, so content dissolves
  before it reaches the pill; screens end their last card 124 pt from the bottom, above the fade.
- **Radius:** 8 (xs), 12 (sm), 16 (md, icon tiles), 20 (lg), 22 (card), 26 (xl, hero cards), 30 (sheets), pill.
- **Grid:** single column phone layout, 350 pt content width at 390. Stats use 2-up tiles; the week strip is 7 equal
  columns; charts span the full content width.
- **Touch targets:** at least 44x44 pt for every control (icon buttons and small buttons use hit slop when drawn
  smaller). The heatmap's day cells are the one exception (dense grid); the keyboard, screen reader and the day
  sheet's Previous/Next buttons cover them.
- **Web:** on screens wider than 600 px the app is a centered 430 px phone column with a 36 px radius on a soft branded
  backdrop (`WebFrame`); below 600 px it runs edge to edge.

## 5. Elevation

Near-flat. In light mode cards carry only a hairline of neutral shadow (`0 1px 2px rgba(0,0,0,0.04)`); raised
elements a little more; only floating layers (tab bar, sheets, toasts) cast a real shadow. Done habit rows go flat
onto the canvas with a hairline border, so the open ones stand out. Dark mode drops shadows for cards and uses a
surface step plus a 1 px `line` border; only floating layers keep a deep black shadow.

## 6. Components

All in `src/components/ui` unless noted. Every one has an accessible role and label, a pressed state and a visible
keyboard focus ring on web.

- **Text** (variants above), **Button** (primary in ink with an inverse label, secondary, ghost, tertiary (quiet muted text),
  danger, inverse; sm/md/lg pill),
  **IconButton** (44 pt, surface/muted/ghost/accent/glass), **PressableScale** (spring press-in for anything tappable).
- **Card** (22 pt radius; surface, muted, tinted), **ListRow + ListGroup** (settings rows with icon tiles, values,
  switches, chevrons), **SectionHeader** (title, meta, text action).
- **Chip** (toggle chips are checkboxes, radio chips one choice of a group, action chips buttons), **Badge**,
  **SegmentedControl** (segments size to their labels, so none ever wraps; the raised thumb springs to the measured
  segment; the bold selected label reserves its width so nothing reflows),
  **Switch** (role switch; off is an outlined track with a small knob in `switchOff`, 3:1 on any card; on fills with
  the accent (ink) and the knob grows white), **TextField** (label, helper, counter, inline error), **TimeField + TimePickerSheet**
  (time row that opens a sheet with hour and minute steppers, AM/PM and presets).
- **CheckButton** (`components/today`): the tap-to-complete control. Unchecked it is an empty disc with a neutral
  rim (at least 3:1 against the card, the canvas and its own fill) and a faint check, so it reads "tap to check";
  checked it lights up in the flame color and draws the check. On habit detail it is the
  64 pt primary action with a "Check in" caption, and Skip today is a tertiary text button.
- **ProgressRing** (flame stroke, eased fill), **ProgressBar** (segmented for "5 of 8 glasses"),
  **Flame** (the mark, flickering), **StreakBadge** (flame + count, with the unit in words on rows), **HabitIcon**
  (the habit's glyph on a neutral tile), **Avatar** (an initial monogram on an ink disc).
- **Sheet** (bottom sheet dialog; drag the handle or header down to dismiss), **Dialog** (centered alert dialog),
  **Toast** (one at a time, a new one replaces it; one line with an Undo action; waits while hovered or focused), **Confetti** (physics burst from an anchor),
  **Skeleton / SkeletonRow / SkeletonGroup**, **EmptyState**, **ErrorState**, **StorageErrorState** (Retry, and a
  confirmed "Start fresh"). Empty, error and not-found art is the flame mark on a plain disc.
- **Illustration** (`src/components/illustrations/Illustration.tsx`): flat vector art for a slot, built from the
  app's own parts (the flame, the day grid, the icon set).
- Navigation: **TabBar** (floating, frosted, a soft pill sliding behind the active tab), **ScreenHeader** (back/close, title, actions),
  **Screen** (page shell with a flat canvas, safe areas, pull to refresh, tab bar clearance).

## 7. Motion

Motion explains what happened; it never delays the user. Implemented with Reanimated on the UI thread.

| Moment | Spec |
|---|---|
| Press | spring to 0.97 (`press`: damping 18, stiffness 420) |
| Check-in | fill 220 ms ease-out, bounce (`bouncy`: damping 11, stiffness 260), 8-spark burst, ripple ring |
| Streak grows | number pops to 1.35x then springs back |
| Flame | continuous two-layer flicker (sway + breathing inner flame), out of phase |
| Lists | staggered entrance, 45 ms per row, FadeInDown spring |
| Swipe | rubber band past 92 pt, haptic tick when the action arms, spring back |
| Drag to reorder | hold 300 ms, lift (scale 1.035, -0.6 deg, deep shadow), neighbors spring slot to slot |
| All done | scroll the card into view, then: the flame springs up with a wobble, a ring of light pulses out from the card, ~80 pieces of confetti in flame tones, ink and paper (streamers, dots, small flames) burst from the card with drag, gravity and flutter (2.1 s), success haptic, one "Perfect day" toast |
| Charts | bars and ring animate between Week and Month; scrub tooltip follows the finger; today's open bar sits in a dashed outline of the whole day ("Today so far") |
| List to detail | the row's icon tile flies to the hero and grows into the larger tile there (title and cards wait about 300 ms) |
| Sheets / dialogs | 420 ms ease-out up, 240 ms ease-in down; dialog springs from 0.92; a dragged sheet follows the finger, closes past a third or on a flick, springs back otherwise |

`useReducedMotion()` is respected everywhere: no confetti, no flicker, no stagger, instant state changes.

Haptics (native only, `src/lib/haptics.ts`): `selection` for ticks and toggles, `complete` for a check-in or a drop,
`celebrate` (success notification) for all done, `warning` for skip, `light` for buttons.

## 8. Illustration and iconography

- **No drawn characters, no 3D renders.** Every picture is flat vector art made from the app's own parts:
  - **The flame mark** on a plain disc: empty states (unlit, gray), the all-done card and Pro (lit).
  - **A week of days** under the flame on the welcome screen: five lit, today ringed, one still to come. The whole
    idea of the app in one line.
  - **The day grid** (rounded squares, some lit) for the goals step.
  - **Icons on neutral tiles** for habits, the reminders step and the habit detail header (the same tile the row's
    icon flies into).
  - **Medals**: a stamped flame-colored ring around the flame (or a sun for Early riser); the milestone is printed
    under it.
- **The mark:** a candle flame with a flickering, hooked tip and a warm inner flame, standing on a short wick
  (`src/components/brand/geometry.ts`): ever + wick. It is the logo, the splash and the streak flame.
- **Avatar:** the person's initial on an ink disc. No photos or drawn faces anywhere.
- **Tagline:** "Small habits. Steady flame." (`src/content/brand.ts`, the only place it is written).
- **Icons:** lucide, 1.75 to 2.6 stroke, rounded caps. Habit icons sit on 48 pt tiles with 16 pt radius.
- The original 3D PNGs from the first version stay in `assets/illustrations/` for reference but are not shown.

## 9. Voice and tone

Warm, short and encouraging; never guilt. We celebrate consistency, not perfection. Second person, sentence case,
plain words, numbers as digits. One name per concept: **habit**, **check-in** (verb: check in), **streak**, **freeze**,
**skip**, **reminder**.

| Situation | Line |
|---|---|
| Greeting | "Good evening, Maya" |
| Day card | "4 habits to go. Drink water and 3 more are still open." (names listed when they fit, never cut off) |
| All done | "All done today. 6 of 6 habits. 12 perfect days in the last 60." |
| Check-in toast | "Read 20 minutes · 13-day streak", for a Mon/Wed/Fri habit "Strength workout · 7 in a row" (with Undo); the last one of the day: "Perfect day. All 6 habits done" |
| Skip toast | "Walk 8k steps skipped · streak safe" (with Undo) |
| Streaks | Daily habits count days ("48 days in a row. See you tomorrow."); other schedules count check-ins ("7 check-ins in a row. See you Monday.", "Check in to make it 7 in a row."). One helper words them everywhere (`data/streakCopy.ts`). |
| Freeze explainer | "Every 7 check-ins in a row earn a freeze (up to 2). A freeze covers one missed day, so a busy day doesn't cost your streak." (for a weekly schedule: "one missed check-in ... a busy week") |
| Empty state | "Light your first habit. Pick one small thing you can do every day. Two minutes counts." |
| Error | "Couldn't open your habits. Your history is stored on this phone and nothing was lost. Give it another try." |
| Rest day | "Nothing is scheduled today. Rest is part of the plan." |
| Gesture tip | "Swipe right to check in, left to skip. Hold to reorder." (the keyboard shortcuts are added only on a desktop browser) |

Avoid: exclamation marks in errors, "Oops", shaming ("You failed"), jargon ("sync", "entries"), and fake urgency.
Headings and sentence-length body copy keep their last words together (no lone word on the last line; "in a row"
moves as one); short copy is written to fit. Missed days are information, not errors: the calendar marks them with a
neutral dot, and red is kept for real errors.

## 10. Honesty

Everwick is a concept app with a fictional brand. Settings shows "Concept app, fictional brand", the web frame says "Concept app with a
fictional brand", the Pro screen is clearly a demo with no purchase, and exports say the data never left the device.
