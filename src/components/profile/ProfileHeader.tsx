import Gem from "lucide-react-native/icons/gem";
import Pencil from "lucide-react-native/icons/pencil";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { radius, space, useTheme } from "@/theme";

import { NAME_MAX, nameError } from "./profileModel";

export interface ProfileHeaderProps {
  /** Shown under the day line (e.g. "Create a habit" when there are none). */
  action?: React.ReactNode;
  name: string;
  /** "Day 60 with Everwick" */
  memberLine: string;
  pro: boolean;
  onEditName: () => void;
}

const AVATAR = 96;

/**
 * Identity block: the portrait inside a slowly turning dawn halo, the name
 * with an edit button, the day count and the Pro preview badge.
 */
export function ProfileHeader({ name, memberLine, pro, onEditName, action }: ProfileHeaderProps) {
  const shown = name.trim() || "Your profile";
  return (
    <View style={styles.wrap}>
      <AvatarHalo name={name.trim() || "You"} size={AVATAR} />
      <View style={styles.nameRow}>
        <Text variant="display" heading align="center" numberOfLines={2} style={styles.name}>
          {shown}
        </Text>
        <IconButton icon={Pencil} label={name.trim() ? "Edit name" : "Add your name"} variant="muted" size={36} iconSize={16} onPress={onEditName} />
      </View>
      <View style={styles.metaRow}>
        <Text variant="callout" tone="muted" align="center">
          {memberLine}
        </Text>
        {pro ? <ProBadge /> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

function ProBadge() {
  const { colors } = useTheme();
  return (
    <View style={[styles.pro, { backgroundColor: colors.ink }]}>
      <Gem size={12} color={colors.flameMid} strokeWidth={2.6} />
      <Text variant="caption" color={colors.inkInverse} style={styles.proText}>
        Pro preview
      </Text>
    </View>
  );
}

/** The avatar inside a hairline ring: a monogram, plainly set. */
export function AvatarHalo({ name, size }: { name: string; size: number }) {
  const { colors } = useTheme();
  const ring = size + 16;
  return (
    <View style={{ width: ring, height: ring, alignItems: "center", justifyContent: "center", borderRadius: ring / 2, borderWidth: 1.5, borderColor: colors.lineStrong }}>
      <Avatar name={name} size={size} />
    </View>
  );
}

/** Bottom sheet to change the greeting name, with inline validation. */
export function NameSheet({ visible, initial, onClose, onSave }: { visible: boolean; initial: string; onClose: () => void; onSave: (name: string) => void }) {
  const [value, setValue] = useState(initial);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (visible) {
      setValue(initial);
      setTouched(false);
    }
  }, [initial, visible]);
  const error = nameError(value);
  const submit = () => {
    setTouched(true);
    if (error) return;
    onSave(value.trim());
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Your name"
      description="Used for your daily greeting. It stays on this device."
      footer={<Button label="Save name" size="lg" fullWidth onPress={submit} />}
    >
      <TextField
        label="Name"
        value={value}
        onChangeText={setValue}
        onBlur={() => setTouched(true)}
        error={touched ? error : null}
        helper="First name or a nickname"
        maxLength={NAME_MAX}
        showCount
        autoFocus
        autoCapitalize="words"
        autoComplete="given-name"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: space[1.5], paddingTop: space[1] },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space[2], marginTop: space[1.5], paddingLeft: 44, maxWidth: "100%" },
  name: { flexShrink: 1 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: space[2] },
  action: { marginTop: space[3] },
  pro: { flexDirection: "row", alignItems: "center", gap: space[1], paddingHorizontal: space[2] + 2, paddingVertical: 3, borderRadius: radius.pill },
  proText: { fontSize: 12, lineHeight: 16 },
});
