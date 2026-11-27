import { RemindersSettings } from "@/components/reminders/RemindersSettings";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

/** Reminders settings (opened from Profile). testID screen-notifications. */
export default function NotificationsScreen() {
  return (
    <Screen testID="screen-notifications" title="Reminders" backdrop="none" header={<ScreenHeader title="Reminders" fallbackHref="/profile" />} contentStyle={{ paddingTop: 8 }}>
      <RemindersSettings />
    </Screen>
  );
}
