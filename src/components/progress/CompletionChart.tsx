import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture, type PanGestureConfig, type TapGestureConfig } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Rect } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { describeBar, monthTicks, type ChartModel, type ProgressRange } from "@/data/progressSeries";
import type { Bar } from "@/data/stats";
import { withTouchAction } from "@/lib/gestures";
import { haptics } from "@/lib/haptics";
import { elevation, fonts, mix, radius, rgba, space, useTheme } from "@/theme";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Height of the bar area. */
const PLOT_H = 148;
/** Right-hand axis column (gridline labels and the average tag). */
const AXIS_W = 42;
/** Shortest bar drawn for a past day (so a 0% day is still visible). */
const STUB = 4;

/*
 * Motion is time-based with spring-shaped curves (an overshooting "back" ease
 * for heights, a soft ease-out for positions). It reads like a spring on
 * device and always settles on time, including in screenshot tooling that
 * freezes the clock and throttles animation frames.
 */
const GROW = { duration: 560, easing: Easing.out(Easing.back(1.15)) };
const SLIDE = { duration: 460, easing: Easing.out(Easing.cubic) };
const TRACK = { duration: 150, easing: Easing.out(Easing.cubic) };
/** Hint row out, then the scrub readout in (ms). */
const HANDOVER = { out: 90, in: 150 };

export interface CompletionChartProps {
  model: ChartModel;
  range: ProgressRange;
  /** Average completion of the range (0..1), drawn as the dashed line. */
  average: number;
  /** False when nothing was due in the range yet. */
  hasData: boolean;
  /** One-sentence summary for screen readers. */
  summary: string;
  weekStartsOn: 0 | 1;
}

interface BarTarget {
  x: number;
  w: number;
  h: number;
  opacity: number;
}

/**
 * Daily completion as bars (react-native-svg, animated with Reanimated).
 * One calm ember ramp: the rate is the height, and the color warms from
 * amber (a light day) to ember (a strong one). A perfect day is full-height
 * ember with a soft glow and a bright "day dot" cap, never a different hue,
 * so the chart never reads as red/green pass and fail.
 *
 * - today, while habits are still open, is drawn as progress so far inside a
 *   dashed outline of the whole day (like the days still to come), so it never
 *   reads as a bad day under the average line;
 * - bars grow from the baseline with a 30 ms stagger on mount;
 * - Week <-> Month morphs: days both views share slide and resize, the others
 *   fade in or out, heights spring to their new values;
 * - scrub: drag across the plot (or tap a bar) to snap a highlight to the
 *   nearest day; a tooltip follows with the date, "5 of 6 habits" and the %.
 *   Haptic tick on every change; the selection stays after release.
 * Keyboard (web): the plot is a slider; Left/Right/Home/End move, Escape clears.
 */
export function CompletionChart({ model, range, average, hasData, summary, weekStartsOn }: CompletionChartProps) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(-1);
  // The first render grows every bar from the baseline; later changes morph.
  const grown = useRef(false);

  const bars = range === "week" ? model.week : model.month;
  const barsW = Math.max(0, width - AXIS_W);
  const slotW = bars.length ? barsW / bars.length : 0;
  const barW = range === "week" ? Math.min(30, slotW * 0.56) : Math.max(3, slotW * 0.62);
  const lastSelectable = useMemo(() => {
    let last = -1;
    bars.forEach((b, i) => {
      if (!b.future) last = i;
    });
    return last;
  }, [bars]);
  const todayIndex = bars.findIndex((b) => b.isToday);

  // Shared values the scrub worklets read.
  const sel = useSharedValue(-1);
  const slot = useSharedValue(0);
  const maxIndex = useSharedValue(0);
  const tipWidth = useSharedValue(150);
  const plotWidth = useSharedValue(0);
  useEffect(() => {
    slot.value = slotW;
    maxIndex.value = lastSelectable;
    plotWidth.value = width;
  }, [lastSelectable, maxIndex, plotWidth, slot, slotW, width]);

  // A new range clears the selection.
  useEffect(() => {
    sel.value = -1;
    setSelected(-1);
  }, [range, sel]);

  useEffect(() => {
    if (width > 0) grown.current = true;
  }, [width]);

  const onSelect = useCallback((index: number) => {
    setSelected(index);
    if (index >= 0) haptics.selection();
  }, []);

  const pick = useCallback(
    (index: number) => {
      sel.value = index;
      onSelect(index);
    },
    [onSelect, sel],
  );

  // Web: vertical page scrolling stays with the browser on touch screens; horizontal drags scrub.
  const pan = usePanGesture(
    withTouchAction<PanGestureConfig>({
      activeOffsetX: [-6, 6],
      failOffsetY: [-12, 12],
      onActivate: (e) => {
        "worklet";
        if (slot.value <= 0 || maxIndex.value < 0) return;
        const i = Math.max(0, Math.min(maxIndex.value, Math.floor(e.x / slot.value)));
        if (i !== sel.value) {
          sel.value = i;
          scheduleOnRN(onSelect, i);
        }
      },
      onUpdate: (e) => {
        "worklet";
        if (slot.value <= 0 || maxIndex.value < 0) return;
        const i = Math.max(0, Math.min(maxIndex.value, Math.floor(e.x / slot.value)));
        if (i !== sel.value) {
          sel.value = i;
          scheduleOnRN(onSelect, i);
        }
      },
    }, "pan-y"),
  );
  const tap = useTapGesture(
    withTouchAction<TapGestureConfig>({
      onActivate: (e) => {
        "worklet";
        if (slot.value <= 0 || maxIndex.value < 0) return;
        const i = Math.max(0, Math.min(maxIndex.value, Math.floor(e.x / slot.value)));
        // Tapping the selected bar again clears the selection.
        const next = i === sel.value ? -1 : i;
        sel.value = next;
        scheduleOnRN(onSelect, next);
      },
    }, "pan-y"),
  );
  const gesture = useCompetingGestures(pan, tap);

  const move = useCallback(
    (key: string) => {
      if (lastSelectable < 0) return false;
      const start = todayIndex >= 0 ? todayIndex : lastSelectable;
      const from = selected;
      let next: number;
      // The first arrow press selects today; the next ones walk the days.
      if ((key === "ArrowLeft" || key === "ArrowRight") && from < 0) next = start;
      else if (key === "ArrowLeft") next = Math.max(0, from - 1);
      else if (key === "ArrowRight") next = Math.min(lastSelectable, from + 1);
      else if (key === "Home") next = 0;
      else if (key === "End") next = lastSelectable;
      else if (key === "Escape") next = -1;
      else return false;
      pick(next);
      return true;
    },
    [lastSelectable, pick, selected, todayIndex],
  );

  // Slot geometry for every day in either view, keyed by day so the views morph.
  const targets = useMemo(() => {
    const out = new Map<string, BarTarget>();
    for (const s of model.slots) {
      const entry = range === "week" ? s.week : s.month;
      if (entry) {
        const b = entry.bar;
        const h = b.future ? PLOT_H : b.scheduled === 0 ? STUB : Math.max(STUB, b.rate * PLOT_H);
        out.set(s.key, { x: entry.index * slotW + (slotW - barW) / 2, w: barW, h, opacity: 1 });
      } else {
        // Not in this view: collapse toward the edge it leaves from.
        const leftSide = range === "week";
        out.set(s.key, { x: leftSide ? 0 : barsW, w: 0, h: 0, opacity: 0 });
      }
    }
    return out;
  }, [barW, barsW, model.slots, range, slotW]);

  // Amber for a light day warming to ember for a strong one (one hue family, no stoplight).
  // One flame ramp: a light day is a pale flame, a strong day the full flame color.
  const amber = mix(colors.track, colors.success, 0.42);
  const ember = colors.success;
  const fillFor = (b: Bar | null) => {
    if (!b || b.future) return "none";
    if (b.scheduled === 0 || b.rate === 0) return colors.track;
    if (b.rate >= 1) return ember;
    return mix(amber, ember, Math.max(0, (b.rate - 0.25) / 0.75) * 0.85);
  };

  const selectedBar = selected >= 0 ? bars[selected] : null;
  const described = selectedBar ? describeBar(selectedBar) : null;
  const sliderValue = selected >= 0 ? selected : Math.max(0, todayIndex);
  const sliderText = bars[sliderValue] ? describeBar(bars[sliderValue]).spoken : "";

  // Selection column, guide and tooltip follow the selected bar.
  const column = useAnimatedStyle(() => {
    const i = sel.value;
    const x = i * slot.value;
    return {
      opacity: withTiming(i >= 0 ? 1 : 0, { duration: reduced ? 0 : 140 }),
      width: slot.value,
      transform: [{ translateX: reduced ? x : withTiming(x, TRACK) }],
    };
  });
  // The hint row and the readout hand over one after the other (never both half-visible on top of each other).
  const tooltip = useAnimatedStyle(() => {
    const i = sel.value;
    const center = i * slot.value + slot.value / 2;
    const x = Math.max(0, Math.min(plotWidth.value - tipWidth.value, center - tipWidth.value / 2));
    return {
      opacity: reduced ? (i >= 0 ? 1 : 0) : i >= 0 ? withDelay(HANDOVER.out, withTiming(1, { duration: HANDOVER.in })) : withTiming(0, { duration: HANDOVER.out }),
      transform: [{ translateX: reduced ? x : withTiming(x, TRACK) }],
    };
  });
  const guide = useAnimatedStyle(() => {
    const i = sel.value;
    const center = i * slot.value + slot.value / 2;
    return {
      opacity: withTiming(i >= 0 ? 1 : 0, { duration: reduced ? 0 : 140 }),
      transform: [{ translateX: reduced ? center : withTiming(center, TRACK) }],
    };
  });
  const header = useAnimatedStyle(() => {
    const on = sel.value >= 0;
    if (reduced) return { opacity: on ? 0 : 1 };
    return { opacity: on ? withTiming(0, { duration: HANDOVER.out }) : withDelay(HANDOVER.out, withTiming(1, { duration: HANDOVER.in })) };
  });

  // The average line glides to its new height when the range changes.
  const avgY = useSharedValue(PLOT_H * (1 - average));
  useEffect(() => {
    const y = PLOT_H * (1 - average);
    avgY.value = reduced ? y : withTiming(y, SLIDE);
  }, [average, avgY, reduced]);
  const avgLine = useAnimatedStyle(() => ({ transform: [{ translateY: avgY.value }] }));

  const ticks = useMemo(() => monthTicks(model.month, weekStartsOn), [model.month, weekStartsOn]);
  const weekLabels = useAnimatedStyle(() => ({ opacity: withTiming(range === "week" ? 1 : 0, { duration: reduced ? 0 : 200 }) }), [range, reduced]);
  const monthLabels = useAnimatedStyle(() => ({ opacity: withTiming(range === "month" ? 1 : 0, { duration: reduced ? 0 : 200 }) }), [range, reduced]);

  const avgPct = Math.round(average * 100);
  const hideGrid = (level: number) => hasData && Math.abs(average - level) < 0.14;

  const keyboard =
    Platform.OS === "web"
      ? {
          onKeyDown: (e: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
            if (move(e.nativeEvent.key)) e.preventDefault?.();
          },
        }
      : {};

  return (
    <Card padding={space[4]} style={styles.card}>
      <View style={styles.top}>
        {/* The title stays put; only the hint row below it hands over to the scrub readout. */}
        <Text variant="headline" heading level={2}>
          Daily completion
        </Text>
        <View style={styles.headerSlot}>
          <Animated.View style={[styles.header, header]}>
            {/* One hint instead of a legend: the average line carries its own tag and today's bar reads as unfinished. */}
            <View style={styles.flex}>
              <Text variant="caption" tone="subtle">
                {hasData ? "Tap a bar to see that day" : "Your first check-ins will show here"}
              </Text>
            </View>
          </Animated.View>
          {/* The tooltip doubles as the live region that announces the scrubbed day. */}
          <Animated.View
            pointerEvents="none"
            aria-live="polite"
            onLayout={(e: LayoutChangeEvent) => {
              tipWidth.value = e.nativeEvent.layout.width;
            }}
            style={[
              styles.tooltip,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.line, borderWidth: isDark ? 1 : 0 },
              elevation("raised", colors, isDark),
              tooltip,
            ]}
          >
            {described ? (
              <>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {described.date}
                </Text>
                <View style={styles.tipRow}>
                  {described.value ? (
                    <Text variant="title" tabular color={selectedBar && selectedBar.rate >= 1 ? colors.successText : colors.ink}>
                      {described.value}
                    </Text>
                  ) : null}
                  <Text variant="caption" tone="subtle" numberOfLines={1}>
                    {described.detail}
                  </Text>
                </View>
              </>
            ) : (
              <Text variant="caption"> </Text>
            )}
          </Animated.View>
        </View>
      </View>

      <View style={styles.plotWrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {/* Gridlines and the axis column. */}
        <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}>
          {[1, 0.5, 0].map((level) => (
            <View key={level} style={[styles.grid, { top: PLOT_H * (1 - level), right: AXIS_W - 6, borderColor: level === 0 ? colors.lineStrong : colors.line, borderStyle: level === 0 ? "solid" : "dashed" }]}>
              {!hideGrid(level) ? (
                <Text variant="caption" tone="subtle" maxFontSizeMultiplier={1.15} style={[styles.axisLabel, { right: -(AXIS_W - 6) }]} tabular>
                  {Math.round(level * 100)}%
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        <Animated.View pointerEvents="none" style={[styles.column, { backgroundColor: rgba(colors.ink, isDark ? 0.08 : 0.05) }, column]} />

        {/* pan-y: vertical page scrolling stays with the browser on touch screens; horizontal drags scrub. */}
        <GestureDetector gesture={gesture} touchAction="pan-y">
          <Animated.View
            role="slider"
            aria-label={`${summary}. Use the left and right arrow keys to read each day.`}
            aria-valuemin={0}
            aria-valuemax={Math.max(0, lastSelectable)}
            aria-valuenow={sliderValue}
            aria-valuetext={sliderText}
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === "increment") move("ArrowRight");
              if (e.nativeEvent.actionName === "decrement") move("ArrowLeft");
            }}
            focusable
            {...keyboard}
            style={[styles.plot, { width: barsW }]}
          >
            {width > 0 ? (
              <Svg width={barsW} height={PLOT_H} aria-hidden>
                {model.slots.map((s, i) => {
                  const entry = range === "week" ? s.week : s.month;
                  const target = targets.get(s.key)!;
                  // Arriving bars stagger left to right; leaving bars go at once.
                  const delay = !grown.current ? (entry ? entry.index : i) * 30 : entry ? entry.index * (range === "month" ? 10 : 24) : 0;
                  return (
                    <ChartBar
                      key={s.key}
                      target={target}
                      fill={fillFor(entry?.bar ?? null)}
                      perfect={!!entry && !entry.bar.future && entry.bar.scheduled > 0 && entry.bar.rate >= 1}
                      glow={isDark ? null : rgba(ember, 0.16)}
                      cap={colors.flameCore}
                      ghost={!!entry?.bar.future}
                      inProgress={!!entry && entry.bar.isToday && !entry.bar.future && entry.bar.scheduled > 0 && entry.bar.rate < 1}
                      ghostColor={colors.lineStrong}
                      index={entry ? entry.index : -2}
                      selected={sel}
                      delay={delay}
                      reduced={reduced}
                      grow={width > 0}
                    />
                  );
                })}
              </Svg>
            ) : null}
          </Animated.View>
        </GestureDetector>

        {/* Average line and tag. */}
        {hasData ? (
          <Animated.View pointerEvents="none" aria-hidden style={[styles.avg, avgLine]}>
            <View style={[styles.avgLine, { borderColor: colors.inkMuted, right: AXIS_W - 2 }]} />
            <View style={[styles.avgTag, { backgroundColor: colors.ink }]}>
              <Text variant="caption" color={colors.inkInverse} tabular maxFontSizeMultiplier={1.15} style={styles.avgText}>
                {avgPct}%
              </Text>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View pointerEvents="none" style={[styles.guide, { backgroundColor: colors.inkSubtle }, guide]} />
      </View>

      {/* Axis labels: weekday letters (Week) or week ticks (Month), crossfading. */}
      <View style={styles.labels} aria-hidden>
        <Animated.View style={[StyleSheet.absoluteFill, weekLabels]}>
          {slotW > 0
            ? model.week.map((b, i) => (
                <Text
                  key={b.key}
                  variant="caption"
                  tone={b.isToday ? "accent" : b.future ? "subtle" : "muted"}
                  align="center"
                  maxFontSizeMultiplier={1.15}
                  style={[styles.label, { left: i * (barsW / 7), width: barsW / 7 }, b.isToday ? styles.today : null]}
                >
                  {b.label}
                </Text>
              ))
            : null}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, monthLabels]}>
          {slotW > 0
            ? ticks.map((t) => {
                const step = barsW / model.month.length;
                const center = t.index * step + step / 2;
                return (
                  <View key={t.label} style={[styles.tick, { left: center - 30 }]}>
                    <View style={[styles.tickMark, { backgroundColor: colors.lineStrong }]} />
                    <Text variant="caption" tone="muted" align="center" style={styles.tickText} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                      {t.label}
                    </Text>
                  </View>
                );
              })
            : null}
          {slotW > 0 ? (
            <View style={[styles.todayDot, { backgroundColor: colors.success, left: (model.month.length - 0.5) * (barsW / model.month.length) - 3 }]} />
          ) : null}
        </Animated.View>
      </View>
    </Card>
  );
}

interface ChartBarProps {
  target: BarTarget;
  fill: string;
  /** Every habit done that day: a soft glow (light theme) and a bright cap. */
  perfect: boolean;
  /** Halo color, or null for none (on the dark card a translucent halo turns brown, so the cap carries it). */
  glow: string | null;
  cap: string;
  ghost: boolean;
  /** Today, not finished yet: the bar so far inside a dashed outline of the full day. */
  inProgress: boolean;
  ghostColor: string;
  /** Index in the current view (-2 when hidden in this view). */
  index: number;
  selected: SharedValue<number>;
  delay: number;
  reduced: boolean;
  /** Start growing (the plot has been measured). */
  grow: boolean;
}

function ChartBar({ target, fill, perfect, glow, cap, ghost, inProgress, ghostColor, index, selected, delay, reduced, grow }: ChartBarProps) {
  // Read at animation time only: a changed delay alone must not restart a running spring.
  const delayRef = useRef(delay);
  delayRef.current = delay;
  const x = useSharedValue(target.x);
  const w = useSharedValue(target.w);
  const h = useSharedValue(reduced ? target.h : 0);
  const o = useSharedValue(target.opacity);
  const dim = useSharedValue(1);

  useEffect(() => {
    if (!grow) return;
    if (reduced) {
      x.value = target.x;
      w.value = target.w;
      h.value = target.h;
      o.value = target.opacity;
      return;
    }
    const delay = delayRef.current;
    x.value = withDelay(delay, withTiming(target.x, SLIDE));
    w.value = withDelay(delay, withTiming(target.w, SLIDE));
    h.value = withDelay(delay, withTiming(target.h, GROW));
    o.value = withDelay(delay, withTiming(target.opacity, { duration: 220 }));
  }, [grow, h, o, reduced, target.h, target.opacity, target.w, target.x, w, x]);

  useAnimatedReaction(
    () => selected.value,
    (s) => {
      const next = s >= 0 && s !== index ? 0.38 : 1;
      dim.value = reduced ? next : withTiming(next, { duration: 160 });
    },
    [index, reduced],
  );

  const props = useAnimatedProps(() => {
    // Clamp so the overshoot of a full bar never squares off its rounded top.
    const height = Math.min(PLOT_H, Math.max(0, h.value));
    const width = Math.max(0, w.value);
    return {
      x: x.value,
      width,
      y: PLOT_H - height,
      height,
      rx: Math.min(width / 2, 8),
      opacity: o.value * dim.value,
    };
  });

  // The glow is the bar grown by a few points; the cap is a small "day dot" near the top.
  const glowProps = useAnimatedProps(() => {
    const height = Math.min(PLOT_H, Math.max(0, h.value));
    const width = Math.max(0, w.value);
    const pad = Math.min(4, width * 0.35);
    return {
      x: x.value - pad,
      width: width + pad * 2,
      y: PLOT_H - height - pad,
      height: height + pad,
      rx: Math.min((width + pad * 2) / 2, 10),
      opacity: o.value * dim.value * (height > 8 ? 1 : 0),
    };
  });
  const capProps = useAnimatedProps(() => {
    const height = Math.min(PLOT_H, Math.max(0, h.value));
    const width = Math.max(0, w.value);
    const r = Math.max(1.2, Math.min(4, width * 0.2));
    return {
      cx: x.value + width / 2,
      cy: PLOT_H - height + Math.max(r + 2, width / 2),
      r,
      opacity: o.value * dim.value * (height > width + 4 ? 0.95 : 0),
    };
  });

  // The whole day's outline for today's in-progress bar (the same dashed frame as days still to come).
  const frameProps = useAnimatedProps(() => {
    const width = Math.max(0, w.value);
    return { x: x.value, width, y: 0, height: PLOT_H, rx: Math.min(width / 2, 8), opacity: o.value * dim.value };
  });

  if (ghost) return <AnimatedRect animatedProps={props} fill="none" stroke={ghostColor} strokeWidth={1.5} strokeDasharray="4 4" />;
  if (inProgress) {
    return (
      <>
        <AnimatedRect animatedProps={frameProps} fill="none" stroke={ghostColor} strokeWidth={1.5} strokeDasharray="4 4" />
        <AnimatedRect animatedProps={props} fill={fill} />
      </>
    );
  }
  return (
    <>
      {perfect && glow ? <AnimatedRect animatedProps={glowProps} fill={glow} /> : null}
      <AnimatedRect animatedProps={props} fill={fill} />
      {perfect ? <AnimatedCircle animatedProps={capProps} fill={cap} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3], borderRadius: radius.xl },
  top: { gap: space[1] },
  headerSlot: { minHeight: 52, justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: space[3] },
  flex: { flex: 1 },
  tooltip: {
    position: "absolute",
    left: 0,
    top: 0,
    minWidth: 132,
    paddingHorizontal: space[3],
    paddingVertical: space[1.5],
    borderRadius: radius.md,
  },
  tipRow: { flexDirection: "row", alignItems: "baseline", gap: space[2] },
  plotWrap: { height: PLOT_H, marginTop: space[2] },
  plot: { height: PLOT_H, cursor: "pointer" },
  grid: { position: "absolute", left: 0, borderTopWidth: 1 },
  axisLabel: { position: "absolute", top: -9, width: AXIS_W - 8, fontSize: 11, lineHeight: 16, textAlign: "right" },
  column: { position: "absolute", top: -6, bottom: -6, left: 0, borderRadius: radius.sm },
  avg: { position: "absolute", left: 0, right: 0, top: 0, height: 0 },
  avgLine: { position: "absolute", left: 0, top: 0, borderTopWidth: 1.5, borderStyle: "dashed" },
  avgTag: { position: "absolute", right: 0, top: -10, height: 20, minWidth: AXIS_W - 6, paddingHorizontal: 5, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  avgText: { fontSize: 11, lineHeight: 14 },
  guide: { position: "absolute", top: -20, width: 1.5, height: 14, marginLeft: -0.75, left: 0 },
  labels: { height: 22 },
  label: { position: "absolute", top: 2 },
  today: { fontFamily: fonts.extrabold },
  tick: { position: "absolute", top: 0, width: 60, alignItems: "center" },
  tickMark: { width: 1, height: 4, marginBottom: 2 },
  tickText: { fontSize: 11, lineHeight: 14 },
  todayDot: { position: "absolute", top: 2, width: 6, height: 6, borderRadius: 3 },
});
