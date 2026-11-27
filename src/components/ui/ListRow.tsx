import type { LucideIcon } from "lucide-react-native";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";

import { haptics } from "@/lib/haptics";
import { elevation, layout, motion, radius, space, useTheme } from "@/theme";

import { PressableScale } from "./Pressable";
import { Text } from "./Text";

export interface ListRowProps {
  label: string;
  /** Secondary line under the label. */
  description?: string;
  /** Right-aligned value text ("7:30 AM", "On"). */
  value?: string;
  icon?: LucideIcon;
  /** Icon tile colors (defaults to accent soft / accent text). */
  iconBg?: string;
  iconColor?: string;
  /** Custom right element (Switch, Badge). Replaces the chevron. */
  right?: ReactNode;
  onPress?: () => void;
  /** Shows the chevron when pressable and no `right` is given. */
  chevron?: boolean;
  tone?: "default" | "danger";
  /**
   * Inactive row (e.g. while an export runs, or settings that only apply when a
   * master switch is on): quieter colors that stay AA, and presses are ignored.
   * Pass `disabled` to a Switch in `right` as well.
   */
  disabled?: boolean;
  /** Spoken after the name. Defaults to the description. */
  accessibilityHint?: string;
}

/**
 * Settings-style row. Group rows with <ListGroup>.
 *
 * A pressable row uses the stretched-button pattern: the visuals sit in a view
 * hidden from assistive tech, and an overlay button carries the name ("label,
 * value") with the description as its hint. The spoken name then never
 * contradicts the visible text (WCAG 2.5.3, axe label-content-name-mismatch).
 */
export function ListRow({ label, description, value, icon: Icon, iconBg, iconColor, right, onPress, chevron = true, tone = "default", disabled, accessibilityHint }: ListRowProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const press = useSharedValue(1);
  const pressed = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const danger = tone === "danger";
  const labelColor = disabled ? colors.inkMuted : danger ? colors.dangerText : colors.ink;
  const tileBg = disabled ? colors.surfaceMuted : (iconBg ?? (danger ? colors.dangerSoft : colors.accentSoft));
  const tileFg = disabled ? colors.inkSubtle : (iconColor ?? (danger ? colors.dangerText : colors.accentText));
  const content = (
    <>
      {Icon ? (
        <View aria-hidden style={[styles.tile, { backgroundColor: tileBg }]}>
          <Icon size={18} color={tileFg} strokeWidth={2.3} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text variant="bodyStrong" color={labelColor} numberOfLines={2}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone={disabled ? "subtle" : "muted"} numberOfLines={3}>
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="callout" tone="muted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right ??
        (onPress && chevron ? (
          <View aria-hidden>
            <ChevronRight size={18} color={colors.inkSubtle} strokeWidth={2.4} />
          </View>
        ) : null)}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <View>
      <Animated.View style={[styles.row, pressed]} aria-hidden pointerEvents="none">
        {content}
      </Animated.View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}, ${value}` : label}
        accessibilityHint={accessibilityHint ?? description}
        accessibilityState={{ disabled: !!disabled }}
        aria-disabled={disabled ? true : undefined}
        disabled={disabled}
        pressScale={1}
        onPressIn={() => {
          if (!reduced) press.value = withSpring(0.985, motion.spring.press);
        }}
        onPressOut={() => {
          press.value = withSpring(1, motion.spring.press);
        }}
        onPress={() => {
          haptics.light();
          onPress();
        }}
        style={styles.overlay}
      />
    </View>
  );
}

/** Rounded group of ListRows with hairline separators and an optional title. */
export function ListGroup({ title, children, footer }: { title?: string; children: ReactNode; footer?: string }) {
  const { colors, isDark } = useTheme();
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.group}>
      {title ? (
        <Text variant="overline" tone="subtle" heading level={2} style={styles.groupTitle}>
          {title}
        </Text>
      ) : null}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: isDark ? 1 : 0 },
          elevation("card", colors, isDark),
        ]}
      >
        {items.map((child, i) => (
          <Fragment key={child.key ?? i}>
            {i > 0 ? <View style={[styles.sep, { backgroundColor: colors.line }]} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text variant="caption" tone="subtle" style={styles.footer}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 60, paddingHorizontal: layout.cardPadding, paddingVertical: space[3] },
  tile: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, gap: 2 },
  overlay: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: radius.md },
  group: { gap: space[2] },
  groupTitle: { paddingHorizontal: space[1] },
  card: { borderRadius: radius.card, overflow: "hidden" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: layout.cardPadding + 36 + space[3] },
  footer: { paddingHorizontal: space[1] },
});
