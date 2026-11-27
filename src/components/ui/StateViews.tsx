import CircleAlert from "lucide-react-native/icons/circle-alert";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { ArtStage } from "@/components/illustrations/ArtGlow";
import { Illustration } from "@/components/illustrations/Illustration";
import { space, useTheme } from "@/theme";

import { Button, type ButtonProps } from "./Button";
import { Dialog } from "./Dialog";
import { Text } from "./Text";

/** Default art size in empty, error and not-found states. */
const ART = 196;

export interface EmptyStateProps {
  title: string;
  body: string;
  /** Illustration; defaults to the unlit candle (empty-habits). Seated on a warm glow either way. */
  art?: ReactNode;
  /** Size of `art` (for the glow behind it). Default 196. */
  artSize?: number;
  action?: Pick<ButtonProps, "label" | "onPress" | "icon">;
  secondaryAction?: Pick<ButtonProps, "label" | "onPress" | "icon">;
  /** Extra content under the actions (e.g. suggestion chips). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Designed empty state: illustration on its glow, friendly title, one clear next step. */
export function EmptyState({ title, body, art, artSize = ART, action, secondaryAction, children, style }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <ArtStage size={artSize}>{art ?? <Illustration slot="empty-habits" size={artSize} />}</ArtStage>
      <View style={styles.texts}>
        <Text variant="display" align="center" heading>
          {title}
        </Text>
        <Text variant="body" tone="muted" align="center">
          {body}
        </Text>
      </View>
      {action || secondaryAction ? (
        <View style={styles.actions}>
          {action ? <Button {...action} size="lg" style={styles.centered} /> : null}
          {secondaryAction ? <Button {...secondaryAction} variant="ghost" style={styles.centered} /> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export interface ErrorStateProps {
  title?: string;
  body?: string;
  onRetry: () => void;
  retryLabel?: string;
  /** Extra actions under Retry. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Error with retry (e.g. the on-device storage could not be read): the unlit candle with an alert badge. */
export function ErrorState({
  title = "Couldn't open your habits",
  body = "Your history is stored on this phone and nothing was lost. Give it another try.",
  onRetry,
  retryLabel = "Try again",
  children,
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="alert">
      <ArtStage size={ART}>
        <Illustration slot="empty-habits" size={ART} />
        <AlertBadge />
      </ArtStage>
      <View style={styles.texts}>
        <Text variant="display" align="center" heading>
          {title}
        </Text>
        <Text variant="body" tone="muted" align="center">
          {body}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button label={retryLabel} icon={RotateCcw} size="lg" onPress={onRetry} style={styles.centered} />
        {children}
      </View>
    </View>
  );
}

/** A small red alert badge pinned beside the candle's wick. */
function AlertBadge() {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.canvas }]} aria-hidden>
      <CircleAlert size={22} color="#FFFFFF" strokeWidth={2.6} />
    </View>
  );
}

/**
 * The storage error shared by Today, Progress and Profile: Retry first; the
 * way out ("start fresh with demo data") asks before it replaces anything.
 */
export function StorageErrorState({ title, onRetry, onStartFresh, style }: { title?: string; onRetry: () => void; onStartFresh: () => void; style?: StyleProp<ViewStyle> }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <ErrorState title={title} onRetry={onRetry} style={style}>
        <Button label="Start fresh with demo data" variant="ghost" onPress={() => setConfirm(true)} style={styles.centered} />
      </ErrorState>
      <Dialog
        visible={confirm}
        onClose={() => setConfirm(false)}
        icon={RotateCcw}
        tone="danger"
        title="Start fresh?"
        message="This replaces what's stored on this device with the 60-day demo history. Try again first if you can."
        confirmLabel="Start fresh"
        cancelLabel="Keep trying"
        onConfirm={onStartFresh}
      />
    </>
  );
}

/**
 * The 404 art: the unlit candle with a thin curl of smoke drifting up from
 * its wick ("this page burned out"). Still under reduced motion.
 */
export function BurnedOutArt({ size = ART }: { size?: number }) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, false);
    return () => cancelAnimation(t);
  }, [reduced, t]);
  const wisp = useAnimatedStyle(() => ({
    opacity: reduced ? 0.7 : Math.sin(t.value * Math.PI) * 0.85,
    transform: [{ translateY: -t.value * size * 0.06 }, { scaleY: 0.9 + t.value * 0.2 }],
  }));
  // The wick tip sits at about (40%, 24%) of the candle art.
  const w = size * 0.18;
  const h = size * 0.26;
  return (
    <View style={{ width: size, height: size }}>
      <Illustration slot="empty-habits" size={size} />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: size * 0.4 - w / 2, top: size * 0.235 - h, width: w, height: h }, wisp]}>
        <Svg width={w} height={h} viewBox="0 0 36 52" aria-hidden>
          <Path d="M18 52 C 10 44 26 38 18 30 C 10 22 26 16 19 6" stroke={isDark ? "rgba(255,240,230,0.55)" : colors.inkSubtle} strokeOpacity={isDark ? 1 : 0.45} strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M22 40 C 28 34 18 28 24 20" stroke={isDark ? "rgba(255,240,230,0.35)" : colors.inkSubtle} strokeOpacity={isDark ? 1 : 0.3} strokeWidth={2} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: space[5], paddingHorizontal: space[4], paddingVertical: space[6] },
  texts: { gap: space[2], maxWidth: 320 },
  actions: { alignItems: "center", gap: space[1] },
  centered: { alignSelf: "center" },
  badge: { position: "absolute", left: ART * 0.4 + 14, top: ART * 0.1, width: 40, height: 40, borderRadius: 20, borderWidth: 3, alignItems: "center", justifyContent: "center" },
});
