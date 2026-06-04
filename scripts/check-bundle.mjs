import { readFileSync } from "node:fs";

const forbiddenMarkers = [
  "node_modules/typescript/lib/typescript.js",
  "require(\"typescript\")",
  "from \"typescript\"",
];

const files = ["dist/index.js", "dist/index.cjs"];
const failures = [];

for (const file of files) {
  const contents = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

  for (const marker of forbiddenMarkers) {
    if (contents.includes(marker)) {
      failures.push(`${file} contains ${marker}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
