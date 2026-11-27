/// <reference types="node" />
/**
 * QA sweep: visits every route at 390, 768, 1280 and 1440 px (light and dark),
 * and records horizontal overflow, console errors, page errors, failed
 * requests and serious/critical axe violations. Screenshots go to
 * .qa/shots/, the report to .qa/qa-report.json. Exits non-zero on failures.
 *
 *   npx tsx scripts/qa.ts --base http://127.0.0.1:3310
 *   npx tsx scripts/qa.ts --base http://127.0.0.1:3300 --routes /,/progress --themes light
 *   npx tsx scripts/qa.ts --nav-only            (just the in-app navigation pass)
 *
 * Every route except /onboarding loads with ?onboarded=1 so the first-launch
 * redirect doesn't hide the screen under test. Axe runs at every scroll
 * position of the visible screen, because some rules (e.g.
 * label-content-name-mismatch) only check elements on screen.
 *
 * A second pass navigates inside the app (Today -> Progress -> Profile tabs,
 * a habit's detail, its Edit form, New habit, and back), because a cold
 * load never sees screens that stay mounted behind the current one. After
 * each step it checks that focus moved into the new screen (never left on
 * <body>), runs axe and walks the Tab order, failing if a tab stop lands on
 * something hidden (inside aria-hidden or inert, or not visible).
 *
 * A third pass (390 wide, full motion) switches tabs and checks every habit
 * in with plain clicks, and samples the page width during the all-done
 * confetti: the page must never get wider than the viewport, and nothing may
 * be left scrolled sideways.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "playwright";

export const ROUTES = [
  "/",
  "/?state=empty",
  "/?state=error",
  "/?state=loading",
  "/progress",
  "/progress?state=empty",
  "/progress?state=error",
  "/progress?state=loading",
  "/profile",
  "/profile?state=empty",
  "/profile?state=error",
  "/profile?state=loading",
  "/onboarding",
  "/onboarding?state=loading",
  "/habit/new",
  "/habit/water",
  "/habit/strength",
  "/habit/water/edit",
  "/habit/no-such-habit",
  "/habit/water?state=loading",
  "/pro",
  "/notifications",
  "/notifications?state=empty",
  "/no-such-screen",
];
const WIDTHS = [390, 768, 1280, 1440];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const base = (arg("base") ?? "http://127.0.0.1:3310").replace(/\/$/, "");
const routes = arg("routes")?.split(",").filter(Boolean) ?? ROUTES;
const themes = (arg("themes") ?? "light,dark").split(",") as ("light" | "dark")[];
const widths = arg("widths")?.split(",").map(Number) ?? WIDTHS;
const root = path.resolve(import.meta.dirname, "..");
const shotsDir = path.join(root, ".qa", "shots");
mkdirSync(shotsDir, { recursive: true });

interface Result {
  route: string;
  theme: string;
  width: number;
  overflow: boolean;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  axe: { id: string; impact: string | null | undefined; help: string; nodes: number; target: string }[];
  screenshot: string;
}

function urlFor(route: string, theme: string): string {
  const [pathname, query = ""] = route.split("?");
  const params = new URLSearchParams(query);
  params.set("theme", theme);
  if (!params.has("onboarded")) params.set("onboarded", pathname.startsWith("/onboarding") ? "0" : "1");
  return `${base}${pathname}?${params.toString()}`;
}

const slug = (route: string) => route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "today";

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
}

type AxeFinding = Result["axe"][number];

/** Runs axe at the top of the visible screen and at each further scroll position (up to 10). */
async function axeSweep(page: Page): Promise<AxeFinding[]> {
  const found = new Map<string, AxeFinding & { targets: Set<string> }>();
  for (let step = 0; step < 10; step++) {
    if (step > 0) {
      const moved = await page.evaluate(() => {
        const hit = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        const screen = hit?.closest<HTMLElement>('[data-testid^="screen-"]') ?? document.querySelector<HTMLElement>('[role="main"]');
        const scroller = Array.from(screen?.querySelectorAll<HTMLElement>("div") ?? []).find(
          (el) => el.scrollHeight > el.clientHeight + 4 && getComputedStyle(el).overflowY !== "visible",
        );
        if (!scroller) return false;
        const before = scroller.scrollTop;
        scroller.scrollTop = before + scroller.clientHeight * 0.8;
        return scroller.scrollTop > before;
      });
      if (!moved) break;
      await page.waitForTimeout(350);
    }
    const result = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    for (const v of result.violations) {
      if (v.impact !== "serious" && v.impact !== "critical") continue;
      const entry = found.get(v.id) ?? { id: v.id, impact: v.impact, help: v.help, nodes: 0, target: "", targets: new Set<string>() };
      for (const n of v.nodes) entry.targets.add(n.target.join(" "));
      found.set(v.id, entry);
    }
  }
  return [...found.values()].map(({ targets, ...v }) => ({ ...v, nodes: targets.size, target: [...targets].slice(0, 3).join(" | ") }));
}

/** Presses Tab up to `max` times and reports stops that land on hidden or inert content. */
async function tabWalk(page: Page, max = 45): Promise<string[]> {
  const problems: string[] = [];
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const issue = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const label = (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName).trim().slice(0, 60);
      if (el.closest('[aria-hidden="true"], [inert]')) return `hidden or inert: ${label}`;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return `zero-size: ${label}`;
      let node: HTMLElement | null = el;
      while (node) {
        const cs = getComputedStyle(node);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return `invisible: ${label}`;
        node = node.parentElement;
      }
      return null;
    });
    if (issue && !problems.includes(issue)) problems.push(issue);
  }
  return problems;
}

/** In-app navigation: tabs and a pushed detail screen, checked with axe and a Tab walk after each step. */
async function navigationPass(browser: Awaited<ReturnType<typeof chromium.launch>>, theme: "light" | "dark", width: number): Promise<Result[]> {
  const out: Result[] = [];
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, colorScheme: theme, reducedMotion: "reduce" });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 400));
  });
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 400)));
  await page.goto(urlFor("/", theme), { waitUntil: "networkidle" });
  await settle(page);
  const steps: { name: string; go: () => Promise<void> }[] = [
    { name: "nav: Today -> Progress", go: () => page.getByRole("link", { name: "Progress" }).click() },
    { name: "nav: Progress -> Profile", go: () => page.getByRole("link", { name: "Profile" }).click() },
    { name: "nav: Profile -> Today", go: () => page.getByRole("link", { name: "Today" }).click() },
    { name: "nav: Today -> habit detail", go: () => page.getByRole("button", { name: /^Drink water\./ }).click() },
    { name: "nav: detail -> Edit habit", go: () => page.getByRole("button", { name: "Edit habit" }).first().click() },
    { name: "nav: Edit habit -> back to detail", go: () => page.getByRole("button", { name: "Close" }).first().click() },
    { name: "nav: detail -> back to Today", go: () => page.getByRole("button", { name: "Back" }).first().click() },
    {
      name: "nav: Today -> New habit",
      go: async () => {
        await page.getByRole("button", { name: /^Add a habit/ }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Create your own", exact: true }).click();
      },
    },
    { name: "nav: New habit -> back to Today", go: () => page.getByRole("button", { name: "Close" }).first().click() },
  ];
  for (const step of steps) {
    consoleErrors.length = 0;
    pageErrors.length = 0;
    await step.go();
    await page.waitForTimeout(900);
    // After a navigation, focus belongs inside the new screen (its title or the control you came back to).
    const focus = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return "focus stayed on <body> after navigating";
      return null;
    });
    if (focus) pageErrors.push(focus);
    const axe = await axeSweep(page);
    const hidden = await tabWalk(page);
    const screenshot = path.join(shotsDir, `${slug(step.name)}-${theme}-${width}.png`);
    await page.screenshot({ path: screenshot });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const result: Result = {
      route: step.name,
      theme,
      width,
      overflow,
      consoleErrors: [...consoleErrors],
      pageErrors: [...pageErrors, ...hidden.map((h) => `tab stop on ${h}`)],
      failedRequests: [],
      axe,
      screenshot: path.relative(root, screenshot),
    };
    out.push(result);
    const bad = overflow || result.consoleErrors.length || result.pageErrors.length || axe.length;
    console.log(`${bad ? "FAIL" : " ok "} ${theme.padEnd(5)} ${String(width).padStart(4)} ${step.name}`);
    for (const e of [...result.consoleErrors, ...result.pageErrors]) console.log(`      ${e.slice(0, 200)}`);
    for (const a of axe) console.log(`      axe ${a.impact}: ${a.id} (${a.nodes}) ${a.help} -> ${a.target}`);
  }
  await context.close();
  return out;
}

/**
 * The all-done moment at phone width with full motion, driven by plain clicks:
 * visit Progress and come back (tab scenes), check in every open habit, then
 * sample the page width while the confetti flies and look for anything left
 * scrolled sideways afterwards.
 */
async function celebrationPass(browser: Awaited<ReturnType<typeof chromium.launch>>, theme: "light" | "dark"): Promise<Result> {
  const width = 390;
  const context = await browser.newContext({ viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: "no-preference" });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 400));
  });
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 400)));
  await page.goto(urlFor("/?state=fresh", theme), { waitUntil: "networkidle" });
  await settle(page);
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await page.waitForTimeout(800);
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page.waitForTimeout(800);
  let widest = 0;
  for (let i = 0; i < 12; i++) {
    const open = page.getByRole("button", { name: /^(Check in |Mark .* as done$|.*\. Add one$)/ });
    if ((await open.count()) === 0) break;
    await open.first().click();
    await page.waitForTimeout(260);
  }
  for (let i = 0; i < 16; i++) {
    widest = Math.max(widest, await page.evaluate(() => document.documentElement.scrollWidth));
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(800);
  const scrolled = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("div"))
      .filter((el) => el.scrollLeft > 0)
      .map((el) => `${el.className.slice(0, 40) || el.tagName} scrollLeft=${el.scrollLeft}`)
      .slice(0, 3),
  );
  const celebrated = await page.getByText("All done today").count();
  const screenshot = path.join(shotsDir, `celebration-${theme}-${width}.png`);
  await page.screenshot({ path: screenshot });
  if (!celebrated) pageErrors.push("all-done card did not appear after checking everything in");
  for (const sc of scrolled) pageErrors.push(`left scrolled sideways: ${sc}`);
  const result: Result = {
    route: "flow: tabs, check in everything, confetti",
    theme,
    width,
    overflow: widest > width,
    consoleErrors,
    pageErrors,
    failedRequests: [],
    axe: [],
    screenshot: path.relative(root, screenshot),
  };
  const bad = result.overflow || consoleErrors.length || pageErrors.length;
  console.log(`${bad ? "FAIL" : " ok "} ${theme.padEnd(5)} ${String(width).padStart(4)} ${result.route}${widest > width ? ` (page grew to ${widest}px)` : ""}`);
  for (const e of [...consoleErrors, ...pageErrors]) console.log(`      ${e.slice(0, 200)}`);
  await context.close();
  return result;
}

async function main() {
  const browser = await chromium.launch();
  const results: Result[] = [];
  const navOnly = process.argv.includes("--nav-only");
  for (const theme of navOnly ? [] : themes) {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, colorScheme: theme, reducedMotion: "reduce" });
      for (const route of routes) {
        const page = await context.newPage();
        const consoleErrors: string[] = [];
        const pageErrors: string[] = [];
        const failedRequests: string[] = [];
        page.on("console", (m) => {
          if (m.type() === "error") consoleErrors.push(m.text().slice(0, 400));
        });
        page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 400)));
        page.on("requestfailed", (r) => {
          const failure = r.failure()?.errorText ?? "";
          if (failure.includes("ERR_ABORTED")) return; // navigations and cancelled media
          failedRequests.push(`${r.url()} ${failure}`);
        });
        page.on("response", (r) => {
          if (r.status() >= 400 && !r.url().includes("favicon")) failedRequests.push(`${r.status()} ${r.url()}`);
        });
        await page.goto(urlFor(route, theme), { waitUntil: "networkidle" });
        await settle(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        const screenshot = path.join(shotsDir, `${slug(route)}-${theme}-${width}.png`);
        await page.screenshot({ path: screenshot });
        const axe = await axeSweep(page);
        const result: Result = { route, theme, width, overflow, consoleErrors, pageErrors, failedRequests, axe, screenshot: path.relative(root, screenshot) };
        results.push(result);
        const bad = overflow || consoleErrors.length || pageErrors.length || failedRequests.length || axe.length;
        console.log(`${bad ? "FAIL" : " ok "} ${theme.padEnd(5)} ${String(width).padStart(4)} ${route}`);
        if (overflow) console.log("      horizontal overflow");
        for (const e of [...consoleErrors, ...pageErrors]) console.log(`      error: ${e.slice(0, 200)}`);
        for (const f of failedRequests) console.log(`      request: ${f}`);
        for (const a of axe) console.log(`      axe ${a.impact}: ${a.id} (${a.nodes}) ${a.help} -> ${a.target}`);
        await page.close();
      }
      await context.close();
    }
  }
  if (!arg("routes") || navOnly) {
    for (const theme of themes) {
      for (const width of widths.filter((w) => w === 390 || w === 1280)) results.push(...(await navigationPass(browser, theme, width)));
      if (widths.includes(390)) results.push(await celebrationPass(browser, theme));
    }
  }
  await browser.close();
  const failures = results.filter((r) => r.overflow || r.consoleErrors.length || r.pageErrors.length || r.failedRequests.length || r.axe.length);
  const report = { base, generatedAt: new Date().toISOString(), checked: results.length, failures: failures.length, results };
  writeFileSync(path.join(root, ".qa", "qa-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n${results.length} checks, ${failures.length} failing. Report: .qa/qa-report.json`);
  if (failures.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
