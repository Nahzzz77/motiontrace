import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = "FINGERPRINT.sha256";
const mode = process.argv[2];
if (!["--write", "--check"].includes(mode)) {
  console.error("Usage: node scripts/fingerprint.mjs --write | --check");
  process.exit(2);
}

// Git's index defines the release scope. Stage new files before regenerating.
const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0").filter((file) => file && file !== manifest).sort();
const lines = await Promise.all(files.map(async (file) => {
  if (/[\r\n\\]/.test(file)) throw new Error(`Unsupported manifest path: ${file}`);
  const hash = createHash("sha256").update(await readFile(path.join(root, file))).digest("hex");
  return `${hash}  ${file}`;
}));
const content = `${lines.join("\n")}\n`;
const target = path.join(root, manifest);
if (mode === "--write") {
  await writeFile(target, content);
  console.log(`Updated ${manifest}: ${files.length} tracked files.`);
} else {
  const current = (await readFile(target, "utf8")).replace(/\r\n/g, "\n");
  if (current !== content) {
    console.error(`${manifest} differs from the current tracked files. Review changes, stage new files, then regenerate.`);
    process.exitCode = 1;
  } else {
    console.log(`Verified ${files.length} tracked files.`);
  }
}
