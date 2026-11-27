import Bell from "lucide-react-native/icons/bell";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Download from "lucide-react-native/icons/download";
import Eraser from "lucide-react-native/icons/eraser";
import Gem from "lucide-react-native/icons/gem";
import Info from "lucide-react-native/icons/info";
import Moon from "lucide-react-native/icons/moon";
import PenTool from "lucide-react-native/icons/pen-tool";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Smartphone from "lucide-react-native/icons/smartphone";
import Sparkles from "lucide-react-native/icons/sparkles";
import Tag from "lucide-react-native/icons/tag";
import Upload from "lucide-react-native/icons/upload";
import Vibrate from "lucide-react-native/icons/vibrate";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, View } from "react-native";

import { Logo } from "@/components/brand/Logo";
import { Illustration } from "@/components/illustrations/Illustration";
import { Badge } from "@/components/ui/Badge";
import { HABIT_ICON_COMPONENTS } from "@/components/ui/HabitIcon";
import { ListGroup, ListRow } from "@/components/ui/ListRow";
import { PressableScale } from "@/components/ui/Pressable";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { CONCEPT_NOTE } from "@/content/brand";
import { GOALS } from "@/data/catalog";
import { formatTime } from "@/data/dates";
import type { GoalKey, Settings } from "@/data/types";
import { elevation, layout, radius, space, useTheme, type HabitColorKey, type Theme } from "@/theme";

import { Switch } from "@/components/ui/Switch";

/** Icon tile colors from a habit tone (AA in both themes). */
function tile(habit: Theme["habit"], key: HabitColorKey) {
  const tone = habit(key);
  return { iconBg: tone.soft, iconColor: tone.ink };
}

/* -------------------------------------------------------------------------- */
/* Goals                                                                       */
/* -------------------------------------------------------------------------- */

/** Read-only goal tags in each goal's color. */
export function GoalTags({ goals }: { goals: GoalKey[] }) {
  const { habit } = useTheme();
  const picked = GOALS.filter((g) => goals.includes(g.key));
  if (!picked.length) {
    return (
      <Text variant="callout" tone="muted">
        No goals picked yet. Goals shape the habits Everwick suggests.
      </Text>
    );
  }
  return (
    <View style={styles.tags}>
      {picked.map((g) => {
        const tone = habit(g.color);
        const Icon = HABIT_ICON_COMPONENTS[g.icon];
        return (
          <View key={g.key} style={[styles.tag, { backgroundColor: tone.soft }]}>
            <Icon size={15} color={tone.ink} strokeWidth={2.4} />
            <Text variant="caption" color={tone.ink}>
              {g.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Pro                                                                         */
/* -------------------------------------------------------------------------- */

/** The Upgrade card (a demo: no purchase ever happens). Whole card is one button. */
export function ProCard({ active, onPress }: { active: boolean; onPress: () => void }) {
  const { colors, isDark, habit } = useTheme();
  const rose = habit("rose");
  const label = active ? "Everwick Pro preview is on. Demo, no purchase. Manage" : "Everwick Pro, demo. See what's included. No purchase happens";
  return (
    <View style={[styles.proCard, elevation("card", colors, isDark), isDark ? { borderWidth: 1, borderColor: colors.line } : null]}>
      <LinearGradient
        colors={[colors.accentSoft, rose.soft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]}
      />
      <View style={styles.proInner} aria-hidden pointerEvents="none">
        <View style={styles.proText}>
          <View style={styles.proBadges}>
            <Badge label="Demo" tone="custom" bg={colors.ink} fg={colors.inkInverse} />
            {active ? <Badge label="Preview on" tone="success" /> : null}
          </View>
          <Text variant="title">{active ? "You're previewing Pro" : "Everwick Pro"}</Text>
          <Text variant="callout" tone="muted">
            {active ? "Every Pro screen is unlocked to explore. Nothing was bought." : "Deeper insights, unlimited habits and more. A preview only, never a purchase."}
          </Text>
          <View style={styles.proCta}>
            <Text variant="caption" tone="accent">
              {active ? "Manage preview" : "See what's in Pro"}
            </Text>
            <ChevronRight size={15} color={colors.accentText} strokeWidth={2.6} />
          </View>
        </View>
        <Illustration slot="pro" size={112} style={styles.proArt} />
      </View>
      <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} pressScale={0.98} style={styles.proOverlay} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Settings groups                                                             */
/* -------------------------------------------------------------------------- */

export interface AppearanceGroupProps {
  settings: Settings;
  onTheme: (theme: Settings["theme"]) => void;
  onWeekStart: (day: 0 | 1) => void;
}

/**
 * Dark mode is always available: flipping it picks light or dark and stops
 * following the phone. "Match system" follows the phone again.
 */
export function AppearanceGroup({ settings, onTheme, onWeekStart }: AppearanceGroupProps) {
  const { scheme, isDark, habit } = useTheme();
  const following = settings.theme === "system";
  return (
    <ListGroup title="Appearance">
      <ListRow
        icon={Moon}
        {...tile(habit, "indigo")}
        label="Dark mode"
        description="Candlelight colors at night"
        right={<Switch label="Dark mode" value={isDark} onValueChange={(v) => onTheme(v ? "dark" : "light")} />}
      />
      <ListRow
        icon={Smartphone}
        {...tile(habit, "violet")}
        label="Match system"
        description={following ? `On. Your ${Platform.OS === "web" ? "device" : "phone"} is in ${scheme} mode` : `Follow your ${Platform.OS === "web" ? "device" : "phone"}'s setting`}
        right={<Switch label="Match system" value={following} onValueChange={(v) => onTheme(v ? "system" : scheme)} />}
      />
      <View>
        <ListRow icon={CalendarDays} {...tile(habit, "teal")} label="Week starts on" description="Week strip, charts and calendars" />
        <View style={styles.segment}>
          <SegmentedControl
            label="Week starts on"
            options={[
              { value: "1", label: "Monday" },
              { value: "0", label: "Sunday" },
            ]}
            value={String(settings.weekStartsOn) as "0" | "1"}
            onChange={(v) => onWeekStart(v === "0" ? 0 : 1)}
          />
        </View>
      </View>
    </ListGroup>
  );
}

export function GeneralGroup({ settings, onHaptics, onReminders }: { settings: Settings; onHaptics: (v: boolean) => void; onReminders: () => void }) {
  const { habit } = useTheme();
  const n = settings.notifications;
  return (
    <ListGroup title="Feedback and reminders">
      <ListRow
        icon={Vibrate}
        {...tile(habit, "rose")}
        label="Haptics"
        description={Platform.OS === "web" ? "Felt on your phone only" : "A gentle tap when you check in"}
        right={<Switch label="Haptics" value={settings.haptics} onValueChange={onHaptics} />}
      />
      <ListRow
        icon={Bell}
        {...tile(habit, "sun")}
        label="Reminders"
        description={n.enabled ? `${formatTime(n.morning)} and ${formatTime(n.evening)}` : "A nudge before a streak breaks"}
        value={n.enabled ? "On" : "Off"}
        onPress={onReminders}
      />
    </ListGroup>
  );
}

export interface DataGroupProps {
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onClear: () => void;
  onReplay: () => void;
  busy?: "export" | "import" | null;
}

export function DataGroup({ onExport, onImport, onReset, onClear, onReplay, busy }: DataGroupProps) {
  const { habit } = useTheme();
  return (
    <ListGroup title="Your data" footer="Everything is stored on this device. Exports never leave it unless you share them.">
      <ListRow icon={Download} {...tile(habit, "ocean")} label="Export data" description="Save your history as a JSON file" onPress={onExport} disabled={busy === "export"} />
      <ListRow icon={Upload} {...tile(habit, "leaf")} label="Import data" description="Load an Everwick export file" onPress={onImport} disabled={busy === "import"} />
      <ListRow icon={RotateCcw} {...tile(habit, "ember")} label="Reset demo data" description="Bring back the 60-day sample history" onPress={onReset} />
      <ListRow icon={Sparkles} {...tile(habit, "violet")} label="Replay onboarding" description="See the welcome steps again" onPress={onReplay} />
      <ListRow icon={Eraser} tone="danger" label="Start from scratch" description="Remove every habit and check-in" onPress={onClear} />
    </ListGroup>
  );
}

export function AboutGroup({ version, onAbout }: { version: string; onAbout: () => void }) {
  const { habit } = useTheme();
  return (
    <ListGroup title="About">
      <ListRow icon={Info} {...tile(habit, "indigo")} label={CONCEPT_NOTE} description="What Everwick is and isn't" onPress={onAbout} />
      <ListRow icon={Tag} {...tile(habit, "teal")} label="Version" value={version} />
      <ListRow icon={PenTool} {...tile(habit, "ember")} label="Design and code by Michael" />
    </ListGroup>
  );
}

/** The honest About sheet. */
export function AboutSheet({ visible, onClose, version }: { visible: boolean; onClose: () => void; version: string }) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title="About Everwick" description={`${CONCEPT_NOTE}. Version ${version}`}>
      <View style={[styles.aboutLogo, { backgroundColor: colors.surfaceMuted }]}>
        <Logo size={30} />
      </View>
      <Text variant="body">
        Everwick is a concept habit tracker designed and built by Michael as a portfolio project. The brand, the sample person and her 60 days of history are invented for
        the demo.
      </Text>
      <Text variant="body">
        Everything you do here stays on this device. There's no account, no server and no tracking. Everwick Pro is a preview: nothing can be bought.
      </Text>
      <Text variant="body" tone="muted">
        Built with React Native and Expo for iOS, Android and the web. Illustrations: original artwork made for this concept.
      </Text>
      <View style={styles.aboutFacts}>
        <Fact icon={Gem} text="Pro is a demo" />
        <Fact icon={Smartphone} text="Data stays on device" />
      </View>
    </Sheet>
  );
}

function Fact({ icon: Icon, text }: { icon: typeof Gem; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fact, { borderColor: colors.line }]}>
      <Icon size={15} color={colors.accentText} strokeWidth={2.4} />
      <Text variant="caption" tone="muted">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  tag: { flexDirection: "row", alignItems: "center", gap: space[1.5], paddingHorizontal: space[3], minHeight: 34, borderRadius: radius.pill },
  proCard: { borderRadius: radius.xl, minHeight: 148 },
  proInner: { flexDirection: "row", alignItems: "center", gap: space[2], padding: space[4], paddingRight: space[2] },
  proText: { flex: 1, gap: space[1] },
  proBadges: { flexDirection: "row", gap: space[1.5], marginBottom: space[1] },
  proCta: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: space[1] },
  proArt: { marginVertical: -space[2] },
  proOverlay: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: radius.xl },
  segment: { paddingLeft: layout.cardPadding + 36 + space[3], paddingRight: layout.cardPadding, paddingBottom: space[4], marginTop: -space[1] },
  aboutLogo: { alignSelf: "flex-start", paddingHorizontal: space[4], paddingVertical: space[3], borderRadius: radius.lg },
  aboutFacts: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  fact: { flexDirection: "row", alignItems: "center", gap: space[1.5], borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: space[1.5] },
});
