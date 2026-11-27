import { router } from "expo-router";
import Download from "lucide-react-native/icons/download";
import Eraser from "lucide-react-native/icons/eraser";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Upload from "lucide-react-native/icons/upload";
import { useCallback, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { exportFileName, type ImportedData } from "@/data/persist";
import { useStore } from "@/data/store";
import { haptics } from "@/lib/haptics";
import { pickImportFile } from "@/lib/importFile";
import { shareJson } from "@/lib/share";

import { importedMessage } from "./profileModel";

export type DataDialog =
  | { kind: "reset" }
  | { kind: "clear" }
  | { kind: "import-confirm"; data: ImportedData }
  | { kind: "import-error"; message: string };

/**
 * Export, import, reset and "start from scratch" for the Profile screen.
 * Destructive changes are confirmed in a dialog and offer Undo (a snapshot of
 * the whole state taken right before the change).
 */
export function useDataActions() {
  const { actions, today } = useStore();
  const toast = useToast();
  const [dialog, setDialog] = useState<DataDialog | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);

  const exportNow = useCallback(async () => {
    setBusy("export");
    try {
      const name = exportFileName(today);
      const result = await shareJson(name, actions.exportData());
      if (result === "dismissed") return;
      haptics.complete();
      toast.show({ message: `Exported ${name}`, tone: "success", icon: Download });
    } catch {
      haptics.error();
      toast.show({ message: "The export didn't go through. Give it another try.", tone: "danger" });
    } finally {
      setBusy(null);
    }
  }, [actions, toast, today]);

  const importNow = useCallback(async () => {
    setBusy("import");
    let text: string | null;
    try {
      text = await pickImportFile();
    } catch {
      setBusy(null);
      setDialog({ kind: "import-error", message: "We couldn't read that file. Choose a .json file exported from Everwick." });
      return;
    }
    setBusy(null);
    if (text == null) return;
    const result = actions.previewImport(text);
    if (!result.ok) {
      haptics.error();
      setDialog({ kind: "import-error", message: result.error });
      return;
    }
    setDialog({ kind: "import-confirm", data: result.data });
  }, [actions]);

  const confirmImport = useCallback(
    (data: ImportedData) => {
      const before = actions.snapshot();
      actions.importData(data);
      haptics.complete();
      toast.show({ message: importedMessage(data), tone: "success", icon: Upload, action: { label: "Undo", onPress: () => actions.restore(before) } });
    },
    [actions, toast],
  );

  const confirmReset = useCallback(() => {
    const before = actions.snapshot();
    actions.resetDemoData();
    haptics.complete();
    toast.show({ message: "Demo data is back: 60 days of history", icon: RotateCcw, action: { label: "Undo", onPress: () => actions.restore(before) } });
  }, [actions, toast]);

  const confirmClear = useCallback(() => {
    const before = actions.snapshot();
    actions.clearAllData();
    haptics.warning();
    toast.show({ message: "Every habit was removed", icon: Eraser, action: { label: "Undo", onPress: () => actions.restore(before) } });
  }, [actions, toast]);

  const replayOnboarding = useCallback(() => {
    actions.replayOnboarding();
    router.replace("/onboarding");
  }, [actions]);

  return {
    dialog,
    busy,
    closeDialog: () => setDialog(null),
    exportNow,
    importNow,
    askReset: () => setDialog({ kind: "reset" }),
    askClear: () => setDialog({ kind: "clear" }),
    confirmImport,
    confirmReset,
    confirmClear,
    replayOnboarding,
  };
}
