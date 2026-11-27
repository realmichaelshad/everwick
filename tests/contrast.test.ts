import { describe, expect, it } from "vitest";

import { HABIT_COLOR_KEYS, habitPalettes, themes, type Scheme } from "@/theme/colors";
import { contrast } from "@/theme/contrast";

const AA_TEXT = 4.5;
const AA_LARGE_OR_UI = 3;

describe.each(["light", "dark"] as Scheme[])("%s theme contrast (WCAG AA)", (scheme) => {
  const c = themes[scheme];
  const text: [string, string, string][] = [
    ["ink on canvas", c.ink, c.canvas],
    ["ink on surface", c.ink, c.surface],
    ["ink on surfaceMuted", c.ink, c.surfaceMuted],
    ["ink on surfaceRaised", c.ink, c.surfaceRaised],
    ["inkMuted on canvas", c.inkMuted, c.canvas],
    ["inkMuted on surface", c.inkMuted, c.surface],
    ["inkMuted on surfaceMuted", c.inkMuted, c.surfaceMuted],
    ["inkSubtle on canvas", c.inkSubtle, c.canvas],
    ["inkSubtle on surface", c.inkSubtle, c.surface],
    ["inkSubtle on surfaceMuted", c.inkSubtle, c.surfaceMuted],
    ["accentText on canvas", c.accentText, c.canvas],
    ["accentText on surface", c.accentText, c.surface],
    ["accentText on accentSoft", c.accentText, c.accentSoft],
    ["onAccent on accent", c.onAccent, c.accent],
    ["successText on surface", c.successText, c.surface],
    ["successText on successSoft", c.successText, c.successSoft],
    ["dangerText on surface", c.dangerText, c.surface],
    ["dangerText on dangerSoft", c.dangerText, c.dangerSoft],
    ["freezeText on surface", c.freezeText, c.surface],
    ["freezeText on freezeSoft", c.freezeText, c.freezeSoft],
    ["inkInverse on ink", c.inkInverse, c.ink],
    ["swipe check label", c.onSwipeCheck, c.swipeCheck],
    ["swipe skip label", c.onSwipeSkip, c.swipeSkip],
    ["celebration ink on brand amber", "#1C1424", c.brand[0]],
    ["celebration ink on brand ember", "#1C1424", c.brand[1]],
  ];
  it.each(text)("%s >= 4.5:1", (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each([...HABIT_COLOR_KEYS])("habit color %s: ink text on soft, surface and canvas; icon on solid", (key) => {
    const tone = habitPalettes[scheme][key];
    expect(contrast(tone.ink, tone.soft)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(tone.ink, c.surface)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(tone.ink, c.canvas)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(tone.onSolid, tone.solid)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
  });

  it.each([...HABIT_COLOR_KEYS])("habit color %s: an unchecked check button's rim reads as a control (3:1 on card, canvas and its soft fill)", (key) => {
    const tone = habitPalettes[scheme][key];
    expect(contrast(tone.rim, c.surface)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
    expect(contrast(tone.rim, c.canvas)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
    expect(contrast(tone.rim, tone.soft)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
    // The faint check glyph inside is the habit ink on the soft fill.
    expect(contrast(tone.ink, tone.soft)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("draws an off switch at 3:1 on cards and settings rows", () => {
    expect(contrast(c.switchOff, c.surface)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
    expect(contrast(c.switchOff, c.surfaceRaised)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
    expect(contrast(c.switchOff, c.surfaceMuted)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
    expect(contrast(c.switchOff, c.canvas)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
  });

  it("raises the segmented control's selected thumb off its track", () => {
    // Dark has no shadow to lean on, so the thumb itself must stand out (1.5:1);
    // by day the white thumb also carries a card shadow.
    expect(contrast(c.segmentThumb, c.segmentTrack)).toBeGreaterThanOrEqual(scheme === "dark" ? 1.5 : 1.1);
    expect(contrast(c.ink, c.segmentThumb)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.inkMuted, c.segmentTrack)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("keeps the focus ring visible on the canvas", () => {
    expect(contrast(c.focus, c.canvas)).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
  });
});
