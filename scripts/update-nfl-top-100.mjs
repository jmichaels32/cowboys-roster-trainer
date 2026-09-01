#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const outputPath = resolve(projectDirectory, "data/nfl-top-100.js");
const imageDirectory = resolve(projectDirectory, "assets/nfl-top-100");
const verifiedOn = new Date().toISOString().slice(0, 10);
const ranges = ["100-91", "90-81", "80-71", "70-61", "60-51", "50-41", "40-31", "30-21", "20-11", "10-1"];
const sourceUrls = ranges.map((range) => `https://www.nfl.com/news/top-100-players-of-2026-nos-${range}`);
const pendingSourceUrl = "https://www.nfl.com/news/nfl-top-100-countdown-continues-who-are-contenders-for-no-1-spot";
const pendingCandidates = [
  { slug: "josh-allen", name: "Josh Allen", team: "BUF", position: "QB" },
  { slug: "myles-garrett", name: "Myles Garrett", team: "LAR", position: "OLB" },
  { slug: "bijan-robinson", name: "Bijan Robinson", team: "ATL", position: "RB" },
];
const positionOverrides = { "nik-bonitto": "OLB" };
const teamNames = {
  ARI: "Arizona Cardinals", AZ: "Arizona Cardinals", ATL: "Atlanta Falcons", BAL: "Baltimore Ravens", BUF: "Buffalo Bills",
  CAR: "Carolina Panthers", CHI: "Chicago Bears", CIN: "Cincinnati Bengals", CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys", DEN: "Denver Broncos", DET: "Detroit Lions", GB: "Green Bay Packers",
  HOU: "Houston Texans", IND: "Indianapolis Colts", JAC: "Jacksonville Jaguars", JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs", LAC: "Los Angeles Chargers", LAR: "Los Angeles Rams", LV: "Las Vegas Raiders",
  MIA: "Miami Dolphins", MIN: "Minnesota Vikings", NE: "New England Patriots", NO: "New Orleans Saints",
  NYG: "New York Giants", NYJ: "New York Jets", PHI: "Philadelphia Eagles", PIT: "Pittsburgh Steelers",
  SEA: "Seattle Seahawks", SF: "San Francisco 49ers", TB: "Tampa Bay Buccaneers", TEN: "Tennessee Titans",
  WAS: "Washington Commanders",
};

function decodeHtml(value) {
  return value
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "Player Decks offline data updater" } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

function parseRankedPlayers(html, sourceUrl) {
  const rankTiles = [...html.matchAll(/<div aria-label="[^"]*? (\d{1,3})"[^>]*role="group">/g)];
  return rankTiles.map((rankTile, index) => {
    const chunk = html.slice(rankTile.index, rankTiles[index + 1]?.index ?? html.length);
    const profilePath = chunk.match(/aria-label="View details for [^"]+"[\s\S]*?href="(\/players\/[^"]+)"/)?.[1];
    const imageUrl = chunk.match(/<img alt="" src="([^"]+)"/)?.[1];
    const encodedName = chunk.match(/line-clamp-2">([^<]+)<\/div>/)?.[1];
    const teamAndPosition = chunk.match(/gap-x-2[^>]*><div>([A-Z]{2,3})<\/div>(?:<div[^>]*><\/div><div>([A-Z]{1,3})<\/div>)?/);
    if (!profilePath || !imageUrl || !encodedName || !teamAndPosition) throw new Error(`Could not parse rank ${rankTile[1]} from ${sourceUrl}`);
    const slug = profilePath.split("/").filter(Boolean).at(-1);
    const team = teamAndPosition[1] === "JAX" ? "JAC" : teamAndPosition[1];
    const position = teamAndPosition[2] ?? positionOverrides[slug];
    if (!position) throw new Error(`No position found for ${decodeHtml(encodedName)}.`);
    return {
      id: `nfl-top-100-${slug}`,
      name: decodeHtml(encodedName),
      team,
      teamName: teamNames[team] ?? team,
      position,
      rank: Number(rankTile[1]),
      rankLabel: `#${rankTile[1]}`,
      image: `assets/nfl-top-100/${slug}.webp`,
      imageUrl: imageUrl.replace("c_thumb,f_auto,h_56,dpr_2.0,q_auto,w_56", "c_fill,f_webp,g_face,h_500,q_auto,w_500"),
      profile: `https://www.nfl.com${profilePath}`,
      sourceUrl,
    };
  });
}

async function pendingPlayer(candidate) {
  const profile = `https://www.nfl.com/players/${candidate.slug}`;
  const html = await fetchText(profile);
  const imageUrl = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  if (!imageUrl) throw new Error(`No headshot found for ${candidate.name}`);
  return {
    id: `nfl-top-100-${candidate.slug}`,
    ...candidate,
    teamName: teamNames[candidate.team],
    rank: null,
    rankLabel: "Top 3",
    image: `assets/nfl-top-100/${candidate.slug}.webp`,
    imageUrl: imageUrl.replace("t_headshot_desktop", "c_fill,f_webp,g_face,h_500,q_auto,w_500"),
    profile,
    sourceUrl: pendingSourceUrl,
  };
}

async function cacheHeadshot(player) {
  const response = await fetch(player.imageUrl, { headers: { accept: "image/webp" } });
  if (!response.ok) throw new Error(`Failed to download ${player.name}: ${response.status}`);
  const image = Buffer.from(await response.arrayBuffer());
  if (image.subarray(0, 4).toString("ascii") !== "RIFF" || image.subarray(8, 12).toString("ascii") !== "WEBP") {
    throw new Error(`${player.name}: downloaded headshot is not WebP`);
  }
  await writeFile(resolve(projectDirectory, player.image), image);
}

await mkdir(imageDirectory, { recursive: true });
const rankedPages = await Promise.all(sourceUrls.map(async (sourceUrl) => parseRankedPlayers(await fetchText(sourceUrl), sourceUrl)));
const rankedPlayers = rankedPages.flat();
const ranks = new Set(rankedPlayers.map((player) => player.rank));
if (ranks.size !== rankedPlayers.length || rankedPlayers.some((player) => player.rank < 1 || player.rank > 100)) {
  throw new Error("Published Top 100 ranks are duplicated or invalid.");
}

const publishedIds = new Set(rankedPlayers.map((player) => player.id));
const pendingPlayers = (
  await Promise.all(pendingCandidates.filter((candidate) => !publishedIds.has(`nfl-top-100-${candidate.slug}`)).map(pendingPlayer))
).slice(0, 100 - rankedPlayers.length);
const players = [...pendingPlayers, ...rankedPlayers].sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0) || left.name.localeCompare(right.name));
if (players.length !== 100) throw new Error(`Expected 100 players, found ${players.length}.`);

await Promise.all(players.map(cacheHeadshot));

const output = {
  meta: {
    year: 2026,
    updated: verifiedOn,
    title: "NFL Top 100 Players of 2026",
    sourceTitle: "NFL Top 100 Players of 2026",
    sourceUrls,
    pendingSourceTitle: "NFL Top 100 countdown: contenders for No. 1",
    pendingSourceUrl,
    pendingRanks: pendingPlayers.length,
    rankingNote: pendingPlayers.length
      ? `Ranks ${pendingPlayers.length + 1}-100 are published. The final ${pendingPlayers.length} players are confirmed in the Top ${pendingPlayers.length}, with exact order pending.`
      : "All 100 rankings are published.",
  },
  players: players.map(({ imageUrl, ...player }) => player),
};

await writeFile(outputPath, `window.NFL_TOP_100 = ${JSON.stringify(output, null, 2)};\n`);
console.log(`Updated ${players.length} NFL Top 100 players and cached ${players.length} offline headshots.`);
