import { useId } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { Text } from "@/components/ui/Text";
import { fonts, useTheme } from "@/theme";

import { FLAME_INNER_PATH, FLAME_PATH, FLAME_VIEWBOX, WICK_COLOR, WICK_MIN_SIZE, WICK_PATH, WICK_WIDTH } from "./geometry";

/**
 * The flame mark on its own (static): an amber-to-ember flame, a warm inner
 * flame and the plum wick (dropped below WICK_MIN_SIZE). The same drawing as
 * the app icon.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  const { colors, isDark } = useTheme();
  const gid = `mark-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Svg width={size} height={size} viewBox={FLAME_VIEWBOX} aria-hidden>
      <Defs>
        <LinearGradient id={gid} x1="0.25" y1="1" x2="0.7" y2="0">
          <Stop offset="0" stopColor={colors.brand[0]} />
          <Stop offset="0.6" stopColor={colors.brand[1]} />
          <Stop offset="1" stopColor={colors.flameOuter} />
        </LinearGradient>
      </Defs>
      <Path d={FLAME_PATH} fill={`url(#${gid})`} />
      <Path d={FLAME_INNER_PATH} fill={colors.flameCore} />
      {size >= WICK_MIN_SIZE ? <Path d={WICK_PATH} stroke={isDark ? colors.inkMuted : WICK_COLOR} strokeWidth={WICK_WIDTH} strokeLinecap="round" fill="none" /> : null}
    </Svg>
  );
}

/** Mark + "everwick" wordmark (Bricolage Grotesque 800). */
export function Logo({ size = 28, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Everwick" style={[{ flexDirection: "row", alignItems: "center", gap: size * 0.22 }, style]}>
      <LogoMark size={size} />
      <Text variant="display" style={{ fontFamily: fonts.display, fontSize: size * 0.92, lineHeight: size * 1.05, letterSpacing: -size * 0.035 }}>
        everwick
      </Text>
    </View>
  );
}
