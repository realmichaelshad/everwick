import LayoutGrid from "lucide-react-native/icons/layout-grid";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View, type HostInstance } from "react-native";

import { HABIT_ICON_COMPONENTS } from "@/components/ui/HabitIcon";
import { Card } from "@/components/ui/Card";
import { PressableScale } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { formatMediumDate, formatShortDate, orderedWeekdays, WEEKDAY_LETTER } from "@/data/dates";
import { shortName } from "@/data/insights";
import { heatmap, summarizeDay, type HeatCell } from "@/data/stats";
import type { DateKey, Habit, History } from "@/data/types";
import { focusHost } from "@/lib/dom";
import { haptics } from "@/lib/haptics";
import { mix, radius, rgba, space, useTheme } from "@/theme";

import { FilterChips } from "./FilterChips";

const WEEKS = 13;
const LABEL_W = 22;

export interface HeatmapCardProps {
  habits: Habit[];
  history: History;
  today: DateKey;
  weekStartsOn: 0 | 1;
  /** Opens the day sheet. */
  onOpenDay: (key: DateKey) => void;
  /** The day whose sheet is open (outlined). */
  openDay: DateKey | null;
}

/** Light: alpha steps of the ember (or habit color) over the white card. */
const LIGHT_RAMP = [0.22, 0.45, 0.72, 1] as const;
const DARK_MIX = [0.34, 0.56, 0.8, 1] as const;

/**
 * GitHub-style calendar of the last 13 weeks: one rounded square per day,
 * five levels from the empty track to the full ember (or the filtered habit's
 * color). Month labels on top, M/W/F on the left, today outlined, the days
 * still ahead ghosted. Tap a day for its breakdown. Keyboard: the grid is one
 * tab stop; arrow keys walk days and weeks, Enter opens the day.
 */
export function HeatmapCard({ habits, history, today, weekStartsOn, onOpenDay, openDay }: HeatmapCardProps) {
  const theme = useTheme();
  const { colors, isDark } = theme;
  const [filter, setFilter] = useState<string>("all");
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<DateKey>(today);
  const refs = useRef(new Map<DateKey, HostInstance | null>());

  const filtered = useMemo(() => (filter === "all" ? habits : habits.filter((h) => h.id === filter)), [filter, habits]);
  const focusHabit = filter === "all" ? null : (habits.find((h) => h.id === filter) ?? null);
  const base = colors.success;
  const levelColor = useCallback(
    (level: number) => {
      if (level <= 0) return colors.track;
      if (!isDark) return rgba(base, LIGHT_RAMP[level - 1]);
      return mix(colors.surface, base, DARK_MIX[level - 1]);
    },
    [base, colors.surface, colors.track, isDark],
  );

  const map = useMemo(() => heatmap(filtered, history, today, { weeks: WEEKS, weekStartsOn }), [filtered, history, today, weekStartsOn]);
  const firstDay = useMemo(() => filtered.reduce<DateKey | null>((min, h) => (!min || h.createdAt < min ? h.createdAt : min), null), [filtered]);

  const { labels, checkins } = useMemo(() => {
    const out = new Map<DateKey, string>();
    let total = 0;
    for (const column of map.columns) {
      for (const cell of column) {
        if (cell.future) continue;
        const prefix = `${cell.key === today ? "Today, " : ""}${formatMediumDate(cell.key)}`;
        if (!firstDay || cell.key < firstDay) {
          out.set(cell.key, `${prefix}: before your first habit`);
          continue;
        }
        const s = summarizeDay(filtered, history, cell.key, today);
        total += s.done;
        if (!s.scheduled) out.set(cell.key, `${prefix}: ${s.skipped ? "skipped" : "rest day"}`);
        else if (focusHabit) out.set(cell.key, `${prefix}: ${focusHabit.name} ${s.done ? "done" : cell.key === today ? "still open" : "not done"}`);
        else out.set(cell.key, `${prefix}: ${s.done} of ${s.scheduled} habits done`);
      }
    }
    return { labels: out, checkins: total };
  }, [filtered, firstDay, focusHabit, history, map.columns, today]);

  const interactive = (cell: HeatCell) => !cell.future && !!firstDay && cell.key >= firstDay;

  const step = width > 0 ? (width - LABEL_W) / WEEKS : 0;
  const gap = Math.max(3, Math.round(step * 0.16));
  const cell = Math.max(8, step - gap);
  const rowLetters = orderedWeekdays(weekStartsOn);

  const onKeyDown = (e: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    const key = e.nativeEvent.key;
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key as "ArrowLeft"];
    if (!delta) return;
    e.preventDefault?.();
    let w = map.columns.findIndex((c) => c.some((x) => x.key === active));
    let d = w >= 0 ? map.columns[w].findIndex((x) => x.key === active) : -1;
    if (w < 0) return;
    w += delta[0];
    d += delta[1];
    const target = map.columns[w]?.[d];
    if (!target || !interactive(target)) return;
    setActive(target.key);
    haptics.selection();
    focusHost(refs.current.get(target.key));
  };

  const open = useCallback(
    (key: DateKey) => {
      setActive(key);
      haptics.selection();
      onOpenDay(key);
    },
    [onOpenDay],
  );

  const setRef = useCallback((key: DateKey, node: HostInstance | null) => {
    refs.current.set(key, node);
  }, []);

  return (
    <Card padding={space[4]} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <Text variant="headline" heading level={2}>
            Last 13 weeks
          </Text>
          <Text variant="caption" tone="subtle">
            Tap a day for details
          </Text>
        </View>
        <Text variant="caption" tone="muted" style={styles.count}>
          <Text variant="caption" tabular>
            {checkins}
          </Text>{" "}
          check-ins
        </Text>
      </View>

      <FilterChips
        label="Show habits"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All habits", icon: LayoutGrid },
          ...habits.map((h) => {
            const tone = theme.habit(h.color);
            return { value: h.id, label: shortName(h.name), spoken: h.name, icon: HABIT_ICON_COMPONENTS[h.icon], bg: tone.soft, fg: tone.ink, border: tone.solid };
          }),
        ]}
      />

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <>
            <View style={[styles.months, { marginLeft: LABEL_W }]} aria-hidden>
              {map.months.map((m) => (
                <Text key={`${m.label}-${m.column}`} variant="caption" tone="subtle" maxFontSizeMultiplier={1.15} style={[styles.month, { left: m.column * step }]}>
                  {m.label}
                </Text>
              ))}
            </View>
            <View
              role="group"
              aria-label={`Completion calendar, last ${WEEKS} weeks${focusHabit ? `, ${focusHabit.name}` : ""}. Use the arrow keys to move between days.`}
              {...(Platform.OS === "web" ? { onKeyDown } : {})}
              style={{ gap }}
            >
              {rowLetters.map((weekday, d) => (
                <View key={weekday} style={[styles.row, { gap }]}>
                  <Text variant="caption" tone="subtle" aria-hidden maxFontSizeMultiplier={1.15} style={[styles.dayLabel, { width: LABEL_W - gap, lineHeight: cell }]}>
                    {d % 2 === (weekStartsOn === 1 ? 0 : 1) && d < 6 ? WEEKDAY_LETTER[weekday] : ""}
                  </Text>
                  {map.columns.map((column) => {
                    const c = column[d];
                    return (
                      <Cell
                        key={c.key}
                        cell={c}
                        size={cell}
                        color={c.empty ? rgba(colors.track, 0.55) : levelColor(c.level)}
                        label={labels.get(c.key) ?? ""}
                        interactive={interactive(c)}
                        isToday={c.key === today}
                        isOpen={c.key === openDay}
                        tabStop={c.key === active}
                        onPress={open}
                        setRef={setRef}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={{ height: 7 * 26 + 18 }} />
        )}
      </View>

      <View style={styles.legendRow}>
        {firstDay && map.start < firstDay ? (
          <View style={[styles.legend, styles.flex]}>
            <View style={[styles.swatch, styles.preStart, { borderColor: colors.lineStrong }]} aria-hidden />
            <Text variant="caption" tone="subtle" numberOfLines={1}>
              Started {formatShortDate(firstDay)}
            </Text>
          </View>
        ) : (
          <View style={styles.flex} />
        )}
        <View style={styles.legend} aria-hidden>
          <Text variant="caption" tone="subtle">
            Less
          </Text>
          {[0, 1, 2, 3, 4].map((level) => (
            <View key={level} style={[styles.swatch, { backgroundColor: levelColor(level) }]} />
          ))}
          <Text variant="caption" tone="subtle">
            More
          </Text>
        </View>
      </View>
    </Card>
  );
}

interface CellProps {
  cell: HeatCell;
  size: number;
  color: string;
  label: string;
  interactive: boolean;
  isToday: boolean;
  isOpen: boolean;
  tabStop: boolean;
  onPress: (key: DateKey) => void;
  setRef: (key: DateKey, node: HostInstance | null) => void;
}

const Cell = memo(function Cell({ cell, size, color, label, interactive, isToday, isOpen, tabStop, onPress, setRef }: CellProps) {
  const { colors } = useTheme();
  const r = Math.max(3, Math.round(size * 0.28));
  if (cell.future) {
    return <View aria-hidden style={{ width: size, height: size, borderRadius: r, borderWidth: 1.2, borderStyle: "dashed", borderColor: colors.line }} />;
  }
  if (!interactive) {
    // Before the first habit existed: an empty dotted outline, not a pale "missed" day.
    return <View aria-hidden style={{ width: size, height: size, borderRadius: r, borderWidth: 1.2, borderStyle: "dotted", borderColor: colors.lineStrong }} />;
  }
  const ring = isOpen ? colors.ink : isToday ? colors.inkMuted : null;
  return (
    <PressableScale
      ref={(node) => setRef(cell.key, node)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Shows that day's habits"
      // Roving tab stop: one cell in the tab order, arrow keys move between days.
      tabIndex={tabStop ? 0 : -1}
      pressScale={0.82}
      hitSlop={2}
      onPress={() => onPress(cell.key)}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: color,
        borderWidth: ring ? 2 : 0,
        borderColor: ring ?? "transparent",
      }}
    />
  );
});

const styles = StyleSheet.create({
  card: { gap: space[3], borderRadius: radius.xl },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  header: { gap: 2, flex: 1 },
  count: { paddingTop: 3 },
  preStart: { borderWidth: 1.2, borderStyle: "dotted", backgroundColor: "transparent" },
  months: { height: 18, marginBottom: 4 },
  month: { position: "absolute", top: 0, fontSize: 11, lineHeight: 16 },
  row: { flexDirection: "row", alignItems: "center" },
  dayLabel: { fontSize: 11 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: space[1] },
  flex: { flex: 1 },
  legend: { flexDirection: "row", alignItems: "center", gap: 4 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
});
