(() => {
  "use strict";

  const rosterData = window.COWBOYS_ROSTER;
  if (!rosterData?.players?.length) {
    document.body.innerHTML =
      '<main class="narrow-shell"><h1>Roster unavailable</h1><p>The roster data did not load. Try refreshing the page.</p></main>';
    return;
  }

  const players = rosterData.players;
  const collegeMarks = window.COLLEGE_MARKS ?? {};
  const STORAGE_KEY = "cowboys-roster-lab-v1";
  const PLAYER_DECK_KEY = "player-decks-selected-v1";
  const OFFENSE = new Set(["QB", "RB", "FB", "WR", "TE", "C", "G", "T", "OL"]);
  const DEFENSE = new Set(["DT", "OLB", "LB", "CB", "S", "DB"]);
  const SKILLS = ["faces", "numbers", "positions", "colleges"];
  const SKILL_LABELS = {
    faces: "face & name",
    numbers: "number",
    positions: "position",
    colleges: "college",
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
    T: "Tackle",
    OL: "Offensive line",
    DT: "Defensive tackle",
    OLB: "Outside linebacker",
    LB: "Linebacker",
    CB: "Cornerback",
    S: "Safety",
    DB: "Defensive back",
    K: "Kicker",
    P: "Punter",
    LS: "Long snapper",
  };

  const playerDecks = [
    { id: "cowboys", title: "Cowboys roster", mark: "DAL", size: players.length, available: true },
    { id: "nfl-top-100", title: "NFL Top 100", mark: "100", size: 100, available: false },
  ];

  const cowboysGroups = [
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

  const modes = [
    { id: "faces", title: "Faces & names" },
    { id: "numbers", title: "Jersey numbers" },
    { id: "positions", title: "Positions" },
    { id: "colleges", title: "Colleges" },
    { id: "mixed", title: "Mixed facts" },
  ];

  const stages = [
    { id: "recognition", title: "Recognition" },
    { id: "recall", title: "Typed recall" },
    { id: "mastery", title: "Mastery check" },
  ];

  const defaultProgress = { players: {}, totalAnswers: 0, totalCorrect: 0, sessions: 0, daily: {} };
  let progress = loadProgress();
  const state = {
    playerDeckId: loadPlayerDeckSelection(),
    deckId: "famous",
    mode: "mixed",
    stage: "recognition",
    length: 5,
    questions: [],
    questionIndex: 0,
    score: 0,
    answers: [],
    answerLocked: false,
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
    setupView: document.querySelector('[data-view="setup"]'),
    setupPackage: document.querySelector("#setup-package"),
    setupTitle: document.querySelector("#setup-title"),
    setupStageValue: document.querySelector("#setup-stage-value"),
    setupModeValue: document.querySelector("#setup-mode-value"),
    setupLengthValue: document.querySelector("#setup-length-value"),
    setupStart: document.querySelector("#setup-start"),
    sessionOptionDialog: document.querySelector("#session-option-dialog"),
    sessionOptionTitle: document.querySelector("#session-option-title"),
    sessionOptionList: document.querySelector("#session-option-list"),
    gameDeckName: document.querySelector("#game-deck-name"),
    gameProgressText: document.querySelector("#game-progress-text"),
    gameProgress: document.querySelector(".game-progress"),
    gameProgressBar: document.querySelector("#game-progress-bar"),
    gameScore: document.querySelector("#game-score"),
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

  function getDeck(deckId = state.deckId) {
    return cowboysGroups.find((deck) => deck.id === deckId) ?? cowboysGroups[0];
  }

  function getDeckPlayers(deck = getDeck()) {
    return players.filter(deck.filter);
  }

  function getPracticeBucket(savedBucket = {}) {
    return Object.fromEntries(
      SKILLS.map((skill) => {
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
    const playerProgress = {
      seen: saved.seen ?? 0,
      correct: saved.correct ?? 0,
      skills: {
        faces: isTypedRecall ? (saved.skills?.faces ?? 0) : 0,
        numbers: isTypedRecall ? (saved.skills?.numbers ?? 0) : 0,
        positions: isTypedRecall ? (saved.skills?.positions ?? 0) : 0,
        colleges: isTypedRecall ? (saved.skills?.colleges ?? 0) : 0,
      },
      recognitionSkills: {
        faces: saved.recognitionSkills?.faces ?? 0,
        numbers: saved.recognitionSkills?.numbers ?? 0,
        positions: saved.recognitionSkills?.positions ?? 0,
        colleges: saved.recognitionSkills?.colleges ?? 0,
      },
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
    return SKILLS.filter((skill) => getPlayerProgress(playerId).skills[skill] === 1).length;
  }

  function learnedCount(deckPlayers) {
    return deckPlayers.filter((player) => getPlayerProgress(player.id).verified).length;
  }

  function learnedFactCount(deckPlayers) {
    return deckPlayers.reduce((total, player) => total + knownSkillCount(player.id), 0);
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
    const playerDeck = playerDecks.find((deck) => deck.id === state.playerDeckId) ?? playerDecks[0];
    elements.headerContext.textContent = viewName === "dashboard" ? "Decks" : playerDeck.title;
    const viewTitles = {
      dashboard: "Decks — Player Decks",
      setup: `${playerDeck.title} — Player Decks`,
      training: `${getDeck().title} — Player Decks`,
      results: "Results — Player Decks",
      roster: `Players — ${playerDeck.title}`,
    };
    document.title = viewTitles[viewName] ?? "Player Decks";
    elements.headerBack.hidden = viewName === "dashboard";
    elements.headerBack.parentElement.classList.toggle("has-back", viewName !== "dashboard");
    elements.headerBack.dataset.action = viewName === "roster" ? "deck" : "home";
    elements.headerBack.setAttribute("aria-label", viewName === "roster" ? `Back to ${playerDeck.title}` : "Back to decks");
    elements.browsePlayers.hidden = viewName !== "setup";
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
      `Player Decks — Cowboys roster — ${date}`,
      `🏈 ${today.verifiedPlayers.length} ${today.verifiedPlayers.length === 1 ? "player" : "players"} verified today`,
      `✅ ${today.correct}/${today.questions} answers · ${percent}%`,
      `📚 ${today.sessions} ${today.sessions === 1 ? "session" : "sessions"}`,
      stageRows.length ? stageRows.join(" · ") : "",
      resultRows.join("\n"),
      `Total roster: ${learnedCount(players)}/${players.length} verified`,
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
    const learned = learnedCount(players);
    elements.playerDeckList.innerHTML = playerDecks
      .map((deck) => {
        const progressText = deck.available ? `${learned} of ${deck.size} learned` : "Coming next";
        return `
          <button class="player-deck-row" type="button" data-player-deck="${h(deck.id)}" ${deck.available ? "" : "disabled"}>
            <span class="player-deck-mark${deck.id === "nfl-top-100" ? " is-league" : ""}">${h(deck.mark)}</span>
            <span><strong>${h(deck.title)}</strong><small>${h(progressText)}</small></span>
            <span aria-hidden="true">${deck.available ? "›" : ""}</span>
          </button>`;
      })
      .join("");
  }

  function getRecommendedLesson() {
    const deck =
      cowboysGroups.find((candidate) => learnedCount(getDeckPlayers(candidate)) < getDeckPlayers(candidate).length) ??
      cowboysGroups[cowboysGroups.length - 1];
    const deckPlayers = getDeckPlayers(deck);
    const totalFacts = deckPlayers.length * SKILLS.length;
    const recognitionFacts = deckPlayers.reduce(
      (total, player) =>
        total + SKILLS.filter((skill) => getPlayerProgress(player.id).recognitionSkills[skill] === 1).length,
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
    state.deckId = recommendation.deck.id;
    state.stage = recommendation.stage.id;
    state.mode = "mixed";
    state.length = recommendation.questionCount;
    renderSetup();
    showView("setup");
  }

  function renderSetup() {
    const deck = getDeck();
    const deckPlayers = getDeckPlayers(deck);
    const stage = stages.find((candidate) => candidate.id === state.stage) ?? stages[0];
    const mode = modes.find((candidate) => candidate.id === state.mode) ?? modes.at(-1);
    const cardCount = state.length === "all" ? deckPlayers.length : Math.min(Number(state.length), deckPlayers.length);
    elements.setupTitle.textContent = deck.title;
    elements.setupPackage.setAttribute("aria-label", `${deck.title} package. Change package`);
    elements.setupStageValue.textContent = stage.title.toLowerCase();
    elements.setupModeValue.textContent = state.stage === "mastery" ? "all facts" : mode.title.toLowerCase();
    elements.setupModeValue.disabled = state.stage === "mastery";
    elements.setupLengthValue.textContent = `${cardCount} ${cardCount === 1 ? "card" : "cards"}`;
    elements.setupStart.textContent = `Start ${cardCount} ${cardCount === 1 ? "card" : "cards"}`;
  }

  function openSessionOptions(control) {
    const deckSize = getDeckPlayers().length;
    const optionSets = {
      package: {
        title: "Package",
        selected: state.deckId,
        options: cowboysGroups.map((deck) => ({
          value: deck.id,
          label: deck.title,
          detail: `${getDeckPlayers(deck).length} players`,
        })),
      },
      stage: { title: "Level", selected: state.stage, options: stages.map(({ id, title }) => ({ value: id, label: title })) },
      mode: { title: "Content", selected: state.mode, options: modes.map(({ id, title }) => ({ value: id, label: title })) },
      length: {
        title: "Length",
        selected: String(state.length),
        options: [
          { value: "5", label: "5 cards" },
          { value: "10", label: "10 cards" },
          { value: "all", label: `All ${deckSize}` },
        ].filter((option) => option.value === "all" || Number(option.value) <= deckSize),
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
    state.deckId = deckId;
    renderSetup();
    showView("setup");
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
    const relevantSkills = requestedMode === "mixed" ? SKILLS : [requestedMode];
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
    return SKILLS.map((skill) => ({
      skill,
      need: skillPracticeNeed(playerProgress, track, skill) + Math.random() * 8,
    })).sort((left, right) => right.need - left.need)[0].skill;
  }

  function buildChoiceValues(correct, deckPlayers, getter, numeric = false) {
    let pool = [...new Set(deckPlayers.map(getter))].filter((value) => value !== correct && value !== "");
    if (pool.length < 3) {
      pool = [...new Set([...pool, ...players.map(getter)])].filter(
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

  function startSession() {
    const deckPlayers = getDeckPlayers();
    const requestedMode = state.stage === "mastery" ? "mixed" : state.mode;
    const sessionPlayers = chooseSessionPlayers(deckPlayers, state.length, requestedMode);
    state.questions =
      state.stage === "mastery"
        ? sessionPlayers.flatMap((player, playerIndex) =>
            SKILLS.map((skill, factIndex) => ({
              ...buildQuestion(player, skill, deckPlayers, true),
              fullCheck: true,
              playerIndex,
              playerTotal: sessionPlayers.length,
              factIndex,
            })),
          )
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
    if (question.visual === "headshot") return headshot(question.player, "full", true);
    if (question.visual === "number") {
      return `<div class="number-stimulus" aria-label="Jersey number ${h(question.player.number)}"><div><strong>${h(question.player.number)}</strong><span>${h(question.player.team ?? "Dallas Cowboys")}</span></div></div>`;
    }
    return `
      <div class="question-player">
        ${headshot(question.player, "small", true)}
        <strong>${h(question.player.name)}</strong>
        <span>${h(question.player.experience === "R" ? "Rookie" : `Year ${question.player.experience}`)}</span>
      </div>`;
  }

  function renderQuestion() {
    const question = state.questions[state.questionIndex];
    const current = state.questionIndex + 1;
    const total = state.questions.length;
    state.answerLocked = false;
    elements.gameProgressText.textContent = question.fullCheck
      ? `Player ${question.playerIndex + 1}/${question.playerTotal} · Fact ${question.factIndex + 1}/4`
      : `${current} of ${total}`;
    elements.gameProgress.setAttribute("aria-valuemax", total);
    elements.gameProgress.setAttribute("aria-valuenow", current);
    elements.gameProgressBar.style.width = `${(current / total) * 100}%`;
    elements.gameScore.textContent = state.score;
    elements.questionType.textContent = question.label;
    elements.questionTitle.textContent = question.prompt;
    elements.questionVisual.innerHTML = renderQuestionVisual(question);
    elements.answerGrid.innerHTML =
      question.responseType === "choice"
        ? question.choices
            .map(
              (choice, index) =>
                `<button class="answer-button" type="button" data-choice="${index}">${h(choice.label)}</button>`,
            )
            .join("")
        : `
          <form class="recall-form" id="recall-form">
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
          ? question.factIndex === SKILLS.length - 1
            ? "Next player"
            : "Next fact"
          : "Next card";
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

  function answerQuestion(answer) {
    if (state.answerLocked) return;
    state.answerLocked = true;
    const question = state.questions[state.questionIndex];
    const selected = answer.trim();
    const correct = normalizeAnswer(selected) === normalizeAnswer(question.correct);
    if (correct) state.score += 1;
    state.answers.push({ question, selected, correct });
    recordProgress(question.player.id, question.mode, correct, state.stage);
    if (question.fullCheck && question.factIndex === SKILLS.length - 1) {
      const playerAnswers = state.answers.filter(
        (answer) => answer.question.fullCheck && answer.question.player.id === question.player.id,
      );
      const wasVerified = progress.players[question.player.id].verified;
      const passed = playerAnswers.length === SKILLS.length && playerAnswers.every((answer) => answer.correct);
      progress.players[question.player.id].verified = passed;
      if (passed && !wasVerified) addDailyVerifiedPlayer(question.player.id);
      saveProgress();
    }
    elements.gameScore.textContent = state.score;

    if (question.responseType === "choice") {
      elements.answerGrid.querySelectorAll(".answer-button").forEach((button, index) => {
        const value = question.choices[index].value;
        button.disabled = true;
        button.classList.toggle("is-correct", normalizeAnswer(value) === normalizeAnswer(question.correct));
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
    elements.answerFeedback.innerHTML = `
      <div class="feedback-title"><strong>${correct ? "✓ Correct" : `Incorrect — ${h(question.correctDisplay)}`}</strong></div>
      <div class="feedback-facts">
        <div><span>Name</span><strong>${h(question.player.name)}</strong></div>
        <div><span>Number</span><strong>#${h(question.player.number)}</strong></div>
        <div><span>Position</span><strong>${h(question.player.position)}</strong></div>
        <div><span>College</span><strong>${h(question.player.college)}</strong></div>
      </div>`;
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
    elements.resultNote.textContent = missed.length
      ? `${missed.length} ${missed.length === 1 ? "fact needs" : "facts need"} another look. Those players will be prioritized next session.`
      : state.stage === "mastery"
        ? "Every fact was correct. Each player in this check is now verified as learned."
        : state.stage === "recognition"
          ? "Recognition practice complete. Move to typed recall when these feel familiar."
          : "Typed recall complete. Pass the Mastery Check to verify players as learned.";
    elements.resultMark.textContent = percent >= 70 ? "✓" : "↻";
    const currentStageIndex = stages.findIndex((stage) => stage.id === state.stage);
    const nextStage = stages[currentStageIndex + 1];
    elements.nextStageButton.hidden = percent < 80 || !nextStage;
    if (nextStage) elements.nextStageButton.textContent = `Move to ${nextStage.title}`;
    elements.missedSection.hidden = missed.length === 0;
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
            <div><strong>${h(player.name)}</strong><span>#${h(player.number)} · ${h(positionName(player.position, false))}</span></div>
            <strong>Review: ${h(skills.join(", "))}</strong>
          </div>`,
      )
      .join("");
    showView("results");
  }

  function populatePositionFilter() {
    const positions = [...new Set(players.map((player) => player.position))].sort();
    elements.positionFilterOptions.insertAdjacentHTML(
      "beforeend",
      positions
        .map(
          (position) =>
            `<label class="roster-choice"><input type="radio" name="position" value="${h(position)}" /><span>${h(position)}</span></label>`,
        )
        .join(""),
    );
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
    const filtered = players.filter((player) => {
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
        const currentStageIndex = stages.findIndex((stage) => stage.id === state.stage);
        state.stage = stages[Math.min(currentStageIndex + 1, stages.length - 1)].id;
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
      savePlayerDeckSelection();
      openRecommendedSetup();
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
      if (kind === "package") state.deckId = value;
      if (kind === "stage") state.stage = value;
      if (kind === "mode") state.mode = value;
      if (kind === "length") state.length = value === "all" ? "all" : Number(value);
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

  elements.dataDate.textContent = formatDate(rosterData.meta.updated);
  populatePositionFilter();
  renderDashboard();
})();
