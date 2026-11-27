import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

/**
 * Web end-to-end tests. The selectors (test ids and accessible names) are a
 * contract with the screens; keep them stable.
 *
 * 1. The core journey: onboarding -> check in a habit -> Progress -> dark mode.
 * 2. Profile data tools: export, start from scratch + Undo, import (a broken
 *    file and the real export), reset demo data, an achievement's sheet.
 * 3. A paused habit is never lost: Profile lists it and Resume brings it back.
 * 4. Gestures and their keyboard twins on Today: swipe right to check in,
 *    S to skip, Alt+Arrow and the Reorder mode to move; scrubbing the chart.
 * 5. Add / Edit habit: inline errors, the duplicate-name error, Esc asks
 *    before discarding, Save with Undo; Edit with Undo.
 * 6. Habit detail: the check-in card speaks the habit's own streak unit,
 *    the calendar back-fills a missed day, and Delete offers Undo.
 */
test.use({ colorScheme: "light" });

test.beforeEach(async ({ page }) => {
  // When run against the dev server, Expo's error toast (LogBox) can cover the bottom buttons.
  // It never ships in production builds, and console errors are still asserted in every test.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "#error-toast { display: none !important; }";
      document.head.appendChild(style);
    });
  });
});

/** Collects console errors and page errors (React Navigation's dev-only warnings are ignored; they never ship). */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (text.includes("This is a development-only warning")) return;
    errors.push(text);
  });
  return errors;
}

test("onboarding, check-in, progress and dark mode", async ({ page }) => {
  const errors = watchErrors(page);

  // A fresh device: demo data, onboarding not done yet.
  await page.goto("/?state=fresh");
  await expect(page.getByTestId("screen-onboarding")).toBeVisible();
  for (let step = 0; step < 2; step++) await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-finish").click();

  // Today: check in "Read 20 minutes".
  await expect(page.getByTestId("screen-today")).toBeVisible();
  await page.getByRole("button", { name: "Mark Read 20 minutes as done" }).click();
  await expect(page.getByRole("button", { name: "Read 20 minutes, done. Mark as not done" })).toBeVisible();
  await expect(page.getByText(/Read\s20\sminutes(\s·\s\d+-day\sstreak|\schecked\sin)/)).toBeVisible();

  // Progress.
  await page.getByRole("link", { name: "Progress" }).click();
  await expect(page.getByTestId("screen-progress")).toBeVisible();

  // Profile: dark mode.
  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page.getByTestId("screen-profile")).toBeVisible();
  const dark = page.getByRole("switch", { name: "Dark mode" });
  await expect(dark).not.toBeChecked();
  await dark.click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect(dark).toBeChecked();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("profile: export, start from scratch, import and reset, each with a safety net", async ({ page }) => {
  const errors = watchErrors(page);
  await page.clock.setFixedTime(new Date("2026-10-23T17:40:00"));
  await page.goto("/profile?state=fresh&onboarded=1");
  await expect(page.getByTestId("screen-profile")).toBeVisible();
  await expect(page.getByText("Day 60 with Everwick")).toBeVisible();

  // Achievements from the seed history: four unlocked (earned before today, so no unlock pop), the perfect week still open.
  await expect(page.getByRole("button", { name: /^7-day streak, unlocked/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^30-day streak, unlocked Oct 5/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Perfect week, locked, 2 of 7/ })).toBeVisible();

  // Export downloads a JSON file of everything on the device.
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("everwick-export-2026-10-23.json");
  await expect(page.getByText("Exported everwick-export-2026-10-23.json")).toBeVisible();
  const exported = await download.path();
  const file = JSON.parse(readFileSync(exported, "utf8")) as { app: string; habits: unknown[] };
  expect(file.app).toBe("Everwick");
  expect(file.habits).toHaveLength(6);

  // Start from scratch asks first, empties the profile, and Undo brings everything back.
  await page.getByRole("button", { name: "Start from scratch" }).click();
  const clear = page.getByRole("alertdialog", { name: "Start from scratch?" });
  await expect(clear).toBeVisible();
  await clear.getByRole("button", { name: "Remove everything" }).click();
  await expect(page.getByText("Your first flame is one habit away")).toBeVisible();
  await expect(page.getByRole("button", { name: /^7-day streak, locked, 0 of 7/ })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Day 60 with Everwick")).toBeVisible();

  // Import: a broken file explains itself in a plain sentence...
  let choosing = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import data" }).click();
  await (await choosing).setFiles({ name: "notes.json", mimeType: "application/json", buffer: Buffer.from("{ not json") });
  const failed = page.getByRole("alertdialog", { name: "That file can't be imported" });
  await expect(failed).toContainText("That file isn't valid JSON.");
  await failed.getByRole("button", { name: "Cancel" }).click();
  await expect(failed).toBeHidden();

  // ...and the real export round-trips after a confirmation.
  choosing = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import data" }).click();
  await (await choosing).setFiles(exported);
  const replace = page.getByRole("alertdialog", { name: "Replace your habits?" });
  await expect(replace).toContainText(/6 habits and \d+ check-ins from this file will replace/);
  await replace.getByRole("button", { name: "Replace" }).click();
  await expect(page.getByText("Imported 6 habits")).toBeVisible();
  await expect(page.getByText("Day 60 with Everwick")).toBeVisible();

  // Reset demo data is confirmed in a dialog, then offers Undo.
  await page.getByRole("button", { name: "Reset demo data" }).click();
  const reset = page.getByRole("alertdialog", { name: "Reset demo data?" });
  await expect(reset).toBeVisible();
  await reset.getByRole("button", { name: "Reset demo data" }).click();
  await expect(page.getByText(/Demo data is back/)).toBeVisible();

  // A medal opens its story; Escape closes it.
  await page.getByRole("button", { name: /^30-day streak, unlocked/ }).click();
  const sheet = page.getByRole("dialog", { name: "30-day streak" });
  await expect(sheet).toContainText("First earned with Drink water");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  expect(errors, errors.join("\n")).toEqual([]);
});

/** Sets Date to 2026-10-23 17:40 at load and lets it tick (page.clock would also freeze animation frames). */
function showcaseClock(): string {
  return `(() => {
    const RealDate = Date;
    const fixed = new RealDate("2026-10-23T17:40:00").getTime();
    const start = RealDate.now();
    const current = () => fixed + (RealDate.now() - start);
    class ShiftedDate extends RealDate {
      constructor(...args) { if (args.length === 0) super(current()); else super(...args); }
      static now() { return current(); }
    }
    globalThis.Date = ShiftedDate;
  })()`;
}

/** Names of the habit rows on Today, top to bottom. */
async function rowOrder(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid="screen-today"] [role="button"][aria-label]'))
      .map((b) => b.getAttribute("aria-label") ?? "")
      .filter((l) => /^(Meditate 10 minutes|Drink water|Walk 8k steps|Strength workout|Read 20 minutes|No phone after 10pm)\. /.test(l))
      .map((l) => l.split(".")[0]),
  );
}

test("a paused habit is never lost: Profile lists it and Resume brings it back", async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(showcaseClock());
  await page.goto("/habit/walk?state=fresh&onboarded=1");
  await expect(page.getByTestId("screen-habit-detail")).toBeVisible();
  await page.getByRole("button", { name: /^Pause habit/ }).click();
  await expect(page.getByText(/Walk 8k steps paused\. Find it in Profile, under Paused\shabits\./)).toBeVisible();

  // The paused banner links to the list on Profile.
  await page.getByRole("button", { name: "All paused habits" }).click();
  await expect(page.getByTestId("screen-profile")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Paused habits" })).toBeVisible();
  await page.getByRole("button", { name: "Resume Walk 8k steps" }).click();
  await expect(page.getByText("Walk 8k steps is back on Today")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Paused habits" })).toHaveCount(0);

  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Walk 8k steps\./ })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("Today: swipe to check in, S to skip, keyboard and Reorder mode to move; the chart scrubs", async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(showcaseClock());
  await page.addInitScript(() => localStorage.setItem("everwick/tips/today-gestures", "dismissed"));
  await page.goto("/?state=fresh&onboarded=1");
  await expect(page.getByTestId("screen-today")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Strength workout\./ })).toBeVisible();

  // Swipe right on a row checks it in (Friday: Strength workout is due and still open).
  const row = (await page.getByRole("button", { name: /^Strength workout\./ }).boundingBox())!;
  await page.mouse.move(row.x + 40, row.y + row.height / 2);
  await page.mouse.down();
  // A finger-like drag: small steps a frame apart (gesture-handler reads the pointer per frame).
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(row.x + 40 + i * 8, row.y + row.height / 2);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Strength workout, done. Mark as not done" })).toBeVisible();

  // S on a focused row skips it (with Undo).
  await page.getByRole("button", { name: /^No phone after 10pm\./ }).focus();
  await page.keyboard.press("s");
  await expect(page.getByText("No phone after 10pm skipped · streak safe")).toBeVisible();

  // Alt+Up moves the focused row; the Reorder mode moves with buttons.
  const before = await rowOrder(page);
  await page.getByRole("button", { name: /^Drink water\./ }).focus();
  await page.keyboard.press("Alt+ArrowUp");
  await expect.poll(() => rowOrder(page)).not.toEqual(before);
  expect((await rowOrder(page))[0]).toBe("Drink water");
  await page.getByRole("button", { name: "Reorder", exact: true }).click();
  await page.getByRole("button", { name: "Move Drink water down" }).click();
  await expect.poll(async () => (await rowOrder(page))[1]).toBe("Drink water");
  await page.getByRole("button", { name: "Done", exact: true }).click();

  // Progress: drag across the chart reads out the day under the pointer.
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  const slider = page.getByRole("slider");
  await expect(slider).toBeVisible();
  await page.waitForTimeout(1000); // let the bars finish growing in
  const box = (await slider.boundingBox())!;
  // Near the top of the plot: the Undo toasts from the steps above sit over its lower half.
  const y = box.y + 16;
  await page.mouse.move(box.x + 8, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(box.x + 8 + i * 14, y);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await expect(slider).toHaveAttribute("aria-valuetext", /^(Mon|Tue|Wed|Thu), Oct (19|20|21|22): \d of \d habits, \d+%$/);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Add and Edit habit: inline errors, duplicates, discard on Esc, save and edit with Undo", async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(showcaseClock());
  await page.addInitScript(() => localStorage.setItem("everwick/tips/today-gestures", "dismissed"));
  await page.goto("/?state=fresh&onboarded=1");
  await expect(page.getByTestId("screen-today")).toBeVisible();

  // The in-app path: Add a habit -> Create your own. Focus lands on the screen's title.
  await page.getByRole("button", { name: /^Add a habit/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Create your own" }).click();
  await expect(page.getByTestId("screen-habit-new")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "New habit" })).toBeFocused();
  const save = page.getByTestId("habit-save");
  await expect(save).toHaveAttribute("aria-disabled", "true");

  // Inline, plain-language errors.
  const name = page.getByRole("textbox", { name: "Name" });
  await name.focus();
  await page.keyboard.press("Tab");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("screen-habit-new")).toContainText("Give your habit a name");
  await name.fill("  drink   WATER ");
  await expect(page.getByTestId("screen-habit-new")).toContainText("You already have a habit called Drink water");

  // A real name; Esc on a changed form asks first and Keep editing keeps it.
  await name.fill("Floss teeth");
  await page.keyboard.press("Escape");
  const discard = page.getByRole("alertdialog", { name: /Discard changes/ });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Keep editing" }).click();
  await expect(name).toHaveValue("Floss teeth");

  // Every option stays on one line in the frequency control (segments size to their labels).
  const everyDay = page.getByRole("tab", { name: "Daily" });
  const tabHeights = await page.getByRole("tablist", { name: "How often" }).getByRole("tab").evaluateAll((tabs) => tabs.map((t) => Math.round(t.getBoundingClientRect().height)));
  expect(new Set(tabHeights).size, `tab heights ${tabHeights.join(",")}`).toBe(1);
  await expect(everyDay).toHaveAttribute("aria-selected", "true");

  // Save: back on Today with the new habit and an Undo.
  await save.click();
  await expect(page.getByTestId("screen-today")).toBeVisible();
  await expect(page.getByText("Added Floss teeth")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Floss teeth\./ })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: /^Floss teeth\./ })).toHaveCount(0);

  // Edit: rename, save, and Undo puts the old name back.
  await page.getByRole("button", { name: /^Read 20 minutes\./ }).click();
  await expect(page.getByTestId("screen-habit-detail")).toBeVisible();
  await page.getByRole("button", { name: "Edit habit" }).first().click();
  await expect(page.getByTestId("screen-habit-edit")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Edit habit" })).toBeFocused();
  await page.getByRole("textbox", { name: "Name" }).fill("Read 25 minutes");
  await page.getByTestId("habit-save").click();
  await expect(page.getByRole("heading", { level: 1, name: "Read 25 minutes" })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Read 20 minutes" })).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("habit detail: streak wording per schedule, calendar back-fill, delete with Undo", async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(showcaseClock());
  await page.addInitScript(() => localStorage.setItem("everwick/tips/today-gestures", "dismissed"));

  // Strength workout runs Mon/Wed/Fri: on a Friday its streak counts check-ins, and the next one is Monday.
  await page.goto("/habit/strength?state=fresh&onboarded=1");
  await expect(page.getByTestId("screen-habit-detail")).toBeVisible();
  await expect(page.getByText("Check in to make it 7 in a row.")).toBeVisible();
  await page.getByRole("button", { name: "Check in Strength workout" }).click();
  await expect(page.getByText("7 check-ins in a row. See you Monday.")).toBeVisible();
  await expect(page.getByText(/Strength\sworkout\s·\s7\sin\sa\srow/)).toBeVisible();

  // Walk 8k steps: back-fill a missed day from the calendar; the month is one Tab stop.
  await page.goto("/habit/walk?state=fresh&onboarded=1");
  await expect(page.getByTestId("screen-habit-detail")).toBeVisible();
  const tabbableDays = await page.getByRole("button", { name: /^(Today, )?Oct \d+, / }).evaluateAll((els) => els.filter((e) => e.getAttribute("tabindex") !== "-1").length);
  expect(tabbableDays).toBe(1);
  const missed = page.getByRole("button", { name: /^Oct \d+, missed$/ }).first();
  const missedLabel = (await missed.getAttribute("aria-label"))!;
  const day = missedLabel.split(",")[0];
  await missed.click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: /^(Check in|Mark all done)$/ }).click();
  await expect(sheet).toBeHidden();
  // A late check-in has no time ("done", never "done at ...").
  await expect(page.getByRole("button", { name: `${day}, done` })).toBeVisible();

  // Delete asks first, then offers Undo, which brings the habit back with its history.
  await page.getByRole("button", { name: /^Delete habit/ }).click();
  const confirm = page.getByRole("alertdialog");
  await confirm.getByRole("button", { name: "Delete habit" }).click();
  await expect(page.getByTestId("screen-today")).toBeVisible();
  await expect(page.getByText("Walk 8k steps deleted")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Walk 8k steps\./ })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: /^Walk 8k steps\..*\d+ day streak/ })).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});
