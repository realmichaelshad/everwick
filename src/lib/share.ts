import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";

/**
 * Hands a JSON export to the person as a real file on iOS and Android: it is
 * written to the app's cache and offered in the system share sheet (Save to
 * Files, AirDrop, Drive, mail), typed as JSON. If sharing files isn't
 * available on the device, the text itself is shared instead. (Web downloads
 * the file: share.web.ts.) Resolves to how it was delivered.
 */
export async function shareJson(fileName: string, json: string): Promise<"downloaded" | "shared" | "dismissed"> {
  if (await Sharing.isAvailableAsync()) {
    const file = new File(Paths.cache, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(json);
    await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: "Export your Everwick data" });
    return "shared";
  }
  const result = await Share.share({ title: fileName, message: json });
  return result.action === Share.dismissedAction ? "dismissed" : "shared";
}
