#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://www.dallascowboys.com/team/players-roster/";
const DEPTH_SOURCE_URL =
  "https://www.espn.com/nfl/team/depth/_/name/dal/dallas-cowboys";
const INCLUDED_ROSTER_STATUSES = new Set([
  "Active",
  "Reserve/Designated to Return",
  "Reserve/Injured",
  "Practice Squad",
]);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, "../data/roster.js");

const mostFamous = new Set([
  "Brandon Aubrey",
  "DaRon Bland",
  "Rashan Gary",
  "CeeDee Lamb",
  "George Pickens",
  "Dak Prescott",
  "Quinnen Williams",
  "Von Miller",
]);

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

function parseRosterSections(html) {
  const sections = [
    ...html.matchAll(
      /<span class="nfl-o-roster__title-status">([\s\S]*?)<\/span>/g,
    ),
  ].map((match) => ({
    index: match.index,
    status: decodeHtml(match[1]),
  }));

  if (!sections.length) {
    throw new Error("Could not find the official roster sections.");
  }

  return sections;
}

function parseRoster(html) {
  const sections = parseRosterSections(html);
  const rows = [...html.matchAll(/<tr><td class="sorter-lastname"[\s\S]*?<\/tr>/g)];

  return rows.map((rowMatch) => {
    const row = rowMatch[0];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) =>
      decodeHtml(match[1]),
    );
    const name = getMatch(row, /title="([^"]+)"/, "player name");
    const image = getMatch(
      row,
      /<img alt="" class="img-responsive" src="([^"]+)"/,
      "headshot",
    ).replace(
      /\/t_thumb_squared\/t_lazy\/f_(?:auto|png)\//,
      "/w_600,h_600,c_fill,g_face,q_auto:good/f_auto/",
    );

    if (image.includes("/t_lazy/")) {
      throw new Error(`Could not convert the lazy headshot for ${name}.`);
    }
    const profilePath = getMatch(
      row,
      /<a href="([^"]+)" title="[^"]+">/,
      "profile link",
    );

    if (cells.length < 8) {
      throw new Error(`Expected eight columns for ${name}; found ${cells.length}.`);
    }

    const section = sections.findLast(({ index }) => index < rowMatch.index);
    if (!section) {
      throw new Error(`Could not determine the roster section for ${name}.`);
    }

    return {
      id: profilePath.split("/").filter(Boolean).at(-1),
      name,
      number: cells[1],
      position: cells[2],
      height: cells[3],
      weight: Number(cells[4]),
      age: Number(cells[5]),
      experience: cells[6],
      college: cells[7],
      image,
      profile: new URL(profilePath, SOURCE_URL).href,
      status: section.status,
      tier: mostFamous.has(name) ? "famous" : "roster",
    };
  });
}

function parseTableRows(tableBody) {
  return [...tableBody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(
    (rowMatch) =>
      [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
        (cellMatch) => cellMatch[1],
      ),
  );
}

function parseDepthChart(html) {
  const titles = [
    ...html.matchAll(/<div class="Table__Title">([^<]+)<\/div>/g),
  ].map((match) => ({ index: match.index, title: decodeHtml(match[1]) }));
  const placements = new Map();

  if (titles.length < 3) {
    throw new Error("Could not find the offense, defense, and special-teams depth tables.");
  }

  titles.forEach(({ index, title }, titleIndex) => {
    const nextIndex = titles[titleIndex + 1]?.index ?? html.length;
    const block = html.slice(index, nextIndex);
    const bodies = [
      ...block.matchAll(/<tbody class="Table__TBODY">([\s\S]*?)<\/tbody>/g),
    ].map((match) => match[1]);

    if (bodies.length < 2) {
      throw new Error(`Could not read the ${title} depth table.`);
    }

    const positions = parseTableRows(bodies[0]).map(([cell]) => decodeHtml(cell));
    const playerRows = parseTableRows(bodies[1]);

    positions.forEach((position, rowIndex) => {
      const cells = playerRows[rowIndex] ?? [];
      cells.forEach((cell, depthIndex) => {
        const playerMatch = cell.match(/<a[^>]+data-player-uid=[^>]*>([\s\S]*?)<\/a>/);
        if (!playerMatch) return;

        const name = decodeHtml(playerMatch[1]);
        const placement = {
          depth: depthIndex + 1,
          position,
          unit: title === "Special Teams" ? "special teams" : "scrimmage",
        };
        const existing = placements.get(name) ?? [];
        existing.push(placement);
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
  const aliases = new Map([["Kelvin Gilliam", "Kelvin Gilliam Jr."]]);

  return players.map((player) => {
    const playerPlacements = placements.get(aliases.get(player.name) ?? player.name) ?? [];
    const primary =
      playerPlacements.find(({ unit }) => unit === "scrimmage") ?? playerPlacements[0];
    if (!primary) return player;

    return {
      ...player,
      depth: depthLabel(primary.depth),
      depthRank: primary.depth,
      depthPosition: primary.position,
    };
  });
}

async function fetchPage(url, label) {
  const response = await fetch(url, {
    headers: { "user-agent": "Cowboys Roster Trainer updater (personal study project)" },
  });
  if (!response.ok) throw new Error(`${label} request failed with HTTP ${response.status}.`);
  return response.text();
}

async function main() {
  const [rosterHtml, depthHtml] = await Promise.all([
    fetchPage(SOURCE_URL, "Roster"),
    fetchPage(DEPTH_SOURCE_URL, "Depth chart"),
  ]);
  const placements = parseDepthChart(depthHtml);
  const officialRows = parseRoster(rosterHtml);
  const players = addDepthChart(
    officialRows.filter(({ status }) => INCLUDED_ROSTER_STATUSES.has(status)),
    placements,
  );
  if (players.length < 50) {
    throw new Error(`Only found ${players.length} players; the official markup may have changed.`);
  }

  const statusCounts = Object.fromEntries(
    [...new Set(players.map(({ status }) => status))].map((status) => [
      status,
      players.filter((player) => player.status === status).length,
    ]),
  );
  const depthCount = players.filter(({ depth }) => depth).length;
  if (depthCount < 40) {
    throw new Error(`Only matched ${depthCount} players to the published depth chart.`);
  }

  const payload = {
    meta: {
      source: SOURCE_URL,
      depthSource: DEPTH_SOURCE_URL,
      updated: new Date().toISOString().slice(0, 10),
      depthUpdated: new Date().toISOString().slice(0, 10),
      season: new Date().getFullYear(),
      statusCounts,
    },
    players,
  };

  const output = `// Generated by scripts/update-roster.mjs.\nwindow.COWBOYS_ROSTER = ${JSON.stringify(payload, null, 2)};\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");
  console.log(
    `Wrote ${players.length} rostered players (${depthCount} with depth) to ${outputPath}`,
  );
  const excludedCounts = officialRows
    .filter(({ status }) => !INCLUDED_ROSTER_STATUSES.has(status))
    .reduce((groups, player) => {
      groups[player.status] = [...(groups[player.status] ?? []), player];
      return groups;
    }, {});
  for (const [status, excluded] of Object.entries(excludedCounts)) {
    console.log(`Excluded ${excluded.length} listed as ${status}.`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
