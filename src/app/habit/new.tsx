import { HabitForm } from "@/components/habit/form/HabitForm";
import { FormStateGate } from "@/components/habit/form/FormStateGate";

/** Add habit (modal). */
export default function NewHabitScreen() {
  return (
    <FormStateGate testID="screen-habit-new" title="New habit">
      {() => <HabitForm mode="new" testID="screen-habit-new" />}
    </FormStateGate>
  );
}
