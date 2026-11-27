import CircleAlert from "lucide-react-native/icons/circle-alert";
import { forwardRef, useState } from "react";
import { Platform, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps, type ViewStyle } from "react-native";

import { fonts, radius, space, useTheme } from "@/theme";

import { Text } from "./Text";

export interface TextFieldProps extends Omit<TextInputProps, "style"> {
  /** Visible label (also the accessible name). */
  label: string;
  helper?: string;
  /** Error message; turns the field red and is announced. */
  error?: string | null;
  /** Shows "12/40" when maxLength is set. */
  showCount?: boolean;
  multiline?: boolean;
  containerStyle?: ViewStyle;
}

/** Labelled text input with helper, counter and validation styles. */
export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, helper, error, showCount, maxLength, multiline, value, containerStyle, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.accent : "transparent";
  const id = `field-${label.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={styles.labelRow}>
        <Text variant="caption" tone="muted" nativeID={`${id}-label`}>
          {label}
        </Text>
        {showCount && maxLength ? (
          <Text variant="caption" tone="subtle" tabular>
            {(value ?? "").length}/{maxLength}
          </Text>
        ) : null}
      </View>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityLabelledBy={`${id}-label`}
        accessibilityHint={error ?? helper}
        aria-invalid={error ? true : undefined}
        // Web: screen readers read the reason with the field, not just "invalid".
        aria-describedby={error || helper ? `${id}-message` : undefined}
        aria-errormessage={error ? `${id}-message` : undefined}
        value={value}
        maxLength={maxLength}
        multiline={multiline}
        placeholderTextColor={colors.inkSubtle}
        selectionColor={colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          {
            color: colors.ink,
            backgroundColor: colors.surfaceMuted,
            borderColor,
            fontFamily: fonts.semibold,
          },
          Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null,
        ]}
      />
      {error ? (
        <View style={styles.messageRow} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <CircleAlert size={14} color={colors.dangerText} strokeWidth={2.4} />
          <Text variant="caption" tone="danger" nativeID={`${id}-message`}>
            {error}
          </Text>
        </View>
      ) : helper ? (
        <Text variant="caption" tone="subtle" nativeID={`${id}-message`}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space[1.5] },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 2 },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: 16,
  },
  multiline: { minHeight: 112, textAlignVertical: "top" },
  messageRow: { flexDirection: "row", alignItems: "center", gap: space[1] },
});
