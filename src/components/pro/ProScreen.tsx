import { router } from "expo-router";
import Check from "lucide-react-native/icons/check";
import Eye from "lucide-react-native/icons/eye";
import Sparkles from "lucide-react-native/icons/sparkles";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { useEscapeToClose } from "@/components/system/useEscapeToClose";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateViews";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/data/store";
import { haptics } from "@/lib/haptics";
import { motion, radius, space, useTheme } from "@/theme";

import { PlanPicker, type PlanKey } from "./PlanPicker";
import { ProFeatures } from "./ProFeatures";
import { ProHero } from "./ProHero";

/**
 * Upgrade to Pro, clearly a demo: a "Demo · no purchase" badge stays in the
 * header, the prices are labelled as examples, and the only action turns on
 * a Pro preview. There is no payment UI of any kind.
 */
export function ProScreen() {
  const { status, state, actions } = useStore();
  const toast = useToast();
  const reduced = useReducedMotion();
  const [plan, setPlan] = useState<PlanKey>("yearly");
  const [confetti, setConfetti] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const active = state.proPreview;

  const turnOn = useCallback(() => {
    actions.setProPreview(true);
    haptics.celebrate();
    setConfetti((n) => n + 1);
    // Bring the hero (and its little hop) into view under the confetti.
    scrollRef.current?.scrollTo({ y: 0, animated: !reduced });
    toast.show({ message: "Pro preview is on. Nothing was charged.", tone: "success", icon: Sparkles });
  }, [actions, reduced, toast]);

  const turnOff = useCallback(() => {
    actions.setProPreview(false);
    toast.show({ message: "Pro preview is off", action: { label: "Undo", onPress: () => actions.setProPreview(true) } });
  }, [actions, toast]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/profile");
  }, []);
  useEscapeToClose(close);

  const ready = status === "ready";
  const footer = ready ? (
    <View style={styles.footer}>
      {active ? (
        <>
          <Button label="Done" icon={Check} size="lg" fullWidth onPress={close} />
        </>
      ) : (
        <Button
          label="Preview Pro features"
          icon={Eye}
          size="lg"
          fullWidth
          onPress={turnOn}
          accessibilityHint="Unlocks Pro features in this demo. Nothing is charged."
        />
      )}
      <Text variant="caption" tone="subtle" align="center">
        Everwick is a concept app. No payment is taken and nothing is charged.
      </Text>
    </View>
  ) : undefined;

  return (
    <Screen
      testID="screen-pro"
      title="Everwick Pro"
      backdrop="none"
      header={<ScreenHeader leading="close" fallbackHref="/profile" actions={<Badge label="Demo, no purchase" tone="accent" />} />}
      footer={footer}
      contentStyle={styles.content}
      scrollRef={scrollRef}
    >
      {status === "error" ? (
        <ErrorState onRetry={actions.retry} style={styles.error} />
      ) : (
        <View style={styles.stack}>
          <ProHero active={active} />
          {!ready ? (
            <SkeletonGroup label="Loading" style={styles.skeleton}>
              <Skeleton height={300} radius={radius.card} />
              <Skeleton height={136} radius={radius.lg} />
            </SkeletonGroup>
          ) : (
            <>
              <Animated.View entering={reduced ? undefined : FadeInDown.delay(80).springify().damping(18).stiffness(180)} style={styles.section}>
                <Text variant="overline" tone="subtle" heading level={2} style={styles.label}>
                  What you get
                </Text>
                <ProFeatures unlocked={active} />
              </Animated.View>
              {active ? (
                <Animated.View key="on" entering={reduced ? undefined : FadeIn.duration(motion.base)}>
                  <PreviewOn onTurnOff={turnOff} />
                </Animated.View>
              ) : (
                <Animated.View
                  key="plans"
                  entering={reduced ? undefined : FadeInDown.delay(80 + 6 * motion.stagger).springify().damping(18).stiffness(180)}
                  style={styles.section}
                >
                  <View style={styles.planHead}>
                    <Text variant="overline" tone="subtle" heading level={2}>
                      Choose a plan
                    </Text>
                    <Text variant="caption" tone="subtle">
                      Example prices
                    </Text>
                  </View>
                  <PlanPicker value={plan} onChange={setPlan} />
                </Animated.View>
              )}
            </>
          )}
        </View>
      )}
      <Confetti fire={confetti} origin={{ x: 0.5, y: 0.22 }} />
    </Screen>
  );
}

function PreviewOn({ onTurnOff }: { onTurnOff: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.on, { backgroundColor: colors.successSoft }]}>
      <View style={styles.onRow}>
        <View style={[styles.onIcon, { backgroundColor: colors.success }]} aria-hidden>
          <Check size={18} color={colors.surface} strokeWidth={3} />
        </View>
        <View style={styles.flex}>
          <Text variant="headline" color={colors.successText}>
            Pro preview is on
          </Text>
          <Text variant="callout" color={colors.successText}>
            Every Pro feature is unlocked in this demo. Nothing was charged.
          </Text>
        </View>
      </View>
      <Button label="Turn off preview" variant="secondary" onPress={onTurnOff} style={styles.offButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2] },
  stack: { gap: space[7] },
  section: { gap: space[3] },
  label: { paddingHorizontal: space[1] },
  planHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: space[1] },
  footer: { gap: space[2] },
  error: { paddingTop: space[12] },
  skeleton: { gap: space[4] },
  on: { gap: space[3], padding: space[4], borderRadius: radius.lg },
  onRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  offButton: { marginLeft: 36 + space[3] },
  onIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
});
