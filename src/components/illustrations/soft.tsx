/**
 * "Soft 3D" SVG helpers for illustration fallbacks: radial-gradient shading
 * (light from the top left), glossy highlights and contact shadows, so the
 * SVG fallbacks sit in the same visual family as the clay-style PNGs that
 * can replace them. Use inside an <Svg viewBox="0 0 200 200">.
 */
import { useId } from "react";
import { Ellipse, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";

/** Stable, SVG-safe id prefix for gradient definitions. */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

/** Mixes a #RRGGBB color toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const n = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const t = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  return `#${n
    .map((c) => Math.round(c + (t - c) * a))
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** A radial gradient lit from the top left: highlight -> base -> shadow. Put inside <Defs>. */
export function SoftGradient({ id, color, light = 0.45, dark = -0.28, cx = "34%", cy = "28%" }: { id: string; color: string; light?: number; dark?: number; cx?: string; cy?: string }) {
  return (
    <RadialGradient id={id} cx={cx} cy={cy} r="78%" fx={cx} fy={cy}>
      <Stop offset="0" stopColor={shade(color, light)} />
      <Stop offset="0.55" stopColor={color} />
      <Stop offset="1" stopColor={shade(color, dark)} />
    </RadialGradient>
  );
}

/** Vertical gradient (top to bottom) for flat-ish surfaces. Put inside <Defs>. */
export function VerticalGradient({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor={from} />
      <Stop offset="1" stopColor={to} />
    </LinearGradient>
  );
}

/** Soft contact shadow ellipse. */
export function ContactShadow({ cx, cy, rx, opacity = 0.16, color = "#5A2A14" }: { cx: number; cy: number; rx: number; opacity?: number; color?: string }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.2} fill={color} opacity={opacity} />;
}

/** Glossy highlight: a small rotated ellipse near the top left of a shape. */
export function Gloss({ cx, cy, rx, ry, rotate = -30, opacity = 0.55 }: { cx: number; cy: number; rx: number; ry: number; rotate?: number; opacity?: number }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#FFFFFF" opacity={opacity} transform={`rotate(${rotate} ${cx} ${cy})`} />;
}

/** Rounded 4-point sparkle. */
export function SoftSparkle({ x, y, size, color, opacity = 1 }: { x: number; y: number; size: number; color: string; opacity?: number }) {
  const s = size / 2;
  const w = s * 0.3;
  return (
    <Path
      d={`M ${x} ${y - s} Q ${x + w} ${y - w} ${x + s} ${y} Q ${x + w} ${y + w} ${x} ${y + s} Q ${x - w} ${y + w} ${x - s} ${y} Q ${x - w} ${y - w} ${x} ${y - s} Z`}
      fill={color}
      opacity={opacity}
    />
  );
}
