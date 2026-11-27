import { useLocalSearchParams } from "expo-router";

import { HabitForm } from "@/components/habit/form/HabitForm";
import { FormStateGate } from "@/components/habit/form/FormStateGate";
import { useHabit } from "@/data/store";

/** Edit habit (modal). */
export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habit = useHabit(id);
  return (
    <FormStateGate testID="screen-habit-edit" title="Edit habit" missing={!habit}>
      {() => (habit ? <HabitForm key={habit.id} mode="edit" habit={habit} testID="screen-habit-edit" /> : null)}
    </FormStateGate>
  );
}
