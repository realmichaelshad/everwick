import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogoMark } from "@/components/brand/Logo";
import { OnboardingBackdrop } from "@/components/onboarding/OnboardingBackdrop";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Screen } from "@/components/ui/Screen";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateViews";
import { useStore } from "@/data/store";
import { layout, radius, space } from "@/theme";

/**
 * Onboarding (3 steps): welcome + name, goals, reminder times. Shown on first
 * launch (the tabs layout redirects here while state.onboarded is false).
 * E2E contract: testIDs screen-onboarding, onboarding-next, onboarding-finish, onboarding-skip.
 */
export default function OnboardingScreen() {
  const { status, actions } = useStore();
  const insets = useSafeAreaInsets();
  const ready = status === "ready";
  return (
    <Screen
      testID="screen-onboarding"
      title="Welcome to Everwick"
      scroll={false}
      backdrop={ready ? "none" : <OnboardingBackdrop />}
      contentStyle={[styles.content, ready ? null : { paddingTop: insets.top + space[2] }]}
    >
      {ready ? (
        <OnboardingFlow />
      ) : status === "error" ? (
        <View style={styles.center}>
          <ErrorState onRetry={actions.retry} />
        </View>
      ) : (
        <SkeletonGroup label="Getting Everwick ready" style={styles.loading}>
          <View style={styles.loadingTop}>
            <LogoMark size={26} />
          </View>
          <View style={styles.loadingArt}>
            <Skeleton width={220} height={220} radius={110} />
          </View>
          <Skeleton width={110} height={12} />
          <Skeleton width="86%" height={30} radius={radius.xs} />
          <Skeleton width="64%" height={30} radius={radius.xs} />
          <Skeleton width="92%" height={14} />
          <View style={styles.flex} />
          <Skeleton width="100%" height={56} radius={radius.pill} />
        </SkeletonGroup>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0 },
  center: { flex: 1, justifyContent: "center", paddingHorizontal: layout.gutter },
  loading: { flex: 1, paddingHorizontal: layout.gutter, paddingBottom: space[6], gap: space[3] },
  loadingTop: { height: 56, justifyContent: "center" },
  loadingArt: { alignItems: "center", paddingVertical: space[4] },
  flex: { flex: 1 },
});
