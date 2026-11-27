import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";

/**
 * Lets the person pick an Everwick export (.json) and returns its text, or
 * null when they cancel. iOS and Android: the system document picker, then
 * the file is read from the app's cache copy. (Web: importFile.web.ts.)
 * Throws only when a picked file can't be read.
 */
export async function pickImportFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return new File(asset.uri).text();
}
