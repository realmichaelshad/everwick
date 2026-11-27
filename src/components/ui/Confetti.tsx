import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Platform, StyleSheet, View, type HostInstance, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { FLAME_PATH, FLAME_VIEWBOX } from "@/components/brand/geometry";
import { Portal } from "@/components/system/Portal";
import { createRng } from "@/data/prng";
import { measureInWindow } from "@/lib/measure";
import { useTheme } from "@/theme";

export interface ConfettiProps {
  /** Increment to fire a burst (0 = idle). */
  fire: number;
  /** Burst from the center of this view (measured when firing). Falls back to `origin`. */
  anchor?: RefObject<HostInstance | null>;
  /** Burst origin as fractions of the app column (default: upper middle). */
  origin?: { x: number; y: number };
  count?: number;
}

type Shape = "rect" | "streamer" | "dot" | "flame";

interface Piece {
  vx: number;
  vy: number;
  spin: number;
  /** Side-to-side flutter: amplitude (pt) and speed. */
  sway: number;
  swaySpeed: number;
  size: number;
  shape: Shape;
  color: string;
  delay: number;
}

const DURATION = 2100;
const GRAVITY = 1250; // points per second squared

/**
 * Physics confetti for the big moments (all habits done, a medal unlocked):
 * pieces launch from the anchor's center with a velocity and spin, then air
 * drag, gravity and a flutter carry them down over about two seconds. Mixed
 * shapes in the brand colors: paper rectangles, streamers, dots and small
 * flames. Rendered in the app's portal so it covers the whole column.
 * Skipped entirely when the system asks for reduced motion.
 */
export function Confetti({ fire, anchor, origin = { x: 0.5, y: 0.3 }, count = 84 }: ConfettiProps) {
  const reduced = useReducedMotion();
  const [burst, setBurst] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [measured, setMeasured] = useState(false);
  const hostRef = useRef<HostInstance>(null);

  useEffect(() => {
    if (!fire || reduced) return;
    setPoint(null);
    setMeasured(false);
    setBurst(fire);
    // Unmount as soon as the last piece has faded out.
    const id = setTimeout(() => setBurst(0), DURATION + 150);
    return () => clearTimeout(id);
  }, [fire, reduced]);

  // Once the overlay is laid out, find the anchor's center in its coordinates.
  const onLayout = (width: number, height: number) => {
    setSize({ width, height });
    if (!anchor?.current) {
      setMeasured(true);
      return;
    }
    // measureInWindow always calls back (null when it can't measure), so the burst always fires.
    measureInWindow(anchor.current, (target) => {
      measureInWindow(hostRef.current, (host) => {
        if (target && host) setPoint({ x: target.x - host.x + target.width / 2, y: target.y - host.y + target.height * 0.45 });
        setMeasured(true);
      });
    });
  };

  if (!burst) return null;
  const x = point?.x ?? size.width * origin.x;
  const y = point?.y ?? size.height * origin.y;
  const ready = size.width > 0 && measured;
  return (
    <Portal>
      {/* Clipped to the app column: pieces that fly past the edge never widen the page. */}
      <View ref={hostRef} pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]} onLayout={(e) => onLayout(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}>
        {ready ? <Burst key={burst} seed={burst} count={count} x={x} y={y} /> : null}
      </View>
    </Portal>
  );
}

function Burst({ seed, count, x, y }: { seed: number; count: number; x: number; y: number }) {
  const { colors } = useTheme();
  const t = useSharedValue(0);
  const pieces = useMemo<Piece[]>(() => {
    const rng = createRng(`confetti-${seed}`);
    // Flame tones and paper only: the celebration stays in the app's one warm color.
    const palette = [colors.success, colors.flameMid, colors.flameCore, colors.successText, colors.ink, colors.lineStrong];
    return Array.from({ length: count }, (_, i) => {
      // A fan that opens upward, a little wider than a half circle.
      const angle = -Math.PI / 2 + (rng.next() - 0.5) * Math.PI * 1.15;
      const speed = 420 + rng.next() * 700;
      const roll = rng.next();
      const shape: Shape = i % 9 === 0 ? "flame" : roll < 0.48 ? "rect" : roll < 0.72 ? "streamer" : "dot";
      return {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        spin: (rng.next() - 0.5) * 1100,
        sway: 10 + rng.next() * 22,
        swaySpeed: 4 + rng.next() * 5,
        size: 8 + rng.next() * 6,
        shape,
        color: shape === "flame" ? colors.success : palette[i % palette.length],
        delay: rng.next() * 120,
      };
    });
  }, [colors, count, seed]);

  useEffect(() => {
    t.value = withTiming(1, { duration: DURATION, easing: Easing.linear });
  }, [t]);

  return (
    <>
      {pieces.map((p, i) => (
        <ConfettoView key={i} piece={p} t={t} x={x} y={y} />
      ))}
    </>
  );
}

function ConfettoView({ piece, t, x, y }: { piece: Piece; t: SharedValue<number>; x: number; y: number }) {
  const delayed = useSharedValue(0);
  useEffect(() => {
    delayed.value = withDelay(piece.delay, withTiming(1, { duration: 1 }));
  }, [delayed, piece.delay]);
  const style = useAnimatedStyle(() => {
    const s = (t.value * DURATION) / 1000; // seconds
    // Air drag eases the launch; gravity takes over; a flutter swings pieces sideways as they fall.
    const drag = 1 - Math.min(0.72, s * 0.42);
    const fall = Math.max(0, s - 0.25);
    const px = piece.vx * s * drag + Math.sin(s * piece.swaySpeed) * piece.sway * Math.min(1, s * 2);
    const py = piece.vy * s * drag + 0.5 * GRAVITY * s * s - fall * 40;
    const flip = piece.shape === "dot" || piece.shape === "flame" ? 1 : 0.35 + 0.65 * Math.abs(Math.cos(s * 8 + piece.spin));
    return {
      opacity: delayed.value * (t.value < 0.78 ? 1 : 1 - (t.value - 0.78) / 0.22),
      transform: [{ translateX: px }, { translateY: py }, { rotate: `${piece.shape === "flame" ? Math.sin(s * 6) * 25 : piece.spin * s}deg` }, { scaleY: flip }],
    };
  });
  const dims =
    piece.shape === "streamer"
      ? { width: 3.5, height: piece.size + 6, borderRadius: 2 }
      : piece.shape === "dot"
        ? { width: piece.size * 0.7, height: piece.size * 0.7, borderRadius: 99 }
        : piece.shape === "flame"
          ? { width: piece.size + 2, height: piece.size + 2 }
          : { width: piece.size, height: piece.size * 0.55, borderRadius: 1.5 };
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x - dims.width / 2,
          top: y - dims.height / 2,
          ...dims,
          backgroundColor: piece.shape === "flame" ? "transparent" : piece.color,
        },
        style,
      ]}
    >
      {piece.shape === "flame" ? (
        <Svg width={dims.width} height={dims.height} viewBox={FLAME_VIEWBOX} aria-hidden>
          <Path d={FLAME_PATH} fill={piece.color} />
        </Svg>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // "clip" (web) can't be scrolled by code the way "hidden" can.
  clip: (Platform.OS === "web" ? { overflow: "clip" } : { overflow: "hidden" }) as ViewStyle,
});
