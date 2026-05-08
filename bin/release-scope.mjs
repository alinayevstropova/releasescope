#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsxBin = resolve(root, "node_modules", "tsx", "dist", "cli.mjs");
const entry = resolve(root, "src", "cli", "release-scope.ts");

if (!existsSync(tsxBin)) {
  console.error("ReleaseScope CLI requires dependencies to be installed. Run `npm install` first.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [tsxBin, entry, "--", ...process.argv.slice(2)], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
