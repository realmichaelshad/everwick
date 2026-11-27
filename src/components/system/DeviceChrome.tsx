import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

import { Text } from "@/components/ui/Text";
import { now } from "@/lib/clock";
import { fonts, useTheme } from "@/theme";

/** "5:40": the app clock (lib/clock, frozen in showcase captures), 12-hour, no AM/PM, like a phone's status bar. */
function statusTime(date: Date): string {
  const h = date.getHours() % 12 || 12;
  return `${h}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function useStatusTime(): string {
  const [time, setTime] = useState(() => statusTime(now()));
  useEffect(() => {
    const id = setInterval(() => setTime(statusTime(now())), 15_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export const DEVICE_INSETS = { top: 50, bottom: 30, left: 0, right: 0 } as const;

/**
 * Web-only showcase chrome (enabled with ?device=1): a generic phone status
 * bar (the app's own clock, signal, wifi, battery; no carrier, no platform
 * marks) and a home
 * indicator, plus matching safe-area insets so screens lay out like on a
 * real phone. Purely presentational.
 */
export function DeviceChrome({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const outer = useSafeAreaInsets();
  const ink = colors.ink;
  const time = useStatusTime();
  return (
    <SafeAreaInsetsContext.Provider value={{ ...outer, top: DEVICE_INSETS.top, bottom: DEVICE_INSETS.bottom }}>
      <View style={styles.fill}>
        {children}
        <View pointerEvents="none" style={styles.status} aria-hidden>
          <Text variant="headline" color={ink} style={styles.time} tabular>
            {time}
          </Text>
          <View style={styles.icons}>
            {/* signal */}
            <Svg width={18} height={12} viewBox="0 0 18 12">
              <Rect x={0} y={8} width={3} height={4} rx={1} fill={ink} />
              <Rect x={5} y={5.5} width={3} height={6.5} rx={1} fill={ink} />
              <Rect x={10} y={3} width={3} height={9} rx={1} fill={ink} />
              <Rect x={15} y={0} width={3} height={12} rx={1} fill={ink} />
            </Svg>
            {/* wifi */}
            <Svg width={16} height={12} viewBox="0 0 16 12">
              <Path d="M8 11.5 L5.6 8.9 A3.4 3.4 0 0 1 10.4 8.9 Z" fill={ink} />
              <Path d="M3.3 6.6 A6.6 6.6 0 0 1 12.7 6.6" stroke={ink} strokeWidth={1.8} strokeLinecap="round" fill="none" />
              <Path d="M1 4.1 A9.9 9.9 0 0 1 15 4.1" stroke={ink} strokeWidth={1.8} strokeLinecap="round" fill="none" />
            </Svg>
            {/* battery */}
            <Svg width={27} height={13} viewBox="0 0 27 13">
              <Rect x={0.5} y={0.5} width={22} height={12} rx={3.5} stroke={ink} strokeOpacity={0.4} fill="none" />
              <Rect x={2.5} y={2.5} width={17} height={8} rx={2} fill={ink} />
              <Rect x={24} y={4.5} width={2} height={4} rx={1} fill={ink} fillOpacity={0.45} />
            </Svg>
          </View>
        </View>
        <View pointerEvents="none" style={styles.homeWrap}>
          <View style={[styles.home, { backgroundColor: ink }]} />
        </View>
      </View>
    </SafeAreaInsetsContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  status: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: DEVICE_INSETS.top,
    paddingHorizontal: 30,
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 100,
  },
  time: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.2, width: 54, textAlign: "center" },
  icons: { flexDirection: "row", alignItems: "center", gap: 6 },
  homeWrap: { position: "absolute", left: 0, right: 0, bottom: 8, alignItems: "center", zIndex: 100 },
  home: { width: 134, height: 5, borderRadius: 3, opacity: 0.9 },
});
