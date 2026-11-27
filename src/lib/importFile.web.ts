/**
 * Web version of pickImportFile: a hidden <input type="file"> limited to
 * JSON. Resolves with the file's text, or null when the picker is closed
 * without a choice (the input's `cancel` event, with a focus fallback for
 * older browsers).
 */
export function pickImportFile(): Promise<string | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.opacity = "0";
    let settled = false;

    const finish = (value: string | null, error?: unknown) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onFocus);
      input.remove();
      if (error) reject(error);
      else resolve(value);
    };

    // Fallback cancel detection: focus returns to the window and no file was chosen.
    const onFocus = () => {
      setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 600);
    };

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return finish(null);
      file.text().then(
        (text) => finish(text),
        (e: unknown) => finish(null, e),
      );
    });
    input.addEventListener("cancel", () => finish(null));
    document.body.appendChild(input);
    window.addEventListener("focus", onFocus, { once: true });
    input.click();
  });
}
