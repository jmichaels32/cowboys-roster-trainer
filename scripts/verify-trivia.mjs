#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const definitions = [
  {
    name: "Cowboys",
    file: "data/cowboys-trivia.js",
    globalName: "COWBOYS_TRIVIA",
    sourceHosts: ["www.dallascowboys.com", "www.profootballhof.com"],
    imageSourceHosts: ["www.dallascowboys.com", "skyboxpress.com"],
    imageFileHosts: ["static.clubs.nfl.com", "res.cloudinary.com", "skyboxpress.com"],
  },
  {
    name: "Patriots",
    file: "data/patriots-trivia.js",
    globalName: "PATRIOTS_TRIVIA",
    sourceHosts: ["www.patriots.com", "www.profootballhof.com"],
    imageSourceHosts: ["www.patriots.com"],
    imageFileHosts: ["static.clubs.nfl.com", "res.cloudinary.com"],
  },
];

const normalize = (value) => String(value ?? "").normalize("NFKC").trim().toLowerCase();

async function verifyTrivia(definition) {
  const source = await readFile(new URL(`../${definition.file}`, import.meta.url), "utf8");
  const sandbox = { window: {} };
  runInNewContext(source, sandbox, { filename: definition.file });

  const trivia = sandbox.window[definition.globalName];
  const errors = [];
  const allowedHosts = new Set(definition.sourceHosts);
  const allowedImageSourceHosts = new Set(definition.imageSourceHosts);
  const allowedImageFileHosts = new Set(definition.imageFileHosts);
  const requireString = (question, field) => {
    if (!String(question[field] ?? "").trim()) errors.push(`${question.id ?? "unknown"}: missing ${field}`);
  };

  if (!trivia || typeof trivia !== "object") throw new Error(`${definition.file} did not create window.${definition.globalName}.`);

  const sourceEntries = Object.entries(trivia.meta?.sources ?? {});
  const imageEntries = Object.entries(trivia.meta?.images ?? {});
  const sourceIds = new Set(sourceEntries.map(([id]) => id));
  const imageIds = new Set(imageEntries.map(([id]) => id));
  const questionIds = new Set();
  const packIds = new Set((trivia.packs ?? []).map((pack) => pack.id));
  const usedSources = new Set();
  const usedImages = new Set();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trivia.meta?.updated ?? "")) errors.push("meta.updated must use YYYY-MM-DD.");
  if (!sourceEntries.length) errors.push("meta.sources must contain authoritative sources.");
  if (!imageEntries.length) errors.push("meta.images must contain offline reveal images.");

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

  for (const [imageId, image] of imageEntries) {
    for (const field of ["path", "label", "subject", "alt", "credit", "sourceTitle", "sourceUrl", "originalUrl"]) {
      if (!String(image[field] ?? "").trim()) errors.push(`${imageId}: missing image ${field}`);
    }
    if (image.label?.trim().split(/\s+/).length > 4) errors.push(`${imageId}: image label must be four words or fewer`);
    if (!/^assets\/trivia\/[a-z0-9-]+\.webp$/.test(image.path ?? "")) {
      errors.push(`${imageId}: image path must be a local assets/trivia WebP`);
    } else {
      try {
        const file = await readFile(new URL(`../${image.path}`, import.meta.url));
        if (file.length < 1024) errors.push(`${imageId}: image asset is unexpectedly small`);
        if (file.subarray(0, 4).toString("ascii") !== "RIFF" || file.subarray(8, 12).toString("ascii") !== "WEBP") errors.push(`${imageId}: image asset is not a valid WebP`);
      } catch {
        errors.push(`${imageId}: local image asset is missing`);
      }
    }
    for (const [field, hosts] of [["sourceUrl", allowedImageSourceHosts], ["originalUrl", allowedImageFileHosts]]) {
      try {
        const url = new URL(image[field]);
        if (url.protocol !== "https:") errors.push(`${imageId}: ${field} must use HTTPS`);
        if (!hosts.has(url.hostname)) errors.push(`${imageId}: ${field} host is not approved`);
      } catch {
        errors.push(`${imageId}: malformed ${field}`);
      }
    }
  }

  for (const item of trivia.questions ?? []) {
    for (const field of ["id", "pack", "label", "prompt", "correct", "detail", "sourceId", "sourceTitle", "sourceUrl", "evidence", "verifiedOn", "imageId", "imageCaption"]) requireString(item, field);
    if (questionIds.has(item.id)) errors.push(`${item.id}: duplicate question ID`);
    questionIds.add(item.id);
    if (!packIds.has(item.pack) || item.pack === "mixed") errors.push(`${item.id}: invalid pack ${item.pack}`);
    if (!sourceIds.has(item.sourceId)) errors.push(`${item.id}: unknown source ${item.sourceId}`);
    usedSources.add(item.sourceId);
    if (!imageIds.has(item.imageId)) errors.push(`${item.id}: unknown image ${item.imageId}`);
    usedImages.add(item.imageId);

    const citation = trivia.meta.sources[item.sourceId];
    if (citation && item.sourceTitle !== citation.title) errors.push(`${item.id}: sourceTitle does not match registry`);
    if (citation && item.sourceUrl !== citation.url) errors.push(`${item.id}: sourceUrl does not match registry`);
    if (item.verifiedOn !== trivia.meta.updated) errors.push(`${item.id}: verifiedOn must match meta.updated`);
    if (item.evidence?.trim().length < 24) errors.push(`${item.id}: evidence note is too vague`);
    if (item.imageCaption?.trim().length < 24) errors.push(`${item.id}: image caption is too vague`);
    if (!item.image || item.image.path !== trivia.meta.images[item.imageId]?.path) errors.push(`${item.id}: image metadata was not resolved`);
    if (item.image?.caption !== item.imageCaption) errors.push(`${item.id}: resolved image caption does not match`);

    const distractors = item.distractors ?? [];
    if (distractors.length !== 3) errors.push(`${item.id}: recognition requires exactly three distractors`);
    if (new Set(distractors.map(normalize)).size !== distractors.length) errors.push(`${item.id}: duplicate distractors`);
    if (distractors.some((answer) => normalize(answer) === normalize(item.correct))) errors.push(`${item.id}: correct answer appears among distractors`);
    if (item.answerType === "set" || item.answerType === "ordered") {
      if (!Array.isArray(item.expected) || item.expected.length < 2) errors.push(`${item.id}: multi-answer question needs expected answers`);
    } else {
      const accepted = item.accepted ?? [];
      if (!accepted.length) errors.push(`${item.id}: typed recall needs accepted answers`);
      if (!accepted.some((answer) => normalize(answer) === normalize(item.correct))) errors.push(`${item.id}: accepted answers must include the displayed correct answer`);
    }
  }

  for (const packId of [...packIds].filter((id) => id !== "mixed")) {
    if (!trivia.questions.some((item) => item.pack === packId)) errors.push(`${packId}: pack has no questions`);
  }
  for (const sourceId of sourceIds) if (!usedSources.has(sourceId)) errors.push(`${sourceId}: registered source is unused`);
  for (const imageId of imageIds) if (!usedImages.has(imageId)) errors.push(`${imageId}: registered image is unused`);

  if (errors.length) throw new Error(`${definition.name} trivia:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  console.log(`Verified ${definition.name}: ${trivia.questions.length} sourced questions, ${imageIds.size} offline images, ${packIds.size - 1} packs.`);
}

for (const definition of definitions) await verifyTrivia(definition);
