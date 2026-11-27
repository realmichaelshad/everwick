/// <reference types="node" />
/**
 * Regenerates src/content/illustrationSources.ts from the PNGs present in
 * assets/illustrations/. Run after adding or removing an illustration:
 *
 *   npm run illustrations
 *
 * Metro bundles images only through static require() calls, so the file is
 * generated rather than built at runtime.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ILLUSTRATION_SLOTS } from "../src/content/illustrationSlots";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "assets", "illustrations");
const out = path.join(root, "src", "content", "illustrationSources.ts");

const lines = ILLUSTRATION_SLOTS.map((slot) => {
  const file = path.join(dir, `${slot}.png`);
  return existsSync(file)
    ? `  "${slot}": require("../../assets/illustrations/${slot}.png"),`
    : `  "${slot}": null,`;
});
const present = ILLUSTRATION_SLOTS.filter((slot) => existsSync(path.join(dir, `${slot}.png`)));

const source = `/**
 * Written by scripts/sync-illustrations.ts (npm run illustrations). Do not edit by hand.
 * null = no PNG yet, the app draws the SVG fallback for that slot.
 */
import type { IllustrationSlot } from "./illustrationSlots";

/** Metro asset ids (what require() of an image returns), one entry per slot: a missing or misspelled slot fails the typecheck. */
export const ILLUSTRATION_SOURCES: Record<IllustrationSlot, number | null> = {
${lines.join("\n")}
};
`;

const previous = existsSync(out) ? readFileSync(out, "utf8") : "";
if (previous !== source) writeFileSync(out, source);
console.log(`Illustrations: ${present.length} of ${ILLUSTRATION_SLOTS.length} slots have a PNG${present.length ? ` (${present.join(", ")})` : ""}.`);
