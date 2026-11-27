/// <reference types="node" />
/**
 * Quick review captures while working on a screen.
 *
 *   npx tsx scripts/capture.ts --routes /,/progress --themes light,dark --widths 390,1440
 *   npx tsx scripts/capture.ts --routes "/?state=empty" --themes dark --scroll 0,600,1200
 *
 * Options: --base (default http://127.0.0.1:3300), --routes, --themes, --widths,
 * --time (clock at load, default 2026-10-23T17:40:00 local), --scroll <px[,px...]> (scrolls
 * the visible screen's scroll view), --wait <ms> (default 2200), --device (adds the generic
 * phone status bar), --clean (dismisses the Today gesture tip), --out (default .qa/review).
 * Routes other than /onboarding load with onboarded=1. Prints console errors.
 * Writes <out>/<name>-<theme>-<width>[-s<y>].png.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const base = arg("base", "http://127.0.0.1:3300");
const routes = arg("routes", "/").split(",");
const themes = arg("themes", "light,dark").split(",") as ("light" | "dark")[];
const widths = arg("widths", "390,1440").split(",").map(Number);
const time = arg("time", "2026-10-23T17:40:00");
const scrolls = arg("scroll", "0").split(",").map(Number);
const wait = Number(arg("wait", "2200"));
const out = path.resolve(arg("out", ".qa/review"));
mkdirSync(out, { recursive: true });

function slug(route: string): string {
  const [pathname, query] = route.split("?");
  const name = pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "_") || "today";
  return query ? `${name}-${query.replace(/[=&]/g, "-")}` : name;
}

/**
 * Sets the clock to `iso` at page load and lets it tick from there (Date only).
 * page.clock also fakes requestAnimationFrame and timers, which slows Reanimated
 * to a crawl; a Date that never moves would stall React Navigation's JS-driven
 * transitions, which time themselves with Date.now().
 */
function frozenDateScript(iso: string): string {
  return `(() => {
    const RealDate = Date;
    const fixed = new RealDate(${JSON.stringify(iso)}).getTime();
    const start = RealDate.now();
    const current = () => fixed + (RealDate.now() - start);
    class ShiftedDate extends RealDate {
      constructor(...args) { if (args.length === 0) super(current()); else super(...args); }
      static now() { return current(); }
    }
    globalThis.Date = ShiftedDate;
  })()`;
}

/** Scrolls the scroll view of the screen in the middle of the viewport (not a screen mounted underneath). */
async function scrollVisibleScreen(page: Page, y: number): Promise<void> {
  await page.evaluate((top) => {
    const hit = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    const screen = hit?.closest<HTMLElement>('[data-testid^="screen-"]') ?? document.querySelector<HTMLElement>('[role="main"]');
    const scroller = Array.from(screen?.querySelectorAll<HTMLElement>("div") ?? []).find(
      (el) => el.scrollHeight > el.clientHeight + 4 && getComputedStyle(el).overflowY !== "visible",
    );
    if (scroller) scroller.scrollTop = top;
  }, y);
}

function urlFor(route: string, theme: string): string {
  const [pathname, query = ""] = route.split("?");
  const params = new URLSearchParams(query);
  params.set("theme", theme);
  if (!params.has("onboarded") && !pathname.startsWith("/onboarding")) params.set("onboarded", "1");
  if (flag("device")) params.set("device", "1");
  return `${base}${pathname}?${params.toString()}`;
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? undefined });
  let problems = 0;
  for (const width of widths) {
    for (const theme of themes) {
      const height = width < 600 ? 844 : 900;
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width < 600 ? 2 : 1, colorScheme: theme, reducedMotion: "no-preference" });
      await context.addInitScript(frozenDateScript(time));
      if (flag("clean")) await context.addInitScript(() => localStorage.setItem("everwick/tips/today-gestures", "dismissed"));
      for (const route of routes) {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
        page.on("pageerror", (e) => errors.push(String(e)));
        await page.goto(urlFor(route, theme), { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(wait);
        for (const y of scrolls) {
          if (y) {
            await scrollVisibleScreen(page, y);
            await page.waitForTimeout(600);
          }
          const file = path.join(out, `${slug(route)}-${theme}-${width}${y ? `-s${y}` : ""}.png`);
          await page.screenshot({ path: file });
          console.log(`${errors.length ? "!!" : "ok"} ${file}`);
        }
        for (const e of errors) {
          problems++;
          console.log(`   console: ${e.slice(0, 300)}`);
        }
        await page.close();
      }
      await context.close();
    }
  }
  await browser.close();
  if (problems) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
