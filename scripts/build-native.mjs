#!/usr/bin/env node

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const outputDirectory = resolve(projectDirectory, "www");
const files = [
  "index.html",
  "app.js",
  "styles.css",
  "favicon.svg",
  "data/roster.js",
  "data/patriots-roster.js",
  "data/college-marks.js",
  "data/cowboys-trivia.js",
  "data/patriots-trivia.js",
  "data/nfl-top-100.js",
  "data/nfl-trivia.js",
  "assets/college-marks",
  "assets/trivia",
  "assets/team-logos",
  "assets/patriots",
  "assets/nfl-top-100",
];

await rm(outputDirectory, { recursive: true, force: true });

for (const file of files) {
  const destination = resolve(outputDirectory, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(projectDirectory, file), destination, { recursive: true });
}

console.log(`Prepared ${files.length} web assets in ${outputDirectory}`);
