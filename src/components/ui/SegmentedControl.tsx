import { useEffect, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, withSpring } from "react-native-reanimated";

import { haptics } from "@/lib/haptics";
import { elevation, fonts, motion, radius, space, useTheme } from "@/theme";

import { PressableScale } from "./Pressable";
import { Text } from "./Text";
import { useRovingFocus } from "./useRovingFocus";

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group, e.g. "Chart range". */
  label: string;
}

/**
 * Two to four options with a sliding thumb (Week / Month, Every day /
 * Weekdays / Weekends / Custom). Segments size to their labels (each takes
 * its label's width plus an equal share of the spare room), so a longer
 * label never wraps while short ones float in wide slots; the thumb springs
 * to the measured position and width of the selected segment. The selected
 * label turns bold without reflowing: every label reserves its bold width
 * with an invisible bold copy. The thumb is a raised token (white with a
 * shadow by day, a lifted plum with a hairline by night), so the choice reads
 * in both themes. Keyboard: one tab stop, arrow keys switch.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, label }: SegmentedControlProps<T>) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const [frames, setFrames] = useState<Record<number, { x: number; width: number }>>({});
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const frame = frames[index];
  // The first measurement places the thumb without a spring (no slide-in on mount).
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!frame || settled) return;
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, [frame, settled]);
  const roving = useRovingFocus({
    count: options.length,
    active: index,
    onMove: (i) => {
      haptics.selection();
      onChange(options[i].value);
    },
  });

  const thumb = useAnimatedStyle(() => {
    if (!frame) return { opacity: 0 };
    const x = frame.x - TRACK_PAD;
    const still = reduced || !settled;
    return {
      opacity: 1,
      width: still ? frame.width : withSpring(frame.width, motion.spring.gentle),
      transform: [{ translateX: still ? x : withSpring(x, motion.spring.gentle) }],
    };
  }, [frame, reduced, settled]);

  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={[styles.track, { backgroundColor: colors.segmentTrack }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.thumb, { backgroundColor: colors.segmentThumb, borderColor: colors.segmentThumbBorder }, elevation("card", colors, isDark), thumb]}
      />
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            // react-native-web maps aria-selected (not accessibilityState) to the DOM.
            aria-selected={selected}
            accessibilityLabel={o.label}
            {...roving(i)}
            pressScale={1}
            onLayout={(e: LayoutChangeEvent) => {
              const { x, width } = e.nativeEvent.layout;
              setFrames((prev) => (prev[i]?.x === x && prev[i]?.width === width ? prev : { ...prev, [i]: { x, width } }));
            }}
            onPress={() => {
              if (!selected) haptics.selection();
              onChange(o.value);
            }}
            style={styles.option}
          >
            <View aria-hidden>
              {/* Reserves the bold width so selecting never reflows the row. */}
              <Text variant="caption" align="center" noWidow={false} style={[styles.selectedLabel, styles.ghost]}>
                {o.label}
              </Text>
              <Text variant="caption" tone={selected ? "default" : "muted"} align="center" noWidow={false} style={[styles.label, selected ? styles.selectedLabel : null]}>
                {o.label}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const TRACK_PAD = 4;

const styles = StyleSheet.create({
  // minHeight (not height) so labels can wrap at large text sizes instead of overlapping.
  track: { flexDirection: "row", borderRadius: radius.pill, padding: TRACK_PAD, minHeight: 44 },
  thumb: { position: "absolute", top: TRACK_PAD, bottom: TRACK_PAD, left: TRACK_PAD, borderRadius: radius.pill, borderWidth: 1 },
  selectedLabel: { fontFamily: fonts.extrabold },
  ghost: { opacity: 0 },
  label: { position: "absolute", left: 0, right: 0, top: 0 },
  // Grow from the label's own width: long labels get the room they need, spare room is shared equally.
  option: { flexGrow: 1, flexShrink: 1, flexBasis: "auto", alignItems: "center", justifyContent: "center", paddingHorizontal: space[2], paddingVertical: space[1.5], minHeight: 36 },
});
