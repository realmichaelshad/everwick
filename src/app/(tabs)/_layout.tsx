import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { TabBar } from "@/components/navigation/TabBar";
import { useStore } from "@/data/store";
import { useTheme } from "@/theme";

export default function TabsLayout() {
  const { status, state } = useStore();
  const { colors } = useTheme();

  // First launch on this device: show onboarding before the tabs. The tabs stay
  // mounted (swapping the navigator for a <Redirect> while it is live makes React
  // Navigation drop a route-names update) and a canvas cover hides them meanwhile.
  const needsOnboarding = status === "ready" && !state.onboarded;
  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding]);

  return (
    <View style={styles.fill}>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        // Native: tab scenes shift sideways. Web: a cross-fade, so an inactive scene never rests
        // offset beside the column (a translated scene there could be scrolled into view).
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas }, animation: Platform.OS === "web" ? "fade" : "shift" }}
      >
        <Tabs.Screen name="index" options={{ title: "Today" }} />
        <Tabs.Screen name="progress" options={{ title: "Progress" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>
      {needsOnboarding ? <View aria-hidden style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
