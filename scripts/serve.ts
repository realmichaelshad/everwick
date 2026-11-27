/// <reference types="node" />
/**
 * Serves the production web build (dist/) as a single-page app on 127.0.0.1.
 *
 *   npm run start                     # port from $PORT, default 3310
 *   npm run start -- --port 3310
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const i = process.argv.indexOf("--port");
const port = Number(i > -1 ? process.argv[i + 1] : (process.env.PORT ?? 3310));
if (!Number.isInteger(port) || port <= 0) {
  console.error(`Invalid port: ${String(port)}`);
  process.exit(1);
}
if (!existsSync(path.join(root, "dist", "index.html"))) {
  console.error("No web build in dist/. Run `npm run build` first.");
  process.exit(1);
}
const bin = path.join(root, "node_modules", ".bin", "serve");
// Windows installs npm bins as .cmd shims, which only start through a shell.
const win = process.platform === "win32";
const child = spawn(win ? `"${bin}.cmd"` : bin, ["dist", "--single", "--no-clipboard", "--listen", `tcp://127.0.0.1:${port}`], { cwd: root, stdio: "inherit", shell: win });
const stop = () => child.kill("SIGTERM");
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
