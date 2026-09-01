#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source = await readFile(new URL("../data/cowboys-trivia.js", import.meta.url), "utf8");
const sandbox = { window: {} };
runInNewContext(source, sandbox, { filename: "data/cowboys-trivia.js" });

const trivia = sandbox.window.COWBOYS_TRIVIA;
const errors = [];
const allowedHosts = new Set(["www.dallascowboys.com", "www.profootballhof.com"]);
const normalize = (value) => String(value ?? "").normalize("NFKC").trim().toLowerCase();
const requireString = (question, field) => {
  if (!String(question[field] ?? "").trim()) errors.push(`${question.id ?? "unknown"}: missing ${field}`);
};

if (!trivia || typeof trivia !== "object") {
  throw new Error("Trivia data did not create window.COWBOYS_TRIVIA.");
}

const sourceEntries = Object.entries(trivia.meta?.sources ?? {});
const sourceIds = new Set(sourceEntries.map(([id]) => id));
const questionIds = new Set();
const packIds = new Set((trivia.packs ?? []).map((pack) => pack.id));
const usedSources = new Set();

if (!/^\d{4}-\d{2}-\d{2}$/.test(trivia.meta?.updated ?? "")) errors.push("meta.updated must use YYYY-MM-DD.");
if (!sourceEntries.length) errors.push("meta.sources must contain authoritative sources.");

for (const [sourceId, citation] of sourceEntries) {
  if (!citation.title?.trim()) errors.push(`${sourceId}: missing source title`);
  try {
    const url = new URL(citation.url);
    if (url.protocol !== "https:") errors.push(`${sourceId}: source URL must use HTTPS`);
    if (!allowedHosts.has(url.hostname)) errors.push(`${sourceId}: source host is not approved`);
  } catch {
    errors.push(`${sourceId}: malformed source URL`);
  }
}

for (const question of trivia.questions ?? []) {
  for (const field of ["id", "pack", "label", "prompt", "correct", "detail", "sourceId", "sourceTitle", "sourceUrl", "evidence", "verifiedOn"]) {
    requireString(question, field);
  }

  if (questionIds.has(question.id)) errors.push(`${question.id}: duplicate question ID`);
  questionIds.add(question.id);
  if (!packIds.has(question.pack) || question.pack === "mixed") errors.push(`${question.id}: invalid pack ${question.pack}`);
  if (!sourceIds.has(question.sourceId)) errors.push(`${question.id}: unknown source ${question.sourceId}`);
  usedSources.add(question.sourceId);

  const citation = trivia.meta.sources[question.sourceId];
  if (citation && question.sourceTitle !== citation.title) errors.push(`${question.id}: sourceTitle does not match registry`);
  if (citation && question.sourceUrl !== citation.url) errors.push(`${question.id}: sourceUrl does not match registry`);
  if (question.verifiedOn !== trivia.meta.updated) errors.push(`${question.id}: verifiedOn must match meta.updated`);
  if (question.evidence?.trim().length < 24) errors.push(`${question.id}: evidence note is too vague`);

  const distractors = question.distractors ?? [];
  if (distractors.length !== 3) errors.push(`${question.id}: recognition requires exactly three distractors`);
  if (new Set(distractors.map(normalize)).size !== distractors.length) errors.push(`${question.id}: duplicate distractors`);
  if (distractors.some((answer) => normalize(answer) === normalize(question.correct))) errors.push(`${question.id}: correct answer appears among distractors`);

  if (question.answerType === "set" || question.answerType === "ordered") {
    if (!Array.isArray(question.expected) || question.expected.length < 2) errors.push(`${question.id}: multi-answer question needs expected answers`);
  } else {
    const accepted = question.accepted ?? [];
    if (!accepted.length) errors.push(`${question.id}: typed recall needs accepted answers`);
    if (!accepted.some((answer) => normalize(answer) === normalize(question.correct))) errors.push(`${question.id}: accepted answers must include the displayed correct answer`);
  }
}

for (const packId of [...packIds].filter((id) => id !== "mixed")) {
  if (!trivia.questions.some((question) => question.pack === packId)) errors.push(`${packId}: pack has no questions`);
}

for (const sourceId of sourceIds) {
  if (!usedSources.has(sourceId)) errors.push(`${sourceId}: registered source is unused`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Verified ${trivia.questions.length} sourced trivia questions across ${packIds.size - 1} packs.`);
