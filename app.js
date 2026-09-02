(() => {
  "use strict";

  const rosterData = window.COWBOYS_ROSTER;
  if (!rosterData?.players?.length) {
    document.body.innerHTML =
      '<main class="narrow-shell"><h1>Roster unavailable</h1><p>The roster data did not load. Try refreshing the page.</p></main>';
    return;
  }

  const players = rosterData.players;
  const patriotsData = window.PATRIOTS_ROSTER ?? { meta: {}, players: [] };
  const patriotsPlayers = patriotsData.players ?? [];
  const nflTop100Data = window.NFL_TOP_100 ?? { meta: {}, players: [] };
  const nflTop100Players = nflTop100Data.players ?? [];
  const collegeMarks = window.COLLEGE_MARKS ?? {};
  const cowboysTriviaData = window.COWBOYS_TRIVIA ?? { packs: [], questions: [] };
  const patriotsTriviaData = window.PATRIOTS_TRIVIA ?? { packs: [], questions: [] };
  const nflTriviaData = window.NFL_TRIVIA ?? { packs: [], questions: [] };
  const STORAGE_KEY = "cowboys-roster-lab-v1";
  const PLAYER_DECK_KEY = "player-decks-selected-v1";
  const STUDY_SETTINGS_KEY = "cowboys-study-settings-v1";
  const OFFENSE = new Set(["QB", "RB", "FB", "WR", "TE", "C", "G", "T", "OT", "OG", "OL"]);
  const DEFENSE = new Set(["DE", "DT", "DL", "NT", "OLB", "ILB", "MLB", "LB", "CB", "S", "FS", "SS", "SAF", "DB"]);
  const COWBOYS_SKILLS = ["faces", "numbers", "positions", "colleges"];
  const NFL_SKILLS = ["faces", "teams", "positions", "rankings"];
  const SKILL_LABELS = {
    faces: "face & name",
    numbers: "number",
    positions: "position",
    colleges: "college",
    teams: "team",
    rankings: "ranking",
  };
  const VERIFICATION_METHOD = "typed-recall-v1";
  const POSITION_NAMES = {
    QB: "Quarterback",
    RB: "Running back",
    FB: "Fullback",
    WR: "Wide receiver",
    TE: "Tight end",
    C: "Center",
    G: "Guard",
    OG: "Offensive guard",
    T: "Tackle",
    OL: "Offensive line",
    OT: "Offensive tackle",
    DE: "Defensive end",
    DL: "Defensive line",
    DT: "Defensive tackle",
    NT: "Nose tackle",
    OLB: "Outside linebacker",
    ILB: "Inside linebacker",
    MLB: "Middle linebacker",
    LB: "Linebacker",
    CB: "Cornerback",
    FS: "Free safety",
    SS: "Strong safety",
    SAF: "Safety",
    S: "Safety",
    DB: "Defensive back",
    K: "Kicker",
    P: "Punter",
    LS: "Long snapper",
  };

  const rosterGroups = [
    {
      id: "famous",
      title: "Most famous",
      filter: (player) => player.tier === "famous",
    },
    {
      id: "starters",
      title: "Starters",
      filter: (player) => player.depthRank === 1,
    },
    {
      id: "second-string",
      title: "2nd string",
      filter: (player) => player.depthRank === 2,
    },
    {
      id: "third-string",
      title: "3rd string",
      filter: (player) => player.depthRank === 3,
    },
    {
      id: "offense",
      title: "Offense",
      filter: (player) => OFFENSE.has(player.position),
    },
    {
      id: "defense",
      title: "Defense",
      filter: (player) => DEFENSE.has(player.position),
    },
    {
      id: "practice-squad",
      title: "Practice squad",
      filter: (player) => player.status === "Practice Squad",
    },
    {
      id: "all",
      title: "Full roster",
      filter: () => true,
    },
  ];

  const nflTop100Groups = [10, 25, 50, 75, 100].map((limit) => ({
    id: `top-${limit}`,
    title: `Top ${limit}`,
    filter: (player) => player.rank === null || player.rank <= limit,
  }));

  const playerDecks = [
    {
      id: "cowboys",
      title: "Cowboys roster",
      mark: "DAL",
      logo: "assets/team-logos/cowboys.png",
      players,
      groups: rosterGroups,
      skills: COWBOYS_SKILLS,
      studyTypes: ["players", "lineup", "trivia"],
      trivia: cowboysTriviaData,
      updated: rosterData.meta.updated,
      source: rosterData.meta.source,
      sourceLabel: "official Cowboys roster",
      browseable: true,
      available: true,
    },
    {
      id: "patriots",
      title: "Patriots roster",
      mark: "NE",
      logo: "assets/team-logos/patriots.png",
      players: patriotsPlayers,
      groups: rosterGroups,
      skills: COWBOYS_SKILLS,
      studyTypes: ["players", "lineup", "trivia"],
      trivia: patriotsTriviaData,
      updated: patriotsData.meta.updated,
      source: patriotsData.meta.source,
      sourceLabel: "official Patriots roster",
      browseable: true,
      available: patriotsPlayers.length >= 50,
    },
    {
      id: "nfl-top-100",
      title: "NFL Top 100",
      mark: "100",
      players: nflTop100Players,
      groups: nflTop100Groups,
      skills: NFL_SKILLS,
      studyTypes: ["players", "trivia"],
      trivia: nflTriviaData,
      updated: nflTop100Data.meta.updated,
      source: nflTop100Data.meta.sourceUrls?.[0],
      sourceLabel: "official NFL countdown",
      browseable: false,
      available: nflTop100Players.length === 100,
    },
  ].map((deck) => ({ ...deck, size: deck.players.length }));

  const cowboysModes = [
    { id: "faces", title: "Faces & names" },
    { id: "numbers", title: "Jersey numbers" },
    { id: "positions", title: "Positions" },
    { id: "colleges", title: "Colleges" },
    { id: "mixed", title: "Mixed facts" },
  ];
  const nflModes = [
    { id: "faces", title: "Faces & names" },
    { id: "teams", title: "Teams" },
    { id: "positions", title: "Positions" },
    { id: "rankings", title: "Rankings" },
    { id: "mixed", title: "Mixed facts" },
  ];

  const stages = [
    { id: "recognition", title: "Recognition" },
    { id: "recall", title: "Typed recall" },
    { id: "mastery", title: "Mastery check" },
  ];

  const knowledgeStages = stages.slice(0, 2);
  const studyTypes = [
    { id: "players", title: "Players", unit: "cards" },
    { id: "lineup", title: "Lineup", unit: "questions" },
    { id: "trivia", title: "Trivia", unit: "questions" },
  ];
  const lineupPacks = [
    { id: "mixed", title: "Mixed" },
    { id: "offense", title: "Offense" },
    { id: "defense", title: "Defense" },
    { id: "special-teams", title: "Special teams" },
    { id: "depth-chart", title: "Depth chart" },
  ];

  const defaultStudySettings = {
    players: { packageId: "famous", stage: "recognition", mode: "mixed", length: 5 },
    lineup: { packageId: "mixed", stage: "recognition", mode: "mixed", length: 5 },
    trivia: { packageId: "mixed", stage: "recognition", mode: "mixed", length: 5 },
  };

  const defaultProgress = {
    players: {},
    knowledge: {},
    practiceCombinations: {},
    totalAnswers: 0,
    totalCorrect: 0,
    sessions: 0,
    daily: {},
  };
  let progress = loadProgress();
  const savedStudySettings = loadStudySettings();
  const state = {
    playerDeckId: loadPlayerDeckSelection(),
    studyType: "players",
    studySettings: savedStudySettings,
    deckId: savedStudySettings.players.packageId,
    mode: savedStudySettings.players.mode,
    stage: savedStudySettings.players.stage,
    length: savedStudySettings.players.length,
    questions: [],
    questionIndex: 0,
    score: 0,
    answers: [],
    answerLocked: false,
    practiceCombinationKey: null,
    practiceCombinationStarted: false,
    rosterFilters: { group: "all", position: "all", sort: "name" },
  };

  const elements = {
    views: [...document.querySelectorAll("[data-view]")],
    footer: document.querySelector(".site-footer"),
    headerBack: document.querySelector("#header-back"),
    headerContext: document.querySelector("#header-context"),
    playerDeckList: document.querySelector("#player-deck-list"),
    browsePlayers: document.querySelector("#browse-players"),
    dataDate: document.querySelector("#data-date"),
    dataSource: document.querySelector("#data-source"),
    setupView: document.querySelector('[data-view="setup"]'),
    studyTypeSwitch: document.querySelector(".study-type-switch"),
    studyTypeButtons: [...document.querySelectorAll("[data-study-type]")],
    setupPackage: document.querySelector("#setup-package"),
    setupTitle: document.querySelector("#setup-title"),
    setupStageValue: document.querySelector("#setup-stage-value"),
    setupModeValue: document.querySelector("#setup-mode-value"),
    setupContentChoice: document.querySelector("#setup-content-choice"),
    setupLengthValue: document.querySelector("#setup-length-value"),
    setupHistory: document.querySelector("#setup-history"),
    setupStart: document.querySelector("#setup-start"),
    sessionOptionDialog: document.querySelector("#session-option-dialog"),
    sessionOptionTitle: document.querySelector("#session-option-title"),
    sessionOptionList: document.querySelector("#session-option-list"),
    gameDeckName: document.querySelector("#game-deck-name"),
    gameProgressText: document.querySelector("#game-progress-text"),
    gameProgress: document.querySelector(".game-progress"),
    gameProgressBar: document.querySelector("#game-progress-bar"),
    gameScore: document.querySelector("#game-score"),
    questionCard: document.querySelector(".question-card"),
    questionType: document.querySelector("#question-type"),
    questionTitle: document.querySelector("#question-title"),
    questionVisual: document.querySelector("#question-visual"),
    answerGrid: document.querySelector("#answer-grid"),
    answerFeedback: document.querySelector("#answer-feedback"),
    nextWrap: document.querySelector("#next-wrap"),
    nextButton: document.querySelector("#next-wrap button"),
    resultMark: document.querySelector("#result-mark"),
    resultsTitle: document.querySelector("#results-title"),
    resultScore: document.querySelector("#result-score"),
    resultNote: document.querySelector("#result-note"),
    nextStageButton: document.querySelector("#next-stage-button"),
    missedSection: document.querySelector("#missed-section"),
    missedList: document.querySelector("#missed-list"),
    rosterView: document.querySelector('[data-view="roster"]'),
    rosterSearch: document.querySelector("#roster-search"),
    rosterSearchClear: document.querySelector("#roster-search-clear"),
    rosterControlsForm: document.querySelector("#roster-controls-form"),
    positionFilterOptions: document.querySelector("#position-filter-options"),
    rosterControlsDialog: document.querySelector("#roster-controls-dialog"),
    rosterControlsButton: document.querySelector("#roster-controls-button"),
    rosterFilterCount: document.querySelector("#roster-filter-count"),
    rosterCount: document.querySelector("#roster-count"),
    playerGrid: document.querySelector("#player-grid"),
  };

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && typeof saved === "object" ? { ...defaultProgress, ...saved } : { ...defaultProgress };
    } catch {
      return { ...defaultProgress };
    }
  }

  function loadPlayerDeckSelection() {
    try {
      const saved = localStorage.getItem(PLAYER_DECK_KEY);
      return playerDecks.some((deck) => deck.id === saved) ? saved : "cowboys";
    } catch {
      return "cowboys";
    }
  }

  function loadStudySettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STUDY_SETTINGS_KEY));
      return Object.fromEntries(
        Object.entries(defaultStudySettings).map(([studyType, defaults]) => [
          studyType,
          { ...defaults, ...(saved?.[studyType] ?? {}) },
        ]),
      );
    } catch {
      return structuredClone(defaultStudySettings);
    }
  }

  function saveStudySettings() {
    try {
      localStorage.setItem(STUDY_SETTINGS_KEY, JSON.stringify(state.studySettings));
    } catch {
      // Study choices remain available for the current session.
    }
  }

  function storeActiveStudySettings() {
    state.studySettings[state.studyType] = {
      packageId: state.studyType === "players" ? state.deckId : state.studySettings[state.studyType].packageId,
      stage: state.stage,
      mode: state.mode,
      length: state.length,
    };
    saveStudySettings();
  }

  function restoreStudySettings(studyType) {
    const settings = state.studySettings[studyType] ?? defaultStudySettings[studyType];
    state.studyType = studyType;
    if (studyType === "players") state.deckId = settings.packageId;
    state.stage = settings.stage;
    state.mode = settings.mode;
    state.length = settings.length;
  }

  function setActivePackageId(packageId) {
    if (state.studyType === "players") state.deckId = packageId;
    state.studySettings[state.studyType].packageId = packageId;
  }

  function getActivePackageId() {
    return state.studyType === "players" ? state.deckId : state.studySettings[state.studyType].packageId;
  }

  function getPracticeCombinationKey() {
    const content =
      state.studyType === "players"
        ? state.stage === "mastery"
          ? "all-facts"
          : state.mode
        : null;
    return JSON.stringify([
      "v1",
      state.playerDeckId,
      state.studyType,
      getActivePackageId(),
      state.stage,
      content,
    ]);
  }

  function getPracticeCombinationStats(key = getPracticeCombinationKey()) {
    const saved = progress.practiceCombinations?.[key] ?? {};
    return {
      sessions: saved.sessions ?? 0,
      answers: saved.answers ?? 0,
      correct: saved.correct ?? 0,
    };
  }

  function recordPracticeCombination(correct) {
    const key = state.practiceCombinationKey;
    if (!key) return;
    const current = getPracticeCombinationStats(key);
    progress.practiceCombinations = progress.practiceCombinations ?? {};
    progress.practiceCombinations[key] = {
      sessions: current.sessions + (state.practiceCombinationStarted ? 0 : 1),
      answers: current.answers + 1,
      correct: current.correct + (correct ? 1 : 0),
    };
    state.practiceCombinationStarted = true;
  }

  function savePlayerDeckSelection() {
    try {
      localStorage.setItem(PLAYER_DECK_KEY, state.playerDeckId);
    } catch {
      // Deck selection remains available for the current session.
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Training still works when browser storage is disabled.
    }
  }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getTodayStats() {
    const saved = progress.daily?.[localDateKey()] ?? {};
    return {
      questions: saved.questions ?? 0,
      correct: saved.correct ?? 0,
      sessions: saved.sessions ?? 0,
      verifiedPlayers: Array.isArray(saved.verifiedPlayers) ? saved.verifiedPlayers : [],
      outcomes: Array.isArray(saved.outcomes) ? saved.outcomes : [],
      stages: {
        recognition: { questions: 0, correct: 0, ...saved.stages?.recognition },
        recall: { questions: 0, correct: 0, ...saved.stages?.recall },
        mastery: { questions: 0, correct: 0, ...saved.stages?.mastery },
      },
    };
  }

  function setTodayStats(stats) {
    progress.daily = { ...(progress.daily ?? {}), [localDateKey()]: stats };
  }

  function updateDailyAnswer(correct, stage) {
    const today = getTodayStats();
    today.questions += 1;
    today.correct += correct ? 1 : 0;
    today.outcomes = [...today.outcomes, correct ? 1 : 0].slice(-200);
    today.stages[stage].questions += 1;
    today.stages[stage].correct += correct ? 1 : 0;
    setTodayStats(today);
  }

  function addDailyVerifiedPlayer(playerId) {
    const today = getTodayStats();
    if (!today.verifiedPlayers.includes(playerId)) today.verifiedPlayers.push(playerId);
    setTodayStats(today);
  }

  function h(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function shuffle(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function getPlayerDeck() {
    return playerDecks.find((deck) => deck.id === state.playerDeckId) ?? playerDecks[0];
  }

  function getAllPlayers() {
    return getPlayerDeck().players;
  }

  function getSkills() {
    return getPlayerDeck().skills;
  }

  function getModes() {
    return state.playerDeckId === "nfl-top-100" ? nflModes : cowboysModes;
  }

  function getTriviaData() {
    return getPlayerDeck().trivia;
  }

  function getPlayerGroups() {
    return getPlayerDeck().groups;
  }

  function getSupportedStudyTypes() {
    return getPlayerDeck().studyTypes;
  }

  function getDeck(deckId = state.deckId) {
    const groups = getPlayerGroups();
    return groups.find((deck) => deck.id === deckId) ?? groups[0];
  }

  function getDeckPlayers(deck = getDeck()) {
    return getAllPlayers().filter(deck.filter);
  }

  function activeDepthPlayers(depthPosition) {
    return getAllPlayers()
      .filter(
        (player) =>
          player.depthPosition === depthPosition &&
          player.status !== "Practice Squad" &&
          Number.isFinite(player.depthRank),
      )
      .sort((left, right) => left.depthRank - right.depthRank || left.name.localeCompare(right.name));
  }

  function playerAtDepth(depthPosition, rank) {
    return activeDepthPlayers(depthPosition).find((player) => player.depthRank === rank);
  }

  function nameDistractors(correctNames, pool = getAllPlayers()) {
    return shuffle(
      pool
        .filter((player) => !correctNames.includes(player.name) && player.status !== "Practice Squad")
        .map((player) => player.name),
    ).slice(0, 3);
  }

  function lineupNameQuestion(id, pack, prompt, player, visualLabel, detail, pool) {
    if (!player) return null;
    return {
      id: state.playerDeckId === "cowboys" ? `lineup-${id}` : `${state.playerDeckId}-lineup-${id}`,
      kind: "knowledge",
      studyType: "lineup",
      pack,
      label: "Lineup",
      prompt,
      visualLabel,
      correct: player.name,
      correctDisplay: player.name,
      accepted: [player.name, player.name.split(" ").at(-1)],
      distractors: nameDistractors([player.name], pool),
      detail,
      placeholder: "Player name",
    };
  }

  function lineupGroupQuestion(id, pack, prompt, groupPlayers, visualLabel, detail, ordered = false) {
    if (groupPlayers.length < 2) return null;
    const expected = groupPlayers.map((player) => player.name);
    const replacements = nameDistractors(expected, getAllPlayers());
    const distractors = replacements.map((replacement, index) => {
      const alternate = [...expected];
      alternate[index % alternate.length] = replacement;
      return alternate.join(ordered ? " → " : ", ");
    });
    return {
      id: state.playerDeckId === "cowboys" ? `lineup-${id}` : `${state.playerDeckId}-lineup-${id}`,
      kind: "knowledge",
      studyType: "lineup",
      pack,
      label: "Lineup",
      prompt,
      visualLabel,
      correct: expected.join(ordered ? " → " : ", "),
      correctDisplay: expected.join(ordered ? " → " : ", "),
      expected,
      answerType: ordered ? "ordered" : "set",
      distractors,
      detail,
      placeholder: ordered ? "Names in order" : "Player names",
    };
  }

  function getLineupQuestions() {
    const teamPlayers = getAllPlayers();
    const offensePlayers = teamPlayers.filter((player) => OFFENSE.has(player.position));
    const defensePlayers = teamPlayers.filter((player) => DEFENSE.has(player.position));
    const startersAt = (positions) => positions.map((position) => playerAtDepth(position, 1)).filter(Boolean);
    const questions = [
      lineupNameQuestion("starting-qb", "offense", "Who is the starting quarterback?", playerAtDepth("QB", 1), "QB1", "Starting quarterback", offensePlayers),
      lineupNameQuestion("backup-qb", "offense", "Who backs up the starting quarterback?", playerAtDepth("QB", 2), "QB2", "Second-string quarterback", offensePlayers),
      lineupNameQuestion("starting-rb", "offense", "Who is the starting running back?", playerAtDepth("RB", 1), "RB1", "Starting running back", offensePlayers),
      lineupNameQuestion("starting-te", "offense", "Who is the starting tight end?", playerAtDepth("TE", 1), "TE1", "Starting tight end", offensePlayers),
      lineupNameQuestion("starting-lt", "offense", "Who starts at left tackle?", playerAtDepth("LT", 1), "LT", "Starting left tackle", offensePlayers),
      lineupNameQuestion("starting-lg", "offense", "Who starts at left guard?", playerAtDepth("LG", 1), "LG", "Starting left guard", offensePlayers),
      lineupNameQuestion("starting-center", "offense", "Who starts at center?", playerAtDepth("C", 1), "C", "Starting center", offensePlayers),
      lineupNameQuestion("starting-rg", "offense", "Who starts at right guard?", playerAtDepth("RG", 1), "RG", "Starting right guard", offensePlayers),
      lineupNameQuestion("starting-rt", "offense", "Who starts at right tackle?", playerAtDepth("RT", 1), "RT", "Starting right tackle", offensePlayers),
      lineupGroupQuestion("offensive-line", "offense", "Name the starting offensive line.", startersAt(["LT", "LG", "C", "RG", "RT"]), "OL", "Left tackle through right tackle"),
      lineupGroupQuestion("starting-receivers", "offense", "Name the starting wide receivers.", teamPlayers.filter((player) => player.position === "WR" && player.depthRank === 1), "WR", "Starting wide receivers"),

      lineupNameQuestion("starting-lcb", "defense", "Who starts at left cornerback?", playerAtDepth("LCB", 1), "LCB", "Starting left cornerback", defensePlayers),
      lineupNameQuestion("starting-rcb", "defense", "Who starts at right cornerback?", playerAtDepth("RCB", 1), "RCB", "Starting right cornerback", defensePlayers),
      lineupNameQuestion("starting-fs", "defense", "Who starts at free safety?", playerAtDepth("FS", 1), "FS", "Starting free safety", defensePlayers),
      lineupNameQuestion("starting-ss", "defense", "Who starts at strong safety?", playerAtDepth("SS", 1), "SS", "Starting strong safety", defensePlayers),
      lineupNameQuestion("starting-nickel", "defense", "Who is the starting nickel back?", playerAtDepth("NB", 1), "NB", "Starting nickel back", defensePlayers),
      lineupNameQuestion("starting-lde", "defense", "Who starts at left defensive end?", playerAtDepth("LDE", 1), "LDE", "Starting left defensive end", defensePlayers),
      lineupNameQuestion("starting-nt", "defense", "Who starts at nose tackle?", playerAtDepth("NT", 1), "NT", "Starting nose tackle", defensePlayers),
      lineupNameQuestion("starting-rde", "defense", "Who starts at right defensive end?", playerAtDepth("RDE", 1), "RDE", "Starting right defensive end", defensePlayers),
      lineupNameQuestion("starting-slb", "defense", "Who starts at strong-side linebacker?", playerAtDepth("SLB", 1), "SLB", "Starting strong-side linebacker", defensePlayers),
      lineupNameQuestion("starting-wlb", "defense", "Who starts at weak-side linebacker?", playerAtDepth("WLB", 1), "WLB", "Starting weak-side linebacker", defensePlayers),
      lineupNameQuestion("starting-lilb", "defense", "Who starts at left inside linebacker?", playerAtDepth("LILB", 1), "LILB", "Starting left inside linebacker", defensePlayers),
      lineupNameQuestion("starting-rilb", "defense", "Who starts at right inside linebacker?", playerAtDepth("RILB", 1), "RILB", "Starting right inside linebacker", defensePlayers),
      lineupGroupQuestion("starting-corners", "defense", "Name the starting outside cornerbacks.", startersAt(["LCB", "RCB"]), "CB", "Left and right cornerback"),
      lineupGroupQuestion("starting-safeties", "defense", "Name the starting safeties.", startersAt(["FS", "SS"]), "S", "Free and strong safety"),

      lineupNameQuestion("kicker", "special-teams", "Who is the kicker?", playerAtDepth("PK", 1), "K", "Starting placekicker", teamPlayers),
      lineupNameQuestion("punter", "special-teams", "Who is the punter?", playerAtDepth("P", 1), "P", "Starting punter", teamPlayers),
      lineupNameQuestion("long-snapper", "special-teams", "Who is the long snapper?", playerAtDepth("LS", 1), "LS", "Starting long snapper", teamPlayers),

      lineupGroupQuestion("qb-depth", "depth-chart", "Name the quarterbacks in depth-chart order.", activeDepthPlayers("QB"), "QB", "Starter, then backup", true),
      lineupGroupQuestion("rb-depth", "depth-chart", "Name the running backs in depth-chart order.", activeDepthPlayers("RB"), "RB", "Starter through third string", true),
      lineupGroupQuestion("te-depth", "depth-chart", "Name the tight ends in depth-chart order.", activeDepthPlayers("TE").slice(0, 3), "TE", "Starter through third string", true),
      lineupNameQuestion("rb2", "depth-chart", "Who is second on the running back depth chart?", playerAtDepth("RB", 2), "RB2", "Second-string running back", offensePlayers),
      lineupNameQuestion("te2", "depth-chart", "Who is second on the tight end depth chart?", playerAtDepth("TE", 2), "TE2", "Second-string tight end", offensePlayers),
      lineupNameQuestion("lcb2", "depth-chart", "Who is second at left cornerback?", playerAtDepth("LCB", 2), "LCB2", "Second-string left cornerback", defensePlayers),
      lineupNameQuestion("rcb2", "depth-chart", "Who is second at right cornerback?", playerAtDepth("RCB", 2), "RCB2", "Second-string right cornerback", defensePlayers),
    ].filter(Boolean);
    return questions;
  }

  function getKnowledgeQuestions(studyType = state.studyType, packageId = getActivePackageId()) {
    const allQuestions = studyType === "lineup"
      ? getLineupQuestions()
      : getTriviaData().questions.map((question) => ({
          ...question,
          kind: "knowledge",
          studyType: "trivia",
          correctDisplay: question.correctDisplay ?? question.correct,
          visualLabel: question.visualLabel ?? question.label,
        }));
    return packageId === "mixed" ? allQuestions : allQuestions.filter((question) => question.pack === packageId);
  }

  function getStudyPacks(studyType = state.studyType) {
    if (studyType === "players") return getPlayerGroups();
    if (studyType === "lineup") return lineupPacks;
    return getTriviaData().packs;
  }

  function getActivePack() {
    const packs = getStudyPacks();
    const pack = packs.find((candidate) => candidate.id === getActivePackageId()) ?? packs[0];
    if (pack && pack.id !== getActivePackageId()) setActivePackageId(pack.id);
    return pack;
  }

  function getActiveQuestionCount() {
    return state.studyType === "players" ? getDeckPlayers().length : getKnowledgeQuestions().length;
  }

  function getPracticeBucket(savedBucket = {}) {
    return Object.fromEntries(
      getSkills().map((skill) => {
        const stats = savedBucket?.[skill] ?? {};
        return [
          skill,
          {
            attempts: stats.attempts ?? 0,
            correct: stats.correct ?? 0,
            streak: stats.streak ?? 0,
            lastSeen: stats.lastSeen ?? 0,
          },
        ];
      }),
    );
  }

  function getPlayerProgress(playerId) {
    const saved = progress.players[playerId] ?? {};
    const isTypedRecall = saved.verificationMethod === VERIFICATION_METHOD;
    const skills = getSkills();
    const playerProgress = {
      seen: saved.seen ?? 0,
      correct: saved.correct ?? 0,
      skills: Object.fromEntries(skills.map((skill) => [skill, isTypedRecall ? (saved.skills?.[skill] ?? 0) : 0])),
      recognitionSkills: Object.fromEntries(skills.map((skill) => [skill, saved.recognitionSkills?.[skill] ?? 0])),
      practice: {
        recognition: getPracticeBucket(saved.practice?.recognition),
        recall: getPracticeBucket(saved.practice?.recall),
      },
    };
    return {
      ...playerProgress,
      verified: isTypedRecall && saved.verified === true,
      verificationMethod: isTypedRecall ? VERIFICATION_METHOD : null,
    };
  }

  function knownSkillCount(playerId) {
    return getSkills().filter((skill) => getPlayerProgress(playerId).skills[skill] === 1).length;
  }

  function learnedCount(deckPlayers) {
    return deckPlayers.filter((player) => getPlayerProgress(player.id).verified).length;
  }

  function learnedFactCount(deckPlayers) {
    return deckPlayers.reduce((total, player) => total + knownSkillCount(player.id), 0);
  }

  function getPackageMastery(pack) {
    if (state.studyType === "players") {
      const packagePlayers = getDeckPlayers(pack);
      return { mastered: learnedCount(packagePlayers), total: packagePlayers.length };
    }
    const questions = getKnowledgeQuestions(state.studyType, pack.id);
    return {
      mastered: questions.filter((question) => progress.knowledge?.[question.id]?.mastered === true).length,
      total: questions.length,
    };
  }

  function positionName(position, withCode = true) {
    const name = POSITION_NAMES[position] ?? position;
    return withCode && name !== position ? `${name} · ${position}` : name;
  }

  function headshot(player, variant = "full", eager = false) {
    const className = variant === "small" ? "headshot headshot-small" : "headshot";
    return `
      <div class="${className}">
        <span class="headshot-placeholder" aria-hidden="true">#</span>
        <img src="${h(player.image)}" alt="${h(player.name)} headshot" ${eager ? "" : 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" />
      </div>`;
  }

  function collegeMark(college) {
    const mark = collegeMarks[college] ?? {};
    const label = mark.label ?? college.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).map((word) => word[0]).join("").slice(0, 3).toUpperCase();
    return `<span class="college-mark" aria-hidden="true"><span>${h(label)}</span>${mark.src ? `<img src="${h(mark.src)}" alt="" loading="lazy" decoding="async" />` : ""}</span>`;
  }

  function formatHeight(height) {
    const [feet, inches] = String(height ?? "").split("-");
    return feet && inches ? `${feet}′${inches}″` : String(height ?? "");
  }

  function formatDate(dateString) {
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(
      new Date(`${dateString}T12:00:00`),
    );
  }

  function rosterStatusLabel(status) {
    const labels = {
      "Practice Squad": "Practice squad",
      "Reserve/Injured": "IR",
      "Reserve/Designated to Return": "Designated return",
      "Reserve/Injured; Designated for Return": "Designated return",
      "Reserve/Non-Football Injury": "NFI",
      "Reserve/Physically Unable to Perform": "PUP",
    };
    return labels[status] ?? status;
  }

  function playerRosterLabel(player) {
    return [
      player.depth ? `${player.depth} · ${player.depthPosition}` : "",
      player.status !== "Active" ? rosterStatusLabel(player.status) : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function showView(viewName) {
    elements.views.forEach((view) => {
      const active = view.dataset.view === viewName;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });
    document.body.classList.toggle("is-training", viewName === "training");
    elements.footer.hidden = viewName === "training";
    const playerDeck = getPlayerDeck();
    elements.headerContext.textContent = viewName === "dashboard" ? "Decks" : playerDeck.title;
    const viewTitles = {
      dashboard: "Decks — Player Decks",
      setup: `${playerDeck.title} — Player Decks`,
      training: `${getActivePack().title} — Player Decks`,
      results: "Results — Player Decks",
      roster: `Players — ${playerDeck.title}`,
    };
    document.title = viewTitles[viewName] ?? "Player Decks";
    elements.headerBack.hidden = viewName === "dashboard";
    elements.headerBack.parentElement.classList.toggle("has-back", viewName !== "dashboard");
    elements.headerBack.dataset.action = viewName === "roster" ? "deck" : "home";
    elements.headerBack.setAttribute("aria-label", viewName === "roster" ? `Back to ${playerDeck.title}` : "Back to decks");
    elements.browsePlayers.hidden = viewName !== "setup" || !playerDeck.browseable;
    elements.dataDate.textContent = formatDate(playerDeck.updated);
    elements.dataSource.href = playerDeck.source;
    elements.dataSource.textContent = playerDeck.sourceLabel;
    if (viewName !== "roster" && elements.rosterControlsDialog.open) elements.rosterControlsDialog.close();
    if (viewName !== "setup" && elements.sessionOptionDialog.open) elements.sessionOptionDialog.close();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function showDashboard() {
    renderDashboard();
    showView("dashboard");
  }

  function buildDailyShareText() {
    const today = getTodayStats();
    const percent = today.questions ? Math.round((today.correct / today.questions) * 100) : 0;
    const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(),
    );
    const resultRows = [];
    for (let index = 0; index < Math.min(today.outcomes.length, 50); index += 10) {
      resultRows.push(
        today.outcomes
          .slice(index, index + 10)
          .map((outcome) => (outcome ? "🟩" : "🟥"))
          .join(""),
      );
    }
    const stageLabels = { recognition: "Recognition", recall: "Recall", mastery: "Mastery" };
    const stageRows = Object.entries(today.stages)
      .filter(([, stats]) => stats.questions > 0)
      .map(([stage, stats]) => `${stageLabels[stage]} ${stats.correct}/${stats.questions}`);
    return [
      `Player Decks — ${getPlayerDeck().title} — ${date}`,
      `🏈 ${today.verifiedPlayers.length} ${today.verifiedPlayers.length === 1 ? "player" : "players"} verified today`,
      `✅ ${today.correct}/${today.questions} answers · ${percent}%`,
      `📚 ${today.sessions} ${today.sessions === 1 ? "session" : "sessions"}`,
      stageRows.length ? stageRows.join(" · ") : "",
      resultRows.join("\n"),
      `Total deck: ${learnedCount(getAllPlayers())}/${getAllPlayers().length} verified`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  function copyTextFallback(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  async function shareDailySummary(trigger) {
    const today = getTodayStats();
    if (!today.questions) return;
    const text = buildDailyShareText();
    const url = new URL(".", window.location.href).href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Player Decks", text, url });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    } catch {
      copyTextFallback(`${text}\n${url}`);
    }
    const originalText = trigger.textContent;
    trigger.textContent = "Summary copied";
    setTimeout(() => {
      trigger.textContent = originalText;
    }, 1800);
  }

  function renderDashboard() {
    elements.playerDeckList.innerHTML = playerDecks
      .map((deck) => {
        const progressText = deck.available ? `${learnedCount(deck.players)} of ${deck.size} learned` : "Coming next";
        return `
          <button class="player-deck-row" type="button" data-player-deck="${h(deck.id)}" ${deck.available ? "" : "disabled"}>
            <span class="player-deck-mark${deck.id === "nfl-top-100" ? " is-league" : ""}">${deck.logo ? `<img src="${h(deck.logo)}" alt="" />` : h(deck.mark)}</span>
            <span><strong>${h(deck.title)}</strong><small>${h(progressText)}</small></span>
            <span aria-hidden="true">${deck.available ? "›" : ""}</span>
          </button>`;
      })
      .join("");
  }

  function getRecommendedLesson() {
    const groups = getPlayerGroups();
    const deck =
      groups.find((candidate) => learnedCount(getDeckPlayers(candidate)) < getDeckPlayers(candidate).length) ??
      groups.at(-1);
    const deckPlayers = getDeckPlayers(deck);
    const skills = getSkills();
    const totalFacts = deckPlayers.length * skills.length;
    const recognitionFacts = deckPlayers.reduce(
      (total, player) =>
        total + skills.filter((skill) => getPlayerProgress(player.id).recognitionSkills[skill] === 1).length,
      0,
    );
    const typedFacts = learnedFactCount(deckPlayers);
    const stage =
      recognitionFacts / totalFacts < 0.75
        ? stages[0]
        : typedFacts / totalFacts < 0.75
          ? stages[1]
          : stages[2];
    return { deck, stage, questionCount: Math.min(5, deckPlayers.length) };
  }

  function openRecommendedSetup() {
    const recommendation = getRecommendedLesson();
    restoreStudySettings("players");
    state.deckId = recommendation.deck.id;
    state.stage = recommendation.stage.id;
    state.mode = "mixed";
    state.length = recommendation.questionCount;
    storeActiveStudySettings();
    renderSetup();
    showView("setup");
  }

  function renderSetup() {
    if (!getSupportedStudyTypes().includes(state.studyType)) restoreStudySettings("players");
    const pack = getActivePack();
    const questionCount = getActiveQuestionCount();
    const allowedStages = state.studyType === "players" ? stages : knowledgeStages;
    const stage = allowedStages.find((candidate) => candidate.id === state.stage) ?? allowedStages[0];
    const activeModes = getModes();
    const mode = activeModes.find((candidate) => candidate.id === state.mode) ?? activeModes.at(-1);
    const sessionCount = state.length === "all" ? questionCount : Math.min(Number(state.length), questionCount);
    const unit = state.studyType === "players" ? "card" : "question";
    if (state.stage !== stage.id) state.stage = stage.id;
    elements.studyTypeButtons.forEach((button) => {
      button.hidden = !getSupportedStudyTypes().includes(button.dataset.studyType);
      const selected = button.dataset.studyType === state.studyType;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-selected", selected);
    });
    elements.studyTypeSwitch.hidden = getSupportedStudyTypes().length === 1;
    elements.studyTypeSwitch.style.gridTemplateColumns = `repeat(${getSupportedStudyTypes().length}, minmax(0, 1fr))`;
    elements.setupTitle.textContent = pack.title;
    elements.setupPackage.setAttribute("aria-label", `${pack.title}. Change ${state.studyType === "players" ? "package" : "topic"}`);
    elements.setupStageValue.textContent = stage.title.toLowerCase();
    elements.setupModeValue.textContent = state.stage === "mastery" ? "all facts" : mode.title.toLowerCase();
    elements.setupModeValue.disabled = state.stage === "mastery";
    elements.setupContentChoice.hidden = state.studyType !== "players";
    elements.setupLengthValue.textContent = `${sessionCount} ${unit}${sessionCount === 1 ? "" : "s"}`;
    const history = getPracticeCombinationStats();
    elements.setupHistory.textContent = history.answers
      ? `${history.sessions} ${history.sessions === 1 ? "session" : "sessions"} · ${Math.round((history.correct / history.answers) * 100)}% correct`
      : "Not practiced yet";
    elements.setupStart.textContent = `Start ${sessionCount} ${unit}${sessionCount === 1 ? "" : "s"}`;
  }

  function openSessionOptions(control) {
    const sessionSize = getActiveQuestionCount();
    const activePackageId = getActivePackageId();
    const packageOptions = getStudyPacks().map((pack) => {
      const mastery = getPackageMastery(pack);
      return {
        value: pack.id,
        label: pack.title,
        detail:
          mastery.total > 0 && mastery.mastered === mastery.total
            ? "✓ Mastered"
            : `${mastery.mastered} of ${mastery.total} mastered`,
      };
    });
    const optionSets = {
      package: {
        title: state.studyType === "players" ? "Package" : "Topic",
        selected: activePackageId,
        options: packageOptions,
      },
      stage: { title: "Level", selected: state.stage, options: (state.studyType === "players" ? stages : knowledgeStages).map(({ id, title }) => ({ value: id, label: title })) },
      mode: { title: "Content", selected: state.mode, options: getModes().map(({ id, title }) => ({ value: id, label: title })) },
      length: {
        title: "Length",
        selected: String(state.length),
        options: [
          { value: "5", label: state.studyType === "players" ? "5 cards" : "5 questions" },
          { value: "10", label: state.studyType === "players" ? "10 cards" : "10 questions" },
          { value: "all", label: `All ${sessionSize}` },
        ].filter((option) => option.value === "all" || Number(option.value) <= sessionSize),
      },
    };
    const optionSet = optionSets[control];
    if (!optionSet) return;
    elements.sessionOptionTitle.textContent = optionSet.title;
    elements.sessionOptionList.innerHTML = optionSet.options
      .map(
        ({ value, label, detail }) => `<button class="session-option${String(optionSet.selected) === value ? " is-selected" : ""}" type="button" data-setup-value="${h(value)}" data-setup-kind="${h(control)}" aria-pressed="${String(optionSet.selected) === value}"><span><strong>${h(label)}</strong>${detail ? `<small>${h(detail)}</small>` : ""}</span></button>`,
      )
      .join("");
    elements.sessionOptionDialog.showModal();
  }

  function openDeck(deckId) {
    if (getPlayerGroups().some((deck) => deck.id === deckId)) state.deckId = deckId;
    renderSetup();
    showView("setup");
  }

  function changeStudyType(studyType) {
    if (!studyTypes.some((candidate) => candidate.id === studyType) || !getSupportedStudyTypes().includes(studyType) || state.studyType === studyType) return;
    storeActiveStudySettings();
    restoreStudySettings(studyType);
    renderSetup();
  }

  function practiceTrack(stage) {
    return stage === "recognition" ? "recognition" : "recall";
  }

  function skillPracticeNeed(playerProgress, track, skill) {
    const facts = track === "recognition" ? playerProgress.recognitionSkills : playerProgress.skills;
    const confirmed = facts[skill] === 1;
    const stats = playerProgress.practice[track][skill];
    if (!stats.attempts) return confirmed ? 24 : 64;

    const accuracy = stats.correct / stats.attempts;
    let need = (confirmed ? 18 : 52) + (1 - accuracy) * 38;
    need += stats.streak === 0 ? 34 : -Math.min(stats.streak, 4) * 6;

    const answersAgo = progress.totalAnswers - stats.lastSeen;
    if (answersAgo >= 0 && answersAgo < 4) need -= (4 - answersAgo) * 3;
    return need;
  }

  function playerPracticePriority(player, stage, requestedMode) {
    const playerProgress = getPlayerProgress(player.id);
    const track = practiceTrack(stage);
    const relevantSkills = requestedMode === "mixed" ? getSkills() : [requestedMode];
    const needs = relevantSkills.map((skill) => skillPracticeNeed(playerProgress, track, skill));
    const highestNeed = Math.max(...needs);
    const averageNeed = needs.reduce((total, need) => total + need, 0) / needs.length;
    let priority = highestNeed + averageNeed * 0.2;

    if (stage === "mastery" && !playerProgress.verified) priority += 24;
    if (playerProgress.verified) priority -= 45;
    return priority;
  }

  function rankPracticePlayers(deckPlayers, stage, requestedMode, randomize = false) {
    return [...deckPlayers]
      .map((player) => ({
        player,
        priority:
          playerPracticePriority(player, stage, requestedMode) + (randomize ? Math.random() * 10 : 0),
      }))
      .sort(
        (left, right) =>
          right.priority - left.priority || left.player.name.localeCompare(right.player.name),
      );
  }

  function chooseSessionPlayers(deckPlayers, requestedLength, requestedMode) {
    const count = requestedLength === "all" ? deckPlayers.length : Math.min(Number(requestedLength), deckPlayers.length);
    return rankPracticePlayers(deckPlayers, state.stage, requestedMode, true)
      .slice(0, count)
      .map(({ player }) => player);
  }

  function choosePracticeSkill(player, stage) {
    const playerProgress = getPlayerProgress(player.id);
    const track = practiceTrack(stage);
    return getSkills().map((skill) => ({
      skill,
      need: skillPracticeNeed(playerProgress, track, skill) + Math.random() * 8,
    })).sort((left, right) => right.need - left.need)[0].skill;
  }

  function buildChoiceValues(correct, deckPlayers, getter, numeric = false) {
    let pool = [...new Set(deckPlayers.map(getter))].filter((value) => value !== correct && value !== "");
    if (pool.length < 3) {
      pool = [...new Set([...pool, ...getAllPlayers().map(getter)])].filter(
        (value) => value !== correct && value !== "",
      );
    }
    if (numeric) {
      pool.sort(
        (left, right) =>
          Math.abs(Number(left) - Number(correct)) - Math.abs(Number(right) - Number(correct)),
      );
      pool = shuffle(pool.slice(0, Math.min(8, pool.length)));
    } else {
      pool = shuffle(pool);
    }
    return shuffle([correct, ...pool.slice(0, 3)]);
  }

  function prepareQuestion(question, deckPlayers, getter, options = {}) {
    if (state.stage !== "recognition") return { ...question, responseType: "typed" };
    const label = options.label ?? ((value) => value);
    return {
      ...question,
      responseType: "choice",
      choices: buildChoiceValues(question.correct, deckPlayers, getter, options.numeric).map((value) => ({
        value,
        label: label(value),
      })),
    };
  }

  function buildQuestion(player, mode, deckPlayers, fullCheck = false) {
    if (state.playerDeckId === "nfl-top-100") return buildNflQuestion(player, mode, deckPlayers);

    if (mode === "faces") {
      return prepareQuestion({
        player,
        mode,
        label: "Face check",
        prompt: "Who is this player?",
        visual: "headshot",
        correct: player.name,
        correctDisplay: player.name,
        placeholder: "Full player name",
        inputMode: "text",
        formatHelp: "Enter the full name.",
      }, deckPlayers, (candidate) => candidate.name);
    }

    if (mode === "numbers") {
      const sameNumber = deckPlayers.filter((candidate) => candidate.number === player.number).length;
      const askForName = !fullCheck && sameNumber === 1 && Math.random() < 0.5;
      if (askForName) {
        return prepareQuestion({
          player,
          mode,
          label: "Jersey check",
          prompt: `Who wears #${player.number}?`,
          visual: "number",
          correct: player.name,
          correctDisplay: player.name,
          placeholder: "Full player name",
          inputMode: "text",
          formatHelp: "Enter the full name.",
        }, deckPlayers, (candidate) => candidate.name);
      }
      return prepareQuestion({
        player,
        mode,
        label: "Jersey check",
        prompt: `What number does ${player.name} wear?`,
        visual: "player",
        correct: player.number,
        correctDisplay: `#${player.number}`,
        placeholder: "Jersey number",
        inputMode: "numeric",
        formatHelp: "Enter digits only, without the # symbol.",
      }, deckPlayers, (candidate) => candidate.number, {
        numeric: true,
        label: (value) => `#${value}`,
      });
    }

    if (mode === "positions") {
      return prepareQuestion({
        player,
        mode,
        label: "Position check",
        prompt: `What position does ${player.name} play?`,
        visual: "player",
        correct: player.position,
        correctDisplay: `${player.position} — ${positionName(player.position, false)}`,
        placeholder: "Position abbreviation",
        inputMode: "text",
        formatHelp: "Enter the roster abbreviation, such as QB, WR, or CB.",
      }, deckPlayers, (candidate) => candidate.position, {
        label: (value) => `${value} — ${positionName(value, false)}`,
      });
    }

    const correct = player.college;
    return prepareQuestion({
      player,
      mode: "colleges",
      label: "College check",
      prompt: `Where did ${player.name} play college football?`,
      visual: "player",
      correct,
      correctDisplay: correct,
      placeholder: "College name",
      inputMode: "text",
      formatHelp: "Enter the complete college name shown on the official roster.",
    }, deckPlayers, (candidate) => candidate.college);
  }

  function teamName(team) {
    return getAllPlayers().find((player) => player.team === team)?.teamName ?? team;
  }

  function buildNflQuestion(player, mode, deckPlayers) {
    if (mode === "faces") {
      return prepareQuestion({
        player,
        mode,
        label: "Face check",
        prompt: "Who is this player?",
        visual: "headshot",
        correct: player.name,
        correctDisplay: player.name,
        placeholder: "Full player name",
        inputMode: "text",
        formatHelp: "Enter the full name.",
      }, deckPlayers, (candidate) => candidate.name);
    }

    if (mode === "teams") {
      return prepareQuestion({
        player,
        mode,
        label: "Team check",
        prompt: `Which team does ${player.name} play for?`,
        visual: "player",
        correct: player.team,
        correctDisplay: player.teamName,
        placeholder: "Team abbreviation",
        inputMode: "text",
        formatHelp: "Enter the team abbreviation, such as DAL or KC.",
      }, deckPlayers, (candidate) => candidate.team, {
        label: (value) => teamName(value),
      });
    }

    if (mode === "positions") {
      return prepareQuestion({
        player,
        mode,
        label: "Position check",
        prompt: `What position does ${player.name} play?`,
        visual: "player",
        correct: player.position,
        correctDisplay: `${player.position} — ${positionName(player.position, false)}`,
        placeholder: "Position abbreviation",
        inputMode: "text",
        formatHelp: "Enter the roster abbreviation, such as QB, WR, or CB.",
      }, deckPlayers, (candidate) => candidate.position, {
        label: (value) => `${value} — ${positionName(value, false)}`,
      });
    }

    const rankValue = player.rank === null ? "Top 3" : String(player.rank);
    return prepareQuestion({
      player,
      mode: "rankings",
      label: "Ranking check",
      prompt: `Where does ${player.name} rank in the 2026 Top 100?`,
      visual: "player",
      correct: rankValue,
      correctDisplay: player.rankLabel,
      placeholder: player.rank === null ? "Top 3" : "Rank",
      inputMode: player.rank === null ? "text" : "numeric",
      formatHelp: player.rank === null ? "The exact Top 3 order is still pending." : "Enter the rank without the # symbol.",
    }, deckPlayers, (candidate) => candidate.rank === null ? "Top 3" : String(candidate.rank), {
      label: (value) => value === "Top 3" ? value : `#${value}`,
    });
  }

  function prepareKnowledgeQuestion(question) {
    const prepared = {
      ...question,
      correctDisplay: question.correctDisplay ?? question.correct,
      inputMode: /^\d/.test(question.correct) ? "numeric" : "text",
      placeholder: question.placeholder ?? "Your answer",
      formatHelp:
        question.answerType === "set"
          ? "Enter every answer. Order does not matter."
          : question.answerType === "ordered"
            ? "Enter every answer in order."
            : "Enter the answer.",
    };
    if (state.stage !== "recognition") return { ...prepared, responseType: "typed" };
    return {
      ...prepared,
      responseType: "choice",
      choices: shuffle([prepared.correct, ...(prepared.distractors ?? [])].slice(0, 4)).map((value) => ({
        value,
        label: value,
      })),
    };
  }

  function knowledgeAnswerMatches(question, answer) {
    const normalized = normalizeAnswer(answer).replace(/[’]/g, "'");
    if (question.answerType === "set" || question.answerType === "ordered") {
      const positions = question.expected.map((expected) => {
        const normalizedExpected = normalizeAnswer(expected).replace(/[’]/g, "'");
        const lastName = normalizedExpected.split(" ").at(-1);
        const fullIndex = normalized.indexOf(normalizedExpected);
        return fullIndex >= 0 ? fullIndex : normalized.indexOf(lastName);
      });
      if (positions.some((position) => position < 0)) return false;
      return question.answerType !== "ordered" || positions.every((position, index) => index === 0 || position > positions[index - 1]);
    }
    return (question.accepted ?? [question.correct]).some(
      (accepted) => normalizeAnswer(accepted).replace(/[’]/g, "'") === normalized,
    );
  }

  function buildKnowledgeSession() {
    const available = getKnowledgeQuestions();
    const count = state.length === "all" ? available.length : Math.min(Number(state.length), available.length);
    return shuffle(available).slice(0, count).map(prepareKnowledgeQuestion);
  }

  function buildMasterySession(sessionPlayers, deckPlayers) {
    const remaining = sessionPlayers.map((player) => ({ player, skills: shuffle(getSkills()) }));
    const questions = [];
    let previousPlayerId = null;

    while (remaining.some(({ skills }) => skills.length)) {
      const available = remaining.filter(
        ({ player, skills }) => skills.length && (player.id !== previousPlayerId || sessionPlayers.length === 1),
      );
      const candidates = available.length ? available : remaining.filter(({ skills }) => skills.length);
      const mostFactsLeft = Math.max(...candidates.map(({ skills }) => skills.length));
      const next = shuffle(candidates.filter(({ skills }) => skills.length === mostFactsLeft))[0];
      const skill = next.skills.pop();
      questions.push({
        ...buildQuestion(next.player, skill, deckPlayers, true),
        fullCheck: true,
      });
      previousPlayerId = next.player.id;
    }

    return questions;
  }

  function startSession() {
    storeActiveStudySettings();
    state.practiceCombinationKey = getPracticeCombinationKey();
    state.practiceCombinationStarted = false;
    if (state.studyType !== "players") {
      state.questions = buildKnowledgeSession();
      state.questionIndex = 0;
      state.score = 0;
      state.answers = [];
      state.answerLocked = false;
      const stage = knowledgeStages.find((candidate) => candidate.id === state.stage) ?? knowledgeStages[0];
      elements.gameDeckName.textContent = `${getActivePack().title} · ${stage.title.toLowerCase()}`;
      renderQuestion();
      showView("training");
      return;
    }
    const deckPlayers = getDeckPlayers();
    const requestedMode = state.stage === "mastery" ? "mixed" : state.mode;
    const sessionPlayers = chooseSessionPlayers(deckPlayers, state.length, requestedMode);
    state.questions =
      state.stage === "mastery"
        ? buildMasterySession(sessionPlayers, deckPlayers)
        : sessionPlayers.map((player) => {
            const mode = state.mode === "mixed" ? choosePracticeSkill(player, state.stage) : state.mode;
            return buildQuestion(player, mode, deckPlayers);
          });
    state.questionIndex = 0;
    state.score = 0;
    state.answers = [];
    state.answerLocked = false;
    const stage = stages.find((candidate) => candidate.id === state.stage);
    elements.gameDeckName.textContent = `${getDeck().title} · ${stage.title.toLowerCase()}`;
    renderQuestion();
    showView("training");
  }

  function renderQuestionVisual(question) {
    if (question.kind === "knowledge") return "";
    if (question.visual === "headshot") return headshot(question.player, "full", true);
    if (question.visual === "number") {
      return `<div class="number-stimulus" aria-label="Jersey number ${h(question.player.number)}"><div><strong>${h(question.player.number)}</strong><span>${h(question.player.team ?? "Dallas Cowboys")}</span></div></div>`;
    }
    const secondary = state.playerDeckId !== "nfl-top-100"
      ? `<span>${h(question.player.experience === "R" ? "Rookie" : `Year ${question.player.experience}`)}</span>`
      : "";
    return `
      <div class="question-player">
        ${headshot(question.player, "small", true)}
        <strong>${h(question.player.name)}</strong>
        ${secondary}
      </div>`;
  }

  function renderPlayerFeedback(question) {
    if (question.fullCheck) {
      return `<div class="feedback-title"><strong>${h(question.correctFeedback)}</strong></div>`;
    }
    const player = question.player;
    const facts = state.playerDeckId === "nfl-top-100"
      ? [
          ["Name", player.name],
          ["Team", player.teamName],
          ["Position", player.position],
          ["Rank", player.rankLabel],
        ]
      : [
          ["Name", player.name],
          ["Number", `#${player.number}`],
          ["Position", player.position],
          ["College", player.college],
        ];
    return `
      <div class="feedback-title"><strong>${h(question.correctFeedback)}</strong></div>
      <div class="feedback-facts">
        ${facts.map(([label, value]) => `<div><span>${h(label)}</span><strong>${h(value)}</strong></div>`).join("")}
      </div>`;
  }

  function renderTriviaReveal(question) {
    if (question.studyType !== "trivia" || !question.image) return "";
    const presentationClass = question.image.presentation === "trim-source-matte" ? " is-source-matte-trimmed" : "";
    return `
      <figure class="trivia-reveal${presentationClass}">
        <img src="${h(question.image.path)}" alt="${h(question.image.alt)}" decoding="async" />
      </figure>`;
  }

  function renderTriviaFeedback(question, correct) {
    return `
      <div class="trivia-answer-copy">
        <p class="trivia-result">${correct ? "Correct" : "Incorrect"}</p>
        <h2>${h(question.correctDisplay)}</h2>
        <p class="trivia-fact">${h(question.detail)}</p>
      </div>
      ${renderTriviaReveal(question)}`;
  }

  function renderQuestion() {
    const question = state.questions[state.questionIndex];
    const current = state.questionIndex + 1;
    const total = state.questions.length;
    state.answerLocked = false;
    elements.gameProgressText.textContent = `${current} of ${total}`;
    elements.gameProgress.setAttribute("aria-valuemax", total);
    elements.gameProgress.setAttribute("aria-valuenow", current);
    elements.gameProgressBar.style.width = `${(current / total) * 100}%`;
    elements.gameScore.textContent = state.score;
    elements.questionType.textContent = question.label;
    elements.questionType.hidden = question.kind === "knowledge";
    elements.questionTitle.textContent = question.prompt;
    elements.questionCard.classList.toggle("is-trivia-question", question.studyType === "trivia");
    const questionVisual = renderQuestionVisual(question);
    elements.questionVisual.innerHTML = questionVisual;
    elements.questionVisual.hidden = !questionVisual;
    elements.answerGrid.innerHTML =
      question.responseType === "choice"
        ? question.choices
            .map(
              (choice, index) =>
                `<button class="answer-button" type="button" data-choice="${index}">${h(choice.label)}</button>`,
            )
            .join("")
        : `
          <form class="recall-form" id="recall-form" novalidate>
            <label class="recall-label" for="recall-input">Type your answer</label>
            <input
              class="recall-input"
              id="recall-input"
              name="answer"
              type="text"
              inputmode="${h(question.inputMode)}"
              placeholder="${h(question.placeholder)}"
              autocomplete="off"
              autocapitalize="words"
              spellcheck="false"
              required
            />
            <p class="recall-help">${h(question.formatHelp)} Capitalization does not matter.</p>
            <button class="button button-primary button-full recall-submit" type="submit">Check answer</button>
          </form>`;
    elements.answerFeedback.hidden = true;
    elements.answerFeedback.className = "answer-feedback";
    elements.nextWrap.hidden = true;
    const nextLabel =
      current === total
        ? "See results"
          : question.fullCheck
            ? "Next fact"
          : question.studyType === "players"
            ? "Next card"
            : "Next question";
    elements.nextButton.innerHTML = `${nextLabel} <span aria-hidden="true">→</span>`;
    if (question.responseType === "typed") {
      document.querySelector("#recall-input").focus({ preventScroll: true });
    }
    document.querySelector(".training-view").scrollIntoView({ block: "start" });
  }

  function normalizeAnswer(value) {
    return String(value).normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
  }

  function recordProgress(playerId, skill, correct, stage) {
    const current = getPlayerProgress(playerId);
    const typed = stage !== "recognition";
    const track = practiceTrack(stage);
    const previousStats = current.practice[track][skill];
    const practice = {
      ...current.practice,
      [track]: {
        ...current.practice[track],
        [skill]: {
          attempts: previousStats.attempts + 1,
          correct: previousStats.correct + (correct ? 1 : 0),
          streak: correct ? previousStats.streak + 1 : 0,
          lastSeen: progress.totalAnswers + 1,
        },
      },
    };
    progress.players[playerId] = {
      seen: current.seen + 1,
      correct: current.correct + (correct ? 1 : 0),
      skills: typed ? { ...current.skills, [skill]: correct ? 1 : 0 } : current.skills,
      recognitionSkills:
        stage === "recognition"
          ? { ...current.recognitionSkills, [skill]: correct ? 1 : 0 }
          : current.recognitionSkills,
      verified: correct ? current.verified : false,
      verificationMethod: typed ? VERIFICATION_METHOD : current.verificationMethod,
      practice,
    };
    progress.totalAnswers += 1;
    progress.totalCorrect += correct ? 1 : 0;
    updateDailyAnswer(correct, stage);
    saveProgress();
  }

  function recordKnowledgeProgress(question, correct) {
    const current = progress.knowledge?.[question.id] ?? { attempts: 0, correct: 0, streak: 0 };
    progress.knowledge = progress.knowledge ?? {};
    progress.knowledge[question.id] = {
      attempts: current.attempts + 1,
      correct: current.correct + (correct ? 1 : 0),
      streak: correct ? current.streak + 1 : 0,
      lastSeen: progress.totalAnswers + 1,
      mastered: state.stage === "recall" ? correct : current.mastered === true,
    };
    progress.totalAnswers += 1;
    progress.totalCorrect += correct ? 1 : 0;
    updateDailyAnswer(correct, state.stage);
    saveProgress();
  }

  function answerQuestion(answer) {
    if (state.answerLocked) return;
    state.answerLocked = true;
    const question = state.questions[state.questionIndex];
    const selected = answer.trim();
    const correct = question.kind === "knowledge"
      ? knowledgeAnswerMatches(question, selected)
      : normalizeAnswer(selected) === normalizeAnswer(question.correct);
    if (correct) state.score += 1;
    state.answers.push({ question, selected, correct });
    recordPracticeCombination(correct);
    if (question.kind === "knowledge") {
      recordKnowledgeProgress(question, correct);
    } else {
      recordProgress(question.player.id, question.mode, correct, state.stage);
    }
    const skills = getSkills();
    if (question.kind !== "knowledge" && question.fullCheck) {
      const playerAnswers = state.answers.filter(
        (answer) => answer.question.fullCheck && answer.question.player.id === question.player.id,
      );
      if (playerAnswers.length === skills.length) {
        const wasVerified = progress.players[question.player.id].verified;
        const passed = playerAnswers.every((answer) => answer.correct);
        progress.players[question.player.id].verified = passed;
        if (passed && !wasVerified) addDailyVerifiedPlayer(question.player.id);
        saveProgress();
      }
    }
    elements.gameScore.textContent = state.score;

    if (question.responseType === "choice") {
      elements.answerGrid.querySelectorAll(".answer-button").forEach((button, index) => {
        const value = question.choices[index].value;
        button.disabled = true;
        const valueIsCorrect = question.kind === "knowledge"
          ? knowledgeAnswerMatches(question, value)
          : normalizeAnswer(value) === normalizeAnswer(question.correct);
        button.classList.toggle("is-correct", valueIsCorrect);
        button.classList.toggle("is-wrong", normalizeAnswer(value) === normalizeAnswer(selected) && !correct);
      });
    } else {
      const input = elements.answerGrid.querySelector(".recall-input");
      const submit = elements.answerGrid.querySelector(".recall-submit");
      input.disabled = true;
      submit.disabled = true;
      input.classList.add(correct ? "is-correct" : "is-wrong");
    }

    elements.answerFeedback.hidden = false;
    elements.answerFeedback.classList.add(correct ? "is-correct" : "is-wrong");
    const isTrivia = question.studyType === "trivia";
    elements.answerFeedback.classList.toggle("is-trivia", isTrivia);
    elements.answerFeedback.innerHTML = question.kind === "knowledge"
      ? question.studyType === "trivia"
        ? renderTriviaFeedback(question, correct)
        : `
        <div class="feedback-title"><strong>${correct ? "✓ Correct" : `Incorrect — ${h(question.correctDisplay)}`}</strong></div>
        <p class="knowledge-detail">${h(question.detail)}</p>`
      : renderPlayerFeedback({
          ...question,
          correctFeedback: correct ? "✓ Correct" : `Incorrect — ${question.correctDisplay}`,
        });
    elements.answerFeedback.querySelector(".trivia-reveal img")?.addEventListener("error", (event) => {
      event.currentTarget.closest(".trivia-reveal")?.remove();
    }, { once: true });
    elements.nextWrap.hidden = false;
    elements.nextButton.focus({ preventScroll: true });
  }

  function nextQuestion() {
    if (!state.answerLocked) return;
    if (state.questionIndex < state.questions.length - 1) {
      state.questionIndex += 1;
      renderQuestion();
      return;
    }
    finishSession();
  }

  function finishSession() {
    progress.sessions += 1;
    const today = getTodayStats();
    today.sessions += 1;
    setTodayStats(today);
    saveProgress();
    const total = state.questions.length;
    const percent = Math.round((state.score / total) * 100);
    const missed = state.answers.filter((answer) => !answer.correct);
    elements.resultsTitle.textContent =
      percent === 100
        ? "Perfect score."
        : percent >= 80
          ? "Strong result."
          : percent >= 60
            ? "Session complete."
            : "Keep practicing.";
    elements.resultScore.textContent = `${state.score} of ${total} correct · ${percent}%`;
    if (state.studyType === "players") {
      elements.resultNote.textContent = missed.length
        ? `${missed.length} ${missed.length === 1 ? "fact needs" : "facts need"} another look. Those players will be prioritized next session.`
        : state.stage === "mastery"
          ? "Every fact was correct. Each player in this check is now verified as learned."
          : state.stage === "recognition"
            ? "Recognition practice complete. Move to typed recall when these feel familiar."
            : "Typed recall complete. Pass the Mastery Check to verify players as learned.";
    } else {
      elements.resultNote.textContent = missed.length
        ? `${missed.length} ${missed.length === 1 ? "answer needs" : "answers need"} another look.`
        : state.stage === "recognition"
          ? "Recognition complete. Try typed recall next."
          : "Typed recall complete.";
    }
    elements.resultMark.textContent = percent >= 70 ? "✓" : "↻";
    const activeStages = state.studyType === "players" ? stages : knowledgeStages;
    const currentStageIndex = activeStages.findIndex((stage) => stage.id === state.stage);
    const nextStage = activeStages[currentStageIndex + 1];
    elements.nextStageButton.hidden = percent < 80 || !nextStage;
    if (nextStage) elements.nextStageButton.textContent = `Move to ${nextStage.title}`;
    elements.missedSection.hidden = missed.length === 0;
    elements.missedSection.querySelector("h2").textContent = state.studyType === "players" ? "Review these players" : "Review these questions";
    if (state.studyType !== "players") {
      elements.missedList.innerHTML = missed
        .map(
          ({ question }) => `
            <div class="missed-question">
              <span>${h(question.prompt)}</span>
              <strong>${h(question.correctDisplay)}</strong>
            </div>`,
        )
        .join("");
      showView("results");
      return;
    }
    const missedByPlayer = new Map();
    missed.forEach(({ question }) => {
      const existing = missedByPlayer.get(question.player.id) ?? { player: question.player, skills: [] };
      existing.skills.push(SKILL_LABELS[question.mode]);
      missedByPlayer.set(question.player.id, existing);
    });
    elements.missedList.innerHTML = [...missedByPlayer.values()]
      .map(
        ({ player, skills }) => `
          <div class="missed-player">
            ${headshot(player, "small")}
            <div><strong>${h(player.name)}</strong><span>${h(state.playerDeckId === "nfl-top-100" ? `${player.team} · ${player.position} · ${player.rankLabel}` : `#${player.number} · ${positionName(player.position, false)}`)}</span></div>
            <strong>Review: ${h(skills.join(", "))}</strong>
          </div>`,
      )
      .join("");
    showView("results");
  }

  function populatePositionFilter() {
    const positions = [...new Set(getAllPlayers().map((player) => player.position))].sort();
    elements.positionFilterOptions.innerHTML = `
      <label class="roster-choice"><input type="radio" name="position" value="all" /><span>All</span></label>
      ${positions
        .map(
          (position) =>
            `<label class="roster-choice"><input type="radio" name="position" value="${h(position)}" /><span>${h(position)}</span></label>`,
        )
        .join("")}`;
    if (state.rosterFilters.position !== "all" && !positions.includes(state.rosterFilters.position)) {
      state.rosterFilters.position = "all";
    }
  }

  function setRosterControlDraft() {
    Object.entries(state.rosterFilters).forEach(([name, value]) => {
      const input = elements.rosterControlsForm.querySelector(`[name="${name}"][value="${value}"]`);
      if (input) input.checked = true;
    });
  }

  function clearRosterControlDraft() {
    const defaults = { group: "all", position: "all", sort: "name" };
    Object.entries(defaults).forEach(([name, value]) => {
      const input = elements.rosterControlsForm.querySelector(`[name="${name}"][value="${value}"]`);
      if (input) input.checked = true;
    });
  }

  function clearRosterSearchAndFilters() {
    elements.rosterSearch.value = "";
    state.rosterFilters = { group: "all", position: "all", sort: "name" };
    renderRoster();
    elements.rosterSearch.focus();
  }

  function heightInInches(player) {
    const [feet, inches] = String(player.height ?? "0-0").split("-").map(Number);
    return feet * 12 + inches;
  }

  function compareRosterPlayers(left, right, sort) {
    if (sort === "name") return left.name.localeCompare(right.name);
    if (sort === "number") {
      return Number(left.number) - Number(right.number) || left.name.localeCompare(right.name);
    }
    if (sort === "position") {
      return left.position.localeCompare(right.position) || Number(left.number) - Number(right.number);
    }
    if (sort === "college") {
      return left.college.localeCompare(right.college) || left.name.localeCompare(right.name);
    }
    if (sort === "height") {
      return heightInInches(right) - heightInInches(left) || Number(right.weight) - Number(left.weight) || left.name.localeCompare(right.name);
    }
    if (sort === "weight") {
      return Number(right.weight) - Number(left.weight) || heightInInches(right) - heightInInches(left) || left.name.localeCompare(right.name);
    }
    if (sort === "depth") {
      return (
        (left.depthRank ?? Number.MAX_SAFE_INTEGER) -
          (right.depthRank ?? Number.MAX_SAFE_INTEGER) ||
        (left.depthPosition ?? left.position).localeCompare(
          right.depthPosition ?? right.position,
        ) ||
        left.name.localeCompare(right.name)
      );
    }
    return left.name.localeCompare(right.name);
  }

  function renderRoster() {
    const query = elements.rosterSearch.value.trim().toLowerCase();
    const selectedGroup = state.rosterFilters.group;
    const selectedPosition = state.rosterFilters.position;
    const selectedSort = state.rosterFilters.sort;
    const filtered = getAllPlayers().filter((player) => {
      const matchesGroup = getDeck(selectedGroup).filter(player);
      const matchesPosition = selectedPosition === "all" || player.position === selectedPosition;
      const haystack = `${player.name} ${player.number} ${player.position} ${player.college} ${player.height} ${player.weight} ${player.depth ?? ""} ${player.depthPosition ?? ""} ${player.status}`.toLowerCase();
      return matchesGroup && matchesPosition && haystack.includes(query);
    }).sort((left, right) => compareRosterPlayers(left, right, selectedSort));

    const activeControlCount = [selectedGroup !== "all", selectedPosition !== "all", selectedSort !== "name"].filter(Boolean).length;
    elements.rosterFilterCount.hidden = activeControlCount === 0;
    elements.rosterFilterCount.textContent = activeControlCount ? ` · ${activeControlCount}` : "";
    elements.rosterControlsButton.classList.toggle("has-filters", activeControlCount > 0);
    elements.rosterSearchClear.hidden = query.length === 0;
    elements.rosterCount.textContent = `${filtered.length} ${filtered.length === 1 ? "player" : "players"}`;
    elements.playerGrid.innerHTML = filtered.length
      ? filtered
          .map(
            (player) => {
              const rosterLabel = playerRosterLabel(player);
              return `
              <article class="player-card">
                ${headshot(player)}
                <div class="player-card-body">
                  <div class="player-card-topline">
                    <h2>${h(player.name)}</h2>
                    <span class="jersey-number">#${h(player.number)}</span>
                  </div>
                  <p class="player-position">${h(player.position)} · ${h(formatHeight(player.height))} · ${h(player.weight)} lb</p>
                  <p class="player-college">${collegeMark(player.college)}<span>${h(player.college)}</span></p>
                  ${rosterLabel ? `<div class="player-card-statuses"><span class="player-status">${h(rosterLabel)}</span></div>` : ""}
                </div>
              </article>`;
            },
          )
          .join("")
      : '<div class="empty-roster"><p>No players found</p><button class="button button-quiet" type="button" data-action="clear-roster-results">Clear search and filters</button></div>';
  }

  function openRoster() {
    populatePositionFilter();
    renderRoster();
    showView("roster");
  }

  document.addEventListener("click", (event) => {
    const actionTarget = event.target.closest("[data-action]");
    if (actionTarget) {
      const action = actionTarget.dataset.action;
      if (action === "home") {
        showDashboard();
      } else if (action === "deck") {
        openDeck(state.deckId);
      } else if (action === "browse") {
        openRoster();
      } else if (action === "start-session" || action === "repeat-session") {
        startSession();
      } else if (action === "next-stage") {
        const activeStages = state.studyType === "players" ? stages : knowledgeStages;
        const currentStageIndex = activeStages.findIndex((stage) => stage.id === state.stage);
        state.stage = activeStages[Math.min(currentStageIndex + 1, activeStages.length - 1)].id;
        storeActiveStudySettings();
        renderSetup();
        showView("setup");
      } else if (action === "exit-session") {
        openDeck(state.deckId);
      } else if (action === "next-question") {
        nextQuestion();
      } else if (action === "share-summary") {
        shareDailySummary(actionTarget);
      } else if (action === "open-roster-controls") {
        setRosterControlDraft();
        elements.rosterControlsDialog.showModal();
        requestAnimationFrame(() => elements.rosterControlsForm.querySelector("input:checked")?.focus());
      } else if (action === "close-roster-controls") {
        elements.rosterControlsDialog.close();
      } else if (action === "close-session-options") {
        elements.sessionOptionDialog.close();
      } else if (action === "clear-roster-controls") {
        clearRosterControlDraft();
      } else if (action === "clear-roster-search") {
        elements.rosterSearch.value = "";
        renderRoster();
        elements.rosterSearch.focus();
      } else if (action === "clear-roster-results") {
        clearRosterSearchAndFilters();
      }
      return;
    }

    const playerDeckTarget = event.target.closest("[data-player-deck]");
    if (playerDeckTarget) {
      state.playerDeckId = playerDeckTarget.dataset.playerDeck;
      state.rosterFilters = { group: "all", position: "all", sort: "name" };
      elements.rosterSearch.value = "";
      savePlayerDeckSelection();
      openRecommendedSetup();
      return;
    }

    const studyTypeTarget = event.target.closest("[data-study-type]");
    if (studyTypeTarget) {
      changeStudyType(studyTypeTarget.dataset.studyType);
      return;
    }

    const setupControl = event.target.closest("[data-setup-control]");
    if (setupControl && !setupControl.disabled) {
      openSessionOptions(setupControl.dataset.setupControl);
      return;
    }

    const setupValue = event.target.closest("[data-setup-value]");
    if (setupValue) {
      const kind = setupValue.dataset.setupKind;
      const value = setupValue.dataset.setupValue;
      if (kind === "package") setActivePackageId(value);
      if (kind === "stage") state.stage = value;
      if (kind === "mode") state.mode = value;
      if (kind === "length") state.length = value === "all" ? "all" : Number(value);
      storeActiveStudySettings();
      elements.sessionOptionDialog.close();
      renderSetup();
      return;
    }

    const choiceTarget = event.target.closest("[data-choice]");
    if (choiceTarget) {
      const question = state.questions[state.questionIndex];
      answerQuestion(question.choices[Number(choiceTarget.dataset.choice)].value);
    }
  });

  document.addEventListener("submit", (event) => {
    if (event.target.matches("#roster-controls-form")) {
      event.preventDefault();
      const formData = new FormData(event.target);
      state.rosterFilters = {
        group: String(formData.get("group") ?? "all"),
        position: String(formData.get("position") ?? "all"),
        sort: String(formData.get("sort") ?? "name"),
      };
      elements.rosterControlsDialog.close();
      renderRoster();
      return;
    }
    if (!event.target.matches("#recall-form")) return;
    event.preventDefault();
    const formData = new FormData(event.target);
    answerQuestion(String(formData.get("answer") ?? ""));
  });

  document.addEventListener(
    "error",
    (event) => {
      if (event.target instanceof HTMLImageElement && event.target.closest(".headshot")) {
        event.target.closest(".headshot").classList.add("is-missing");
      }
      if (event.target instanceof HTMLImageElement && event.target.closest(".college-mark")) {
        event.target.closest(".college-mark").classList.add("is-missing");
      }
    },
    true,
  );

  elements.rosterSearch.addEventListener("input", renderRoster);
  elements.rosterControlsDialog.addEventListener("click", (event) => {
    if (event.target === elements.rosterControlsDialog) elements.rosterControlsDialog.close();
  });
  function enableSwipeBack(view, goBack) {
    let touchStart = null;
    view.addEventListener("touchstart", (event) => {
      const touch = event.changedTouches[0];
      touchStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });
    view.addEventListener("touchend", (event) => {
      if (!touchStart) return;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      const edgeSwipeRight = touchStart.x <= 36 && deltaX >= 70;
      const swipeLeft = deltaX <= -90;
      touchStart = null;
      if (Math.abs(deltaY) <= 60 && (edgeSwipeRight || swipeLeft)) goBack();
    }, { passive: true });
  }
  enableSwipeBack(elements.setupView, showDashboard);
  enableSwipeBack(elements.rosterView, () => openDeck(state.deckId));
  document.addEventListener("keydown", (event) => {
    if (document.querySelector('[data-view="training"].is-active') && state.answerLocked && event.key === "Enter") {
      nextQuestion();
    }
  });

  elements.dataDate.textContent = formatDate(getPlayerDeck().updated);
  elements.dataSource.href = getPlayerDeck().source;
  elements.dataSource.textContent = getPlayerDeck().sourceLabel;
  renderDashboard();
})();
