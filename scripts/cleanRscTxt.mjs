/**
 * Next.js 静的 export が生成する RSC 用の *.txt（人間向けのページではない）を
 * デプロイ物から外す。誤って /notes.txt を開くと文字化けした表示になるのを防ぐ。
 */
import { readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = fileURLToPath(new URL("../out", import.meta.url));

async function walkRemoveTxt(dir) {
  const names = await readdir(dir, { withFileTypes: true });
  for (const e of names) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      await walkRemoveTxt(p);
    } else if (e.isFile() && e.name.endsWith(".txt")) {
      await unlink(p);
      console.log(`[cleanRscTxt] removed ${p}`);
    }
  }
}

try {
  await walkRemoveTxt(outDir);
} catch (err) {
  if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
    console.warn("[cleanRscTxt] out/ not found; skip");
    process.exit(0);
  }
  throw err;
}
