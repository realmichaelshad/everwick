/**
 * Web build of lib/share: the export downloads as everwick-export-<date>.json.
 * (iOS and Android write the file and open the share sheet: share.ts.)
 */
export async function shareJson(fileName: string, json: string): Promise<"downloaded" | "shared" | "dismissed"> {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
