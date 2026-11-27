/// <reference types="node" />
/**
 * Store assets from the logo: writes the SVG sources to assets/brand/ and
 * renders every PNG the app config needs (iOS icon, Android adaptive icon
 * layers, splash mark, web favicon and touch icon) with sharp.
 *
 *   npm run icons
 *
 * The icon is the mark on warm paper: an amber-to-ember candle flame with a
 * glowing cream core and a plum wick, a soft halo behind it. The gradient
 * lives only on the flame; the ground stays calm cream (the dark splash sets
 * a plum background in app.json).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

import { FLAME_INNER_PATH, FLAME_PATH, MARK_CENTER, WICK_COLOR, WICK_PATH, WICK_WIDTH } from "../src/components/brand/geometry";

const root = path.resolve(import.meta.dirname, "..");
const brandDir = path.join(root, "assets", "brand");
const imagesDir = path.join(root, "assets", "images");
const publicDir = path.join(root, "public");
for (const d of [brandDir, imagesDir, publicDir]) mkdirSync(d, { recursive: true });

const CREAM = "#FFF7F2";
const CORE = "#FFE3A6";

const DEFS = `
  <linearGradient id="flame" x1="0.25" y1="1" x2="0.7" y2="0">
    <stop offset="0" stop-color="#FFB547"/>
    <stop offset="0.6" stop-color="#FF7A3A"/>
    <stop offset="1" stop-color="#FF6B35"/>
  </linearGradient>
  <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFAF6"/>
    <stop offset="1" stop-color="#FFEADC"/>
  </linearGradient>
  <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FFB547" stop-opacity="0.4"/>
    <stop offset="0.5" stop-color="#FFB547" stop-opacity="0.14"/>
    <stop offset="1" stop-color="#FFB547" stop-opacity="0"/>
  </radialGradient>`;

/** The mark at `scale` (64-unit box), centered at (cx, cy) of a 1024 canvas. */
function mark(scale: number, cx = 512, cy = 512, opts: { flame?: string; core?: string; wick?: string; holeCore?: boolean; noWick?: boolean } = {}) {
  const tx = cx - MARK_CENTER.x * scale;
  const ty = cy - MARK_CENTER.y * scale;
  // Monochrome: the inner flame is a hole in the flame (even-odd).
  const flame = opts.holeCore
    ? `<path fill-rule="evenodd" d="${FLAME_PATH} ${FLAME_INNER_PATH}" fill="${opts.flame ?? "url(#flame)"}"/>`
    : `<path d="${FLAME_PATH}" fill="${opts.flame ?? "url(#flame)"}"/><path d="${FLAME_INNER_PATH}" fill="${opts.core ?? CORE}"/>`;
  const wick = opts.noWick ? "" : `<path d="${WICK_PATH}" stroke="${opts.wick ?? WICK_COLOR}" stroke-width="${WICK_WIDTH}" stroke-linecap="round" fill="none"/>`;
  return `<g transform="translate(${tx} ${ty}) scale(${scale})">
    ${flame}
    ${wick}
  </g>`;
}

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>${DEFS}</defs>${body}</svg>`;
const halo = (cy = 548, r = 420) => `<circle cx="512" cy="${cy}" r="${r}" fill="url(#halo)"/>`;

/** iOS / store icon: full-bleed paper (the OS applies its own mask). */
const iconSvg = svg(`<rect width="1024" height="1024" fill="url(#paper)"/>${halo()}${mark(12.6, 512, 506)}`);
/** Rounded preview of the icon (README, showcase). */
const iconRoundedSvg = svg(`<rect width="1024" height="1024" rx="228" fill="url(#paper)"/>${halo()}${mark(12.6, 512, 506)}`);
/** Android adaptive layers: the foreground stays inside the 66% safe zone. */
const adaptiveForegroundSvg = svg(mark(8.6, 512, 506));
const adaptiveBackgroundSvg = svg(`<rect width="1024" height="1024" fill="url(#paper)"/>${halo(530, 360)}`);
const monochromeSvg = svg(mark(8.6, 512, 506, { flame: "#FFFFFF", wick: "#FFFFFF", holeCore: true }));
/** Favicon (48 px): the flame alone, a little larger (the wick only adds noise at tab size). */
const faviconSvg = svg(`<rect width="1024" height="1024" rx="228" fill="url(#paper)"/>${halo()}${mark(14.2, 512, 530, { noWick: true })}`);
/** Splash: the mark alone on a transparent canvas (the background color comes from app.json, cream or plum). */
const splashSvg = svg(mark(12, 512, 512, { core: "#FFE7B0" }));

const sources: Record<string, string> = {
  "icon.svg": iconSvg,
  "icon-rounded.svg": iconRoundedSvg,
  "adaptive-foreground.svg": adaptiveForegroundSvg,
  "adaptive-background.svg": adaptiveBackgroundSvg,
  "adaptive-monochrome.svg": monochromeSvg,
  "splash-icon.svg": splashSvg,
};
for (const [name, content] of Object.entries(sources)) writeFileSync(path.join(brandDir, name), content);

async function render(source: string, out: string, size: number, flatten?: string) {
  let img = sharp(Buffer.from(source), { density: 288 }).resize(size, size);
  if (flatten) img = img.flatten({ background: flatten });
  await img.png({ compressionLevel: 9 }).toFile(out);
  console.log(`  ${path.relative(root, out)} ${size}x${size}`);
}

async function main() {
  console.log("Rendering store assets:");
  await render(iconSvg, path.join(imagesDir, "icon.png"), 1024, CREAM);
  await render(adaptiveForegroundSvg, path.join(imagesDir, "android-icon-foreground.png"), 1024);
  await render(adaptiveBackgroundSvg, path.join(imagesDir, "android-icon-background.png"), 1024, CREAM);
  await render(monochromeSvg, path.join(imagesDir, "android-icon-monochrome.png"), 1024);
  await render(splashSvg, path.join(imagesDir, "splash-icon.png"), 1024);
  await render(faviconSvg, path.join(imagesDir, "favicon.png"), 48);
  await render(faviconSvg, path.join(publicDir, "favicon.png"), 48);
  await render(iconSvg, path.join(publicDir, "apple-touch-icon.png"), 180, CREAM);
  await render(iconRoundedSvg, path.join(brandDir, "icon-rounded-512.png"), 512);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
