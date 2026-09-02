#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const teamId = process.argv.find((argument) => argument.startsWith("--team="))?.split("=")[1] ?? "cowboys";
const teams = {
  cowboys: {
    globalName: "COWBOYS_ROSTER",
    outputPath: "data/roster.js",
    sourceUrl: "https://www.dallascowboys.com/team/players-roster/",
    depthSourceUrl: "https://www.espn.com/nfl/team/depth/_/name/dal/dallas-cowboys",
    includedStatuses: new Set(["Active", "Reserve/Designated to Return", "Reserve/Injured", "Practice Squad"]),
    mostFamous: new Set(["Brandon Aubrey", "DaRon Bland", "Rashan Gary", "CeeDee Lamb", "George Pickens", "Dak Prescott", "Quinnen Williams", "Von Miller"]),
    aliases: new Map([["Kelvin Gilliam", "Kelvin Gilliam Jr."]]),
  },
  patriots: {
    globalName: "PATRIOTS_ROSTER",
    outputPath: "data/patriots-roster.js",
    sourceUrl: "https://www.patriots.com/team/players-roster/",
    depthSourceUrl: "https://www.espn.com/nfl/team/depth/_/name/ne/new-england-patriots",
    includedStatuses: new Set(["Active", "Reserve/Injured", "Reserve/Injured; Designated for Return", "Reserve/Non-Football Injury", "Reserve/Physically Unable to Perform", "Practice Squad"]),
    mostFamous: new Set(["A.J. Brown", "Christian Barmore", "Kevin Byard III", "Will Campbell", "Christian Gonzalez", "TreVeyon Henderson", "Drake Maye", "Milton Williams"]),
    aliases: new Map(),
    idPrefix: "patriots-",
    imageDirectory: "assets/patriots",
  },
};
const team = teams[teamId];
if (!team) throw new Error(`Unknown team "${teamId}". Choose ${Object.keys(teams).join(" or ")}.`);

function decodeHtml(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function getMatch(value, pattern, label) {
  const match = value.match(pattern);
  if (!match) throw new Error(`Could not find ${label} in a roster row.`);
  return decodeHtml(match[1]);
}

function slug(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function localDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseRosterSections(html) {
  const sections = [...html.matchAll(/<span class="nfl-o-roster__title-status">([\s\S]*?)<\/span>/g)].map((match) => ({
    index: match.index,
    status: decodeHtml(match[1]),
  }));
  if (!sections.length) throw new Error("Could not find the official roster sections.");
  return sections;
}

function parseRoster(html) {
  const sections = parseRosterSections(html);
  const rows = [...html.matchAll(/<tr><td class="sorter-lastname"[\s\S]*?<\/tr>/g)];
  return rows.map((rowMatch) => {
    const row = rowMatch[0];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) => decodeHtml(match[1]));
    const name = getMatch(row, /title="([^"]+)"/, "player name");
    const remoteImage = getMatch(row, /<img alt="" class="img-responsive" src="([^"]+)"/, "headshot").replace(
      /\/t_thumb_squared\/t_lazy\/f_(?:auto|png)\//,
      "/w_600,h_600,c_fill,g_face,q_auto:good/f_auto/",
    );
    if (remoteImage.includes("/t_lazy/")) throw new Error(`Could not convert the lazy headshot for ${name}.`);
    const profilePath = getMatch(row, /<a href="([^"]+)" title="[^"]+">/, "profile link");
    if (cells.length < 8) throw new Error(`Expected eight columns for ${name}; found ${cells.length}.`);
    const section = sections.findLast(({ index }) => index < rowMatch.index);
    if (!section) throw new Error(`Could not determine the roster section for ${name}.`);
    const playerSlug = profilePath.split("/").filter(Boolean).at(-1) || slug(name);
    return {
      id: `${team.idPrefix ?? ""}${playerSlug}`,
      name,
      number: cells[1],
      position: cells[2],
      height: cells[3],
      weight: Number(cells[4]),
      age: Number(cells[5]),
      experience: cells[6],
      college: cells[7],
      image: team.imageDirectory ? `${team.imageDirectory}/${playerSlug}.webp` : remoteImage,
      remoteImage,
      profile: new URL(profilePath, team.sourceUrl).href,
      status: section.status,
      tier: team.mostFamous.has(name) ? "famous" : "roster",
    };
  });
}

function parseTableRows(tableBody) {
  return [...tableBody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((rowMatch) =>
    [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cellMatch) => cellMatch[1]),
  );
}

function parseDepthChart(html) {
  const titles = [...html.matchAll(/<div class="Table__Title">([^<]+)<\/div>/g)].map((match) => ({ index: match.index, title: decodeHtml(match[1]) }));
  const placements = new Map();
  if (titles.length < 3) throw new Error("Could not find the offense, defense, and special-teams depth tables.");
  titles.forEach(({ index, title }, titleIndex) => {
    const nextIndex = titles[titleIndex + 1]?.index ?? html.length;
    const block = html.slice(index, nextIndex);
    const bodies = [...block.matchAll(/<tbody class="Table__TBODY">([\s\S]*?)<\/tbody>/g)].map((match) => match[1]);
    if (bodies.length < 2) throw new Error(`Could not read the ${title} depth table.`);
    const positions = parseTableRows(bodies[0]).map(([cell]) => decodeHtml(cell));
    const playerRows = parseTableRows(bodies[1]);
    positions.forEach((position, rowIndex) => {
      const cells = playerRows[rowIndex] ?? [];
      cells.forEach((cell, depthIndex) => {
        const playerMatch = cell.match(/<a[^>]+data-player-uid=[^>]*>([\s\S]*?)<\/a>/);
        if (!playerMatch) return;
        const name = decodeHtml(playerMatch[1]);
        const existing = placements.get(name) ?? [];
        existing.push({ depth: depthIndex + 1, position, unit: title === "Special Teams" ? "special teams" : "scrimmage" });
        placements.set(name, existing);
      });
    });
  });
  return placements;
}

function depthLabel(rank) {
  if (rank === 1) return "Starter";
  if (rank === 2) return "2nd string";
  if (rank === 3) return "3rd string";
  return `${rank}th string`;
}

function addDepthChart(players, placements) {
  return players.map((player) => {
    const playerPlacements = placements.get(team.aliases.get(player.name) ?? player.name) ?? [];
    const primary = playerPlacements.find(({ unit }) => unit === "scrimmage") ?? playerPlacements[0];
    return primary ? { ...player, depth: depthLabel(primary.depth), depthRank: primary.depth, depthPosition: primary.position } : player;
  });
}

async function fetchPage(url, label) {
  const response = await fetch(url, { headers: { "user-agent": "Player Decks roster updater (personal study project)" } });
  if (!response.ok) throw new Error(`${label} request failed with HTTP ${response.status}.`);
  return response.text();
}

async function cacheHeadshot(player) {
  if (!team.imageDirectory) return;
  const response = await fetch(player.remoteImage.replace("/f_auto/", "/f_webp/"), { headers: { accept: "image/webp" } });
  if (!response.ok) throw new Error(`Headshot request failed for ${player.name}: HTTP ${response.status}.`);
  const image = Buffer.from(await response.arrayBuffer());
  if (image.subarray(0, 4).toString("ascii") !== "RIFF" || image.subarray(8, 12).toString("ascii") !== "WEBP") throw new Error(`${player.name}: downloaded headshot is not WebP.`);
  await writeFile(resolve(projectDirectory, player.image), image);
}

async function main() {
  const [rosterHtml, depthHtml] = await Promise.all([fetchPage(team.sourceUrl, "Roster"), fetchPage(team.depthSourceUrl, "Depth chart")]);
  const officialRows = parseRoster(rosterHtml);
  const players = addDepthChart(officialRows.filter(({ status }) => team.includedStatuses.has(status)), parseDepthChart(depthHtml));
  if (players.length < 50) throw new Error(`Only found ${players.length} players; the official markup may have changed.`);
  const depthCount = players.filter(({ depth }) => depth).length;
  if (depthCount < 40) throw new Error(`Only matched ${depthCount} players to the published depth chart.`);
  if (players.filter(({ tier }) => tier === "famous").length !== 8) throw new Error("The Most famous group must resolve to eight rostered players.");
  if (team.imageDirectory) {
    await mkdir(resolve(projectDirectory, team.imageDirectory), { recursive: true });
    await Promise.all(players.map(cacheHeadshot));
  }
  const statusCounts = Object.fromEntries([...new Set(players.map(({ status }) => status))].map((status) => [status, players.filter((player) => player.status === status).length]));
  const payload = {
    meta: {
      source: team.sourceUrl,
      depthSource: team.depthSourceUrl,
      updated: localDate(),
      depthUpdated: localDate(),
      season: new Date().getFullYear(),
      statusCounts,
    },
    players: players.map(({ remoteImage, ...player }) => player),
  };
  const outputPath = resolve(projectDirectory, team.outputPath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `// Generated by scripts/update-roster.mjs --team=${teamId}.\nwindow.${team.globalName} = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
  console.log(`Wrote ${players.length} ${teamId} players (${depthCount} with depth) to ${outputPath}`);
  const excludedCounts = officialRows.filter(({ status }) => !team.includedStatuses.has(status)).reduce((groups, player) => {
    groups[player.status] = (groups[player.status] ?? 0) + 1;
    return groups;
  }, {});
  for (const [status, count] of Object.entries(excludedCounts)) console.log(`Excluded ${count} listed as ${status}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
