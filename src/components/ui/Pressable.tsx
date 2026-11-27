import { forwardRef, type ReactNode } from "react";
import { Platform, Pressable as RNPressable, type GestureResponderEvent, type HostInstance, type KeyDownEvent, type PressableProps as RNPressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";

import { motion } from "@/theme";

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

/** Roles that toggle or select: Space must activate them too (react-native-web only maps Space for buttons). */
const SPACE_ROLES = new Set(["switch", "checkbox", "radio", "tab", "menuitemcheckbox", "menuitemradio", "option"]);

export interface PressableScaleProps extends Omit<RNPressableProps, "style" | "children"> {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Scale when pressed (default 0.97). Use 1 to disable. */
  pressScale?: number;
}

/**
 * Pressable with a springy press-in scale. Base for Button, IconButton, Chip
 * and pressable cards. Keyboard focus is visible on web via :focus-visible
 * (public/index.html) and follows the element's own border radius. On web,
 * Space activates switches, checkboxes, radios and tabs as well as buttons,
 * and Enter activates in-app links.
 */
export const PressableScale = forwardRef<HostInstance, PressableScaleProps>(function PressableScale(
  { style, children, pressScale = 0.97, onPressIn, onPressOut, onKeyDown, ...rest },
  ref,
) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const role = (rest.role ?? rest.accessibilityRole) as string | undefined;

  const keyDown =
    Platform.OS === "web"
      ? (e: KeyDownEvent) => {
          onKeyDown?.(e);
          if (rest.disabled || !role) return;
          const key = e.nativeEvent.key;
          // react-native-web leaves Enter on role="link" to the browser (it expects an <a href>),
          // so our in-app links (tab bar, avatar) would do nothing from the keyboard.
          const repeat = !!e.nativeEvent.repeat;
          const enterOnLink = key === "Enter" && role === "link";
          const spaceOnToggle = (key === " " || key === "Spacebar") && SPACE_ROLES.has(role);
          if (enterOnLink || spaceOnToggle) {
            // Holding the key must not flip a switch over and over: act once, swallow the repeats.
            e.preventDefault();
            if (!repeat) rest.onPress?.(e as unknown as GestureResponderEvent);
          }
        }
      : undefined;

  return (
    <AnimatedPressable
      ref={ref}
      {...rest}
      onKeyDown={keyDown ?? onKeyDown}
      onPressIn={(e) => {
        if (!reduced && pressScale !== 1) scale.value = withSpring(pressScale, motion.spring.press);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, motion.spring.press);
        onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
});
