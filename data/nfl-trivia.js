(() => {
  const updated = "2026-09-01";
  const sources = {
    divisions: {
      title: "2026 NFL Division Standings",
      url: "https://www.nfl.com/standings/division/2026/reg",
    },
    schedule: {
      title: "Making the NFL Schedule",
      url: "https://operations.nfl.com/calendar-events/nfl-schedule/making-the-schedule",
    },
  };
  const divisions = [
    { id: "afc-east", name: "AFC East", teams: ["Buffalo Bills", "Miami Dolphins", "New England Patriots", "New York Jets"] },
    { id: "afc-north", name: "AFC North", teams: ["Baltimore Ravens", "Cincinnati Bengals", "Cleveland Browns", "Pittsburgh Steelers"] },
    { id: "afc-south", name: "AFC South", teams: ["Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Tennessee Titans"] },
    { id: "afc-west", name: "AFC West", teams: ["Denver Broncos", "Kansas City Chiefs", "Las Vegas Raiders", "Los Angeles Chargers"] },
    { id: "nfc-east", name: "NFC East", teams: ["Dallas Cowboys", "New York Giants", "Philadelphia Eagles", "Washington Commanders"] },
    { id: "nfc-north", name: "NFC North", teams: ["Chicago Bears", "Detroit Lions", "Green Bay Packers", "Minnesota Vikings"] },
    { id: "nfc-south", name: "NFC South", teams: ["Atlanta Falcons", "Carolina Panthers", "New Orleans Saints", "Tampa Bay Buccaneers"] },
    { id: "nfc-west", name: "NFC West", teams: ["Arizona Cardinals", "Los Angeles Rams", "San Francisco 49ers", "Seattle Seahawks"] },
  ];

  const cited = (question, sourceId, evidence) => ({
    ...question,
    sourceId,
    sourceTitle: sources[sourceId].title,
    sourceUrl: sources[sourceId].url,
    evidence,
    verifiedOn: updated,
  });
  const divisionQuestions = divisions.flatMap((division, index) => {
    const otherDivisions = divisions.filter((candidate) => candidate.name !== division.name);
    const sameConference = otherDivisions.filter((candidate) => candidate.name.startsWith(division.name.slice(0, 3)));
    const team = division.teams[index % division.teams.length];
    return [
      cited({
        id: `nfl-${division.id}-identify`,
        pack: "divisions",
        label: "Divisions",
        prompt: `Which division includes the ${team}?`,
        correct: division.name,
        accepted: [division.name, division.name.replace("AFC", "American Football Conference").replace("NFC", "National Football Conference")],
        distractors: sameConference.slice(0, 3).map((candidate) => candidate.name),
        detail: `${team} play in the ${division.name}.`,
      }, "divisions", `The official division standings place ${team} in the ${division.name}.`),
      cited({
        id: `nfl-${division.id}-teams`,
        pack: "divisions",
        label: "Divisions",
        prompt: `Name the four teams in the ${division.name}.`,
        correct: division.teams.join(", "),
        correctDisplay: division.teams.join(", "),
        expected: division.teams,
        answerType: "set",
        distractors: otherDivisions.slice(0, 3).map((candidate) => candidate.teams.join(", ")),
        detail: division.teams.join(", "),
      }, "divisions", `The official standings group these four clubs under the ${division.name}.`),
    ];
  });
  const structureQuestions = [
    ["team-count", "structure", "How many teams are in the NFL?", "32", ["30", "34", "36"], "The league has 32 teams."],
    ["conference-count", "structure", "How many conferences are in the NFL?", "2", ["4", "6", "8"], "The NFL is divided into the AFC and NFC."],
    ["conference-size", "structure", "How many teams are in each conference?", "16", ["12", "14", "18"], "Each conference contains 16 teams."],
    ["division-count", "structure", "How many divisions are in each conference?", "4", ["2", "6", "8"], "Each conference has East, North, South, and West divisions."],
    ["games-per-team", "schedule", "How many regular-season games does each team play?", "17", ["16", "18", "20"], "Each team plays 17 regular-season games."],
    ["season-weeks", "schedule", "How many weeks are in the NFL regular season?", "18", ["16", "17", "20"], "The 17 games are played across an 18-week season."],
    ["league-matchups", "schedule", "How many regular-season matchups are on the full NFL schedule?", "272", ["256", "264", "288"], "The full regular-season schedule contains 272 games."],
    ["division-games", "schedule", "How many regular-season games does each team play against division opponents?", "6", ["4", "8", "10"], "Each team plays its three division rivals twice, for six games."],
  ].map(([id, pack, prompt, correct, distractors, detail]) => cited({
    id: `nfl-${id}`,
    pack,
    label: pack === "schedule" ? "Schedule" : "League structure",
    prompt,
    correct,
    accepted: [correct],
    distractors,
    detail,
  }, "schedule", detail));

  window.NFL_TRIVIA = {
    meta: { updated, sources },
    packs: [
      { id: "mixed", title: "Mixed" },
      { id: "divisions", title: "Divisions" },
      { id: "structure", title: "League structure" },
      { id: "schedule", title: "Schedule" },
    ],
    questions: [...divisionQuestions, ...structureQuestions],
  };
})();
