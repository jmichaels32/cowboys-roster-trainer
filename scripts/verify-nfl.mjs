#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

async function loadData(path, globalName) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const sandbox = { window: {} };
  runInNewContext(source, sandbox, { filename: path });
  return sandbox.window[globalName];
}

const roster = await loadData("data/nfl-top-100.js", "NFL_TOP_100");
const trivia = await loadData("data/nfl-trivia.js", "NFL_TRIVIA");
const errors = [];
const normalize = (value) => String(value ?? "").normalize("NFKC").trim().toLowerCase();

if (!roster?.players || roster.players.length !== 100) errors.push(`Top 100 must contain 100 players; found ${roster?.players?.length ?? 0}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(roster?.meta?.updated ?? "")) errors.push("Top 100 meta.updated must use YYYY-MM-DD.");

const playerIds = new Set();
const publishedRanks = new Set();
let pendingRanks = 0;
for (const player of roster?.players ?? []) {
  for (const field of ["id", "name", "team", "teamName", "position", "rankLabel", "image", "profile", "sourceUrl"]) {
    if (!String(player[field] ?? "").trim()) errors.push(`${player.id ?? "unknown"}: missing ${field}`);
  }
  if (playerIds.has(player.id)) errors.push(`${player.id}: duplicate player ID`);
  playerIds.add(player.id);
  if (player.rank === null) {
    pendingRanks += 1;
    if (player.rankLabel !== `Top ${roster.meta.pendingRanks}`) errors.push(`${player.id}: pending rank label is inconsistent`);
  } else {
    if (!Number.isInteger(player.rank) || player.rank < 1 || player.rank > 100) errors.push(`${player.id}: invalid rank`);
    if (publishedRanks.has(player.rank)) errors.push(`${player.id}: duplicate rank ${player.rank}`);
    publishedRanks.add(player.rank);
    if (player.rankLabel !== `#${player.rank}`) errors.push(`${player.id}: rank label is inconsistent`);
  }
  if (!/^assets\/nfl-top-100\/[a-z0-9-]+\.webp$/.test(player.image ?? "")) {
    errors.push(`${player.id}: invalid local headshot path`);
  } else {
    try {
      const image = await readFile(new URL(`../${player.image}`, import.meta.url));
      if (image.length < 1024) errors.push(`${player.id}: headshot is unexpectedly small`);
      if (image.subarray(0, 4).toString("ascii") !== "RIFF" || image.subarray(8, 12).toString("ascii") !== "WEBP") {
        errors.push(`${player.id}: headshot is not WebP`);
      }
    } catch {
      errors.push(`${player.id}: local headshot is missing`);
    }
  }
  for (const field of ["profile", "sourceUrl"]) {
    try {
      if (new URL(player[field]).hostname !== "www.nfl.com") errors.push(`${player.id}: ${field} must use nfl.com`);
    } catch {
      errors.push(`${player.id}: malformed ${field}`);
    }
  }
}
if (pendingRanks !== roster?.meta?.pendingRanks) errors.push("meta.pendingRanks does not match the data.");
for (const limit of [10, 25, 50, 75, 100]) {
  const count = (roster?.players ?? []).filter((player) => player.rank === null || player.rank <= limit).length;
  if (count !== limit) errors.push(`Top ${limit} group contains ${count} players.`);
}

if (!trivia?.questions?.length) errors.push("NFL trivia must contain questions.");
if (!/^\d{4}-\d{2}-\d{2}$/.test(trivia?.meta?.updated ?? "")) errors.push("NFL trivia meta.updated must use YYYY-MM-DD.");
const sourceIds = new Set(Object.keys(trivia?.meta?.sources ?? {}));
const packIds = new Set((trivia?.packs ?? []).map((pack) => pack.id));
const questionIds = new Set();
for (const question of trivia?.questions ?? []) {
  for (const field of ["id", "pack", "label", "prompt", "correct", "detail", "sourceId", "sourceTitle", "sourceUrl", "evidence", "verifiedOn"]) {
    if (!String(question[field] ?? "").trim()) errors.push(`${question.id ?? "unknown"}: missing ${field}`);
  }
  if (!question.id.startsWith("nfl-")) errors.push(`${question.id}: NFL trivia IDs must be namespaced`);
  if (questionIds.has(question.id)) errors.push(`${question.id}: duplicate question ID`);
  questionIds.add(question.id);
  if (!packIds.has(question.pack) || question.pack === "mixed") errors.push(`${question.id}: invalid pack ${question.pack}`);
  if (!sourceIds.has(question.sourceId)) errors.push(`${question.id}: unknown source ${question.sourceId}`);
  if (question.verifiedOn !== trivia.meta.updated) errors.push(`${question.id}: verifiedOn must match meta.updated`);
  if ((question.distractors ?? []).length !== 3) errors.push(`${question.id}: recognition requires exactly three distractors`);
  if (new Set((question.distractors ?? []).map(normalize)).size !== 3) errors.push(`${question.id}: duplicate distractors`);
  if ((question.distractors ?? []).some((answer) => normalize(answer) === normalize(question.correct))) errors.push(`${question.id}: correct answer appears among distractors`);
  if (question.answerType === "set") {
    if (!Array.isArray(question.expected) || question.expected.length < 2) errors.push(`${question.id}: set question needs expected answers`);
  } else if (!(question.accepted ?? []).some((answer) => normalize(answer) === normalize(question.correct))) {
    errors.push(`${question.id}: accepted answers must include the correct answer`);
  }
}
for (const packId of [...packIds].filter((id) => id !== "mixed")) {
  if (!trivia.questions.some((question) => question.pack === packId)) errors.push(`${packId}: pack has no questions`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Verified ${roster.players.length} NFL Top 100 players, ${pendingRanks} pending exact ranks, and ${trivia.questions.length} league trivia questions.`);
