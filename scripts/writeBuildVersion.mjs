import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const version = `${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
const payload = JSON.stringify(
  { version, updatedAt: new Date().toISOString() },
  null,
  2,
);

const publicPath = fileURLToPath(new URL("../public/version.json", import.meta.url));
await writeFile(publicPath, `${payload}\n`, "utf8");
console.log(`[writeBuildVersion] ${version}`);
