import { router } from "expo-router";
import House from "lucide-react-native/icons/house";

import { Screen } from "@/components/ui/Screen";
import { BurnedOutArt, EmptyState } from "@/components/ui/StateViews";

export default function NotFoundScreen() {
  return (
    <Screen testID="screen-not-found" title="Page not found" contentStyle={{ justifyContent: "center" }}>
      <EmptyState
        art={<BurnedOutArt size={196} />}
        title="This page burned out"
        body="The screen you were looking for doesn't exist. Your habits are right where you left them."
        action={{ label: "Back to Today", icon: House, onPress: () => router.replace("/") }}
      />
    </Screen>
  );
}
