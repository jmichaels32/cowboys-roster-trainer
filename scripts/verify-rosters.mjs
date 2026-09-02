#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

async function loadData(path, globalName) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const sandbox = { window: {} };
  runInNewContext(source, sandbox, { filename: path });
  return sandbox.window[globalName];
}

const rosters = [
  { id: "cowboys", data: await loadData("data/roster.js", "COWBOYS_ROSTER"), localImages: false },
  { id: "patriots", data: await loadData("data/patriots-roster.js", "PATRIOTS_ROSTER"), localImages: true },
];
const collegeMarks = await loadData("data/college-marks.js", "COLLEGE_MARKS");
const errors = [];
const allIds = new Set();

for (const roster of rosters) {
  const players = roster.data?.players ?? [];
  if (players.length < 50) errors.push(`${roster.id}: expected at least 50 players; found ${players.length}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(roster.data?.meta?.updated ?? "")) errors.push(`${roster.id}: invalid updated date`);
  if (!roster.data?.meta?.source?.startsWith("https://www.")) errors.push(`${roster.id}: missing official source`);
  if (!roster.data?.meta?.depthSource?.startsWith("https://www.espn.com/")) errors.push(`${roster.id}: missing ESPN depth source`);
  if (players.filter((player) => player.tier === "famous").length !== 8) errors.push(`${roster.id}: Most famous must contain eight players`);
  if (players.filter((player) => Number.isFinite(player.depthRank)).length < 40) errors.push(`${roster.id}: fewer than 40 depth-chart matches`);

  for (const player of players) {
    for (const field of ["id", "name", "number", "position", "height", "weight", "college", "image", "profile", "status", "tier"]) {
      if (!String(player[field] ?? "").trim()) errors.push(`${roster.id}/${player.id ?? "unknown"}: missing ${field}`);
    }
    if (allIds.has(player.id)) errors.push(`${player.id}: duplicate player ID across decks`);
    allIds.add(player.id);
    if (/waived|released|cut/i.test(player.status)) errors.push(`${roster.id}/${player.id}: excluded roster status ${player.status}`);
    if (!collegeMarks[player.college]) errors.push(`${roster.id}/${player.id}: missing college mark entry for ${player.college}`);
    if (!roster.localImages) continue;
    if (!/^assets\/patriots\/[a-z0-9-]+\.webp$/.test(player.image)) {
      errors.push(`${roster.id}/${player.id}: invalid local headshot path`);
      continue;
    }
    try {
      const image = await readFile(new URL(`../${player.image}`, import.meta.url));
      if (image.length < 1024) errors.push(`${roster.id}/${player.id}: headshot is unexpectedly small`);
      if (image.subarray(0, 4).toString("ascii") !== "RIFF" || image.subarray(8, 12).toString("ascii") !== "WEBP") {
        errors.push(`${roster.id}/${player.id}: headshot is not WebP`);
      }
    } catch {
      errors.push(`${roster.id}/${player.id}: local headshot is missing`);
    }
  }
}

for (const [college, mark] of Object.entries(collegeMarks)) {
  if (!mark.src) continue;
  try {
    const image = await readFile(new URL(`../${mark.src}`, import.meta.url));
    if (image.length < 256) errors.push(`${college}: college mark is unexpectedly small`);
  } catch {
    errors.push(`${college}: college mark file is missing`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Verified ${rosters.map(({ id, data }) => `${data.players.length} ${id}`).join(" and ")} players with unique progress IDs and complete college-mark coverage.`);
