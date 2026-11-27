import { View } from "react-native";

import { fonts, useTheme } from "@/theme";

import { Text } from "./Text";

export interface AvatarProps {
  name: string;
  size?: number;
  /** Adds a ring in the canvas color (for overlapping or header use). */
  ring?: boolean;
  /** Show the profile picture (the "avatar" illustration slot) instead of the initial. */
  photo?: boolean;
}

/**
 * The person's initial on an ink disc: a monogram, like a signature. No
 * photos or drawn faces are used anywhere in the app. `photo` is accepted for
 * older call sites and draws the same monogram.
 */
export function Avatar({ name, size = 44, ring }: AvatarProps) {
  const { colors } = useTheme();
  const initial = (name.trim()[0] ?? "E").toUpperCase();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${name}'s avatar`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.ink,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: ring ? 2 : 0,
        borderColor: colors.canvas,
      }}
    >
      <Text color={colors.inkInverse} style={{ fontFamily: fonts.display, fontSize: size * 0.42, lineHeight: size * 0.5 }}>
        {initial}
      </Text>
    </View>
  );
}

