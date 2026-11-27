import { router } from "expo-router";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Illustration } from "@/components/illustrations/Illustration";
import { useEscapeToClose } from "@/components/system/useEscapeToClose";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/StateViews";
import { useStore } from "@/data/store";
import { radius, space, useTheme } from "@/theme";

export interface FormStateGateProps {
  testID: string;
  title: string;
  /** The habit to edit doesn't exist (deleted, or a stale link). */
  missing?: boolean;
  /** Rendered once the store is ready. A function, so the form mounts only then (its defaults read the store). */
  children: () => ReactNode;
}

/**
 * Loading, error and "habit is gone" states for the Add / Edit modals, so the
 * form itself only ever mounts with real data.
 */
export function FormStateGate({ testID, title, missing, children }: FormStateGateProps) {
  const { status, actions } = useStore();
  const ready = status === "ready" && !missing;
  useEscapeToClose(() => {
    if (ready) return; // the form handles Escape itself (with its discard check)
    if (router.canGoBack()) router.back();
    else router.replace("/");
  });
  if (ready) return <>{children()}</>;
  return (
    <Screen testID={testID} title={title} header={<ScreenHeader title={title} leading="close" />} backdrop="none">
      {status === "loading" ? (
        <FormSkeleton />
      ) : status === "error" ? (
        <ErrorState onRetry={actions.retry} style={styles.state} />
      ) : (
        <EmptyState
          style={styles.state}
          art={<Illustration slot="empty-habits" size={188} />}
          title="This habit is gone"
          body="It may have been deleted. Your other habits and their streaks are right where you left them."
          action={{ label: "Back to Today", icon: ArrowLeft, onPress: () => router.replace("/") }}
        />
      )}
    </Screen>
  );
}

function FormSkeleton() {
  const { colors, isDark } = useTheme();
  const card = { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: isDark ? 1 : 0 };
  return (
    <SkeletonGroup label="Loading the form" style={styles.wrap}>
      <View style={[styles.card, styles.row, card]}>
        <Skeleton width={52} height={52} radius={radius.md} />
        <View style={styles.lines}>
          <Skeleton width="30%" height={10} />
          <Skeleton width="65%" height={16} />
          <Skeleton width="45%" height={11} />
        </View>
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.card, card]}>
          <Skeleton width="25%" height={11} />
          <Skeleton width="100%" height={52} radius={radius.md} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  state: { paddingTop: space[10] },
  wrap: { gap: space[5], paddingTop: space[2] },
  card: { padding: space[4], borderRadius: radius.card, gap: space[3] },
  row: { flexDirection: "row", alignItems: "center" },
  lines: { flex: 1, gap: space[2] },
});
