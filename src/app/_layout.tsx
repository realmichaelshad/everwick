import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider as NavigationThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { PortalHost } from "@/components/system/Portal";
import { WebFrame } from "@/components/system/WebFrame";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { StoreProvider, useStore } from "@/data/store";
import { useReminderTaps } from "@/lib/reminders";
import { ThemeProvider, useTheme } from "@/theme";
import { FONT_MAP } from "@/theme/fonts";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_MAP);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <ThemedApp />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const { state } = useStore();
  return (
    <ThemeProvider preference={state.settings.theme}>
      <NavigationShell />
    </ThemeProvider>
  );
}

function NavigationShell() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (Platform.OS !== "web") SystemUI.setBackgroundColorAsync(colors.canvas).catch(() => undefined);
  }, [colors.canvas]);

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: colors.canvas, card: colors.surface, text: colors.ink, border: colors.line, primary: colors.accent },
    };
  }, [colors, isDark]);

  return (
    <NavigationThemeProvider value={navTheme}>
      <WebFrame>
        <PortalHost>
          <ToastProvider>
            <SaveErrorToast />
            <ReminderTapHandler />
            <StatusBar style={isDark ? "light" : "dark"} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.canvas },
                animation: "slide_from_right",
              }}
            >
              <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
              <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
              <Stack.Screen name="habit/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
              <Stack.Screen name="habit/[id]/index" />
              <Stack.Screen name="habit/[id]/edit" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
              <Stack.Screen name="pro" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </ToastProvider>
        </PortalHost>
      </WebFrame>
    </NavigationThemeProvider>
  );
}

/**
 * Writing to storage can fail (a full or blocked storage). Say so once per
 * failure, with Retry, instead of letting taps silently go unsaved.
 */
function SaveErrorToast() {
  const { saveError, actions } = useStore();
  const toast = useToast();
  const shown = useRef(false);
  useEffect(() => {
    if (!saveError) {
      shown.current = false;
      return;
    }
    if (shown.current) return;
    shown.current = true;
    toast.show({ message: "Couldn't save on this device. Your changes are kept for now.", tone: "danger", duration: 9000, action: { label: "Retry", onPress: actions.retrySave } });
  }, [actions.retrySave, saveError, toast]);
  return null;
}

/** Tapping a reminder opens that habit (also when the tap launched the app). */
function ReminderTapHandler() {
  const { status } = useStore();
  // Wait for the stored data, so the habit exists when its screen opens.
  useReminderTaps((habitId) => router.push({ pathname: "/habit/[id]", params: { id: habitId } }), status === "ready");
  return null;
}
