(() => {
  "use strict";

  const rosterData = window.COWBOYS_ROSTER;
  if (!rosterData?.players?.length) {
    document.body.innerHTML =
      '<main class="narrow-shell"><h1>Roster unavailable</h1><p>The roster data did not load. Try refreshing the page.</p></main>';
    return;
  }

  const players = rosterData.players;
  const STORAGE_KEY = "cowboys-roster-lab-v1";
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

  const decks = [
    {
      id: "stars",
      label: "Group 1",
      title: "Key players",
      description: "Begin with the 12 names every Cowboys fan should recognize.",
      filter: (player) => player.tier === "star",
    },
    {
      id: "core",
      label: "Group 2",
      title: "Core contributors",
      description: "Key starters, contributors, and specialists across the team.",
      filter: (player) => player.tier === "star" || player.tier === "core",
    },
    {
      id: "offense",
      label: "Group 3",
      title: "The offense",
      description: "Quarterbacks, playmakers, tight ends, and the offensive line.",
      filter: (player) => OFFENSE.has(player.position),
    },
    {
      id: "defense",
      label: "Group 4",
      title: "The defense",
      description: "Learn the front, linebackers, corners, and safeties.",
      filter: (player) => DEFENSE.has(player.position),
    },
    {
      id: "new-faces",
      label: "Group 5",
      title: "Depth & newcomers",
      description: "Go deeper with rookies, reserves, and camp competition.",
      filter: (player) => player.tier === "roster",
    },
    {
      id: "all",
      label: "Group 6",
      title: "Complete roster",
      description: "Every active and reserve player on the official roster.",
      filter: () => true,
    },
  ];

  const modes = [
    { id: "faces", title: "Faces & names", description: "Type the full name from the headshot.", icon: "N" },
    { id: "numbers", title: "Jersey numbers", description: "Type the player or jersey number.", icon: "#" },
    { id: "positions", title: "Positions", description: "Type the exact position abbreviation.", icon: "P" },
    { id: "colleges", title: "Colleges", description: "Type the full college name.", icon: "C" },
    { id: "mixed", title: "Mixed facts", description: "Rotate among names, numbers, positions, and colleges.", icon: "4" },
  ];

  const stages = [
    {
      id: "recognition",
      level: "Level 1",
      title: "Recognition",
      description: "Learn with four-option multiple choice. Does not verify mastery.",
    },
    {
      id: "recall",
      level: "Level 2",
      title: "Typed recall",
      description: "Type one fact at a time without choices.",
    },
    {
      id: "mastery",
      level: "Level 3",
      title: "Mastery check",
      description: "Type all four facts. This is the only level that verifies a player.",
    },
  ];

  const defaultProgress = { players: {}, totalAnswers: 0, totalCorrect: 0, sessions: 0, daily: {} };
  let progress = loadProgress();
  const state = {
    deckId: "stars",
    mode: "mixed",
    stage: "recognition",
    length: 5,
    questions: [],
    questionIndex: 0,
    score: 0,
    answers: [],
    answerLocked: false,
  };

  const elements = {
    views: [...document.querySelectorAll("[data-view]")],
    footer: document.querySelector(".site-footer"),
    deckGrid: document.querySelector("#deck-grid"),
    learnedTotal: document.querySelector("#learned-total"),
    overallProgressBar: document.querySelector("#overall-progress-bar"),
    studyTotal: document.querySelector("#study-total"),
    dailyVerified: document.querySelector("#daily-verified"),
    dailyAccuracy: document.querySelector("#daily-accuracy"),
    dailyAccuracyLabel: document.querySelector("#daily-accuracy-label"),
    dailySessions: document.querySelector("#daily-sessions"),
    dailyResults: document.querySelector("#daily-results"),
    dailyShareButton: document.querySelector("#daily-share-button"),
    rosterKicker: document.querySelector("#roster-kicker"),
    dataDate: document.querySelector("#data-date"),
    setupLevel: document.querySelector("#setup-level"),
    setupTitle: document.querySelector("#setup-title"),
    setupDescription: document.querySelector("#setup-description"),
    setupPlayerCount: document.querySelector("#setup-player-count"),
    setupMastery: document.querySelector("#setup-mastery"),
    stageGrid: document.querySelector("#stage-grid"),
    modeGrid: document.querySelector("#mode-grid"),
    modeOptionGroup: document.querySelector("#mode-option-group"),
    lengthOptions: document.querySelector("#length-options"),
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
    rosterSummary: document.querySelector("#roster-summary"),
    rosterSearch: document.querySelector("#roster-search"),
    positionFilter: document.querySelector("#position-filter"),
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
    return decks.find((deck) => deck.id === deckId) ?? decks[0];
  }

  function getDeckPlayers(deck = getDeck()) {
    return players.filter(deck.filter);
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
        <span class="headshot-placeholder" aria-hidden="true">★</span>
        <img src="${h(player.image)}" alt="${h(player.name)} headshot" ${eager ? "" : 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" />
      </div>`;
  }

  function formatDate(dateString) {
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(
      new Date(`${dateString}T12:00:00`),
    );
  }

  function showView(viewName) {
    elements.views.forEach((view) => {
      const active = view.dataset.view === viewName;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });
    document.body.classList.toggle("is-training", viewName === "training");
    elements.footer.hidden = viewName === "training";
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderDailySummary() {
    const today = getTodayStats();
    const percent = today.questions ? Math.round((today.correct / today.questions) * 100) : 0;
    elements.dailyVerified.textContent = today.verifiedPlayers.length;
    elements.dailyAccuracy.textContent = `${today.correct}/${today.questions}`;
    elements.dailyAccuracyLabel.textContent = today.questions
      ? `Answers correct · ${percent}%`
      : "Answers correct";
    elements.dailySessions.textContent = today.sessions;
    elements.dailyShareButton.disabled = today.questions === 0;
    elements.dailyResults.innerHTML = today.outcomes.length
      ? today.outcomes
          .slice(-50)
          .map(
            (outcome) =>
              `<span class="daily-result ${outcome ? "is-correct" : "is-wrong"}" aria-label="${outcome ? "Correct" : "Incorrect"}"></span>`,
          )
          .join("")
      : '<span class="daily-empty">Complete a training session to build today’s report.</span>';
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
      `Cowboys Roster Trainer — ${date}`,
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
        await navigator.share({ title: "Cowboys Roster Trainer", text, url });
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
    const totalSeen = Object.values(progress.players).filter((entry) => entry.seen > 0).length;
    elements.learnedTotal.textContent = learned;
    elements.overallProgressBar.style.width = `${(learned / players.length) * 100}%`;
    elements.studyTotal.textContent = progress.totalAnswers
      ? `${progress.totalAnswers} cards answered · ${totalSeen} players seen`
      : "Ready for your first card";
    renderDailySummary();

    elements.deckGrid.innerHTML = decks
      .map((deck, index) => {
        const deckPlayers = getDeckPlayers(deck);
        const mastered = learnedCount(deckPlayers);
        const percent = Math.round((mastered / deckPlayers.length) * 100);
        return `
          <button class="deck-card${index === 0 ? " is-featured" : ""}" type="button" data-deck="${h(deck.id)}">
            <span class="deck-card-content">
              <span class="deck-topline">
                <span class="level-number">${h(deck.label)}</span>
                <span class="player-count">${deckPlayers.length} players</span>
              </span>
              <h3>${h(deck.title)}</h3>
              <p>${h(deck.description)}</p>
              <span class="deck-progress">
                <span>${mastered} verified</span><span>${percent}%</span>
                <span class="deck-progress-track"><span style="width:${percent}%"></span></span>
              </span>
            </span>
          </button>`;
      })
      .join("");
  }

  function renderSetup() {
    const deck = getDeck();
    const deckPlayers = getDeckPlayers(deck);
    const mastered = learnedCount(deckPlayers);
    elements.setupLevel.textContent = deck.label;
    elements.setupTitle.textContent = deck.title;
    elements.setupDescription.textContent = deck.description;
    elements.setupPlayerCount.textContent = `${deckPlayers.length} players`;
    const knownFacts = learnedFactCount(deckPlayers);
    elements.setupMastery.textContent = `${mastered} verified · ${knownFacts}/${deckPlayers.length * SKILLS.length} facts confirmed`;
    elements.stageGrid.innerHTML = stages
      .map(
        (stage) => `
          <button class="stage-card${stage.id === state.stage ? " is-selected" : ""}" type="button" data-stage="${h(stage.id)}" aria-pressed="${stage.id === state.stage}">
            <span>${h(stage.level)}</span>
            <strong>${h(stage.title)}</strong>
            <small>${h(stage.description)}</small>
          </button>`,
      )
      .join("");
    elements.modeOptionGroup.hidden = state.stage === "mastery";
    elements.modeGrid.innerHTML = modes
      .map(
        (mode) => `
          <button class="mode-card${mode.id === state.mode ? " is-selected" : ""}" type="button" data-mode="${h(mode.id)}" aria-pressed="${mode.id === state.mode}">
            <strong>${h(mode.title)}</strong>
            <small>${h(mode.description)}</small>
            <span class="mode-icon" aria-hidden="true">${h(mode.icon)}</span>
          </button>`,
      )
      .join("");
    renderLengthOptions();
  }

  function renderLengthOptions() {
    const deckSize = getDeckPlayers().length;
    elements.lengthOptions.querySelectorAll("button").forEach((button) => {
      const value = button.dataset.length;
      const numericValue = value === "all" ? deckSize : Number(value);
      button.classList.toggle("is-selected", state.length === value || state.length === numericValue);
      button.disabled = value !== "all" && Number(value) > deckSize;
    });
  }

  function openDeck(deckId) {
    state.deckId = deckId;
    renderSetup();
    showView("setup");
  }

  function chooseSessionPlayers(deckPlayers, requestedLength, requestedMode) {
    const count = requestedLength === "all" ? deckPlayers.length : Math.min(Number(requestedLength), deckPlayers.length);
    return [...deckPlayers]
      .map((player) => {
        const playerProgress = getPlayerProgress(player.id);
        const skillProgress =
          state.stage === "recognition" ? playerProgress.recognitionSkills : playerProgress.skills;
        const knowledge =
          requestedMode === "mixed"
            ? SKILLS.reduce((total, skill) => total + skillProgress[skill], 0)
            : skillProgress[requestedMode];
        return { player, priority: knowledge * 10 + Math.random() * 7 };
      })
      .sort((left, right) => left.priority - right.priority)
      .slice(0, count)
      .map(({ player }) => player);
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
        prompt: "Who is this Cowboy?",
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
            const mode = state.mode === "mixed" ? SKILLS[Math.floor(Math.random() * SKILLS.length)] : state.mode;
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
      return `<div class="number-stimulus" aria-label="Jersey number ${h(question.player.number)}"><div><strong>${h(question.player.number)}</strong><span>Dallas Cowboys</span></div></div>`;
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
    elements.resultMark.textContent = percent === 100 ? "★" : percent >= 70 ? "✓" : "↻";
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
    elements.positionFilter.insertAdjacentHTML(
      "beforeend",
      positions
        .map((position) => `<option value="${h(position)}">${h(position)} — ${h(positionName(position, false))}</option>`)
        .join(""),
    );
  }

  function renderRoster() {
    const query = elements.rosterSearch.value.trim().toLowerCase();
    const selectedPosition = elements.positionFilter.value;
    const filtered = players.filter((player) => {
      const matchesPosition = selectedPosition === "all" || player.position === selectedPosition;
      const haystack = `${player.name} ${player.number} ${player.position} ${player.college}`.toLowerCase();
      return matchesPosition && haystack.includes(query);
    });

    elements.rosterCount.textContent = `Showing ${filtered.length} of ${players.length} players`;
    elements.playerGrid.innerHTML = filtered.length
      ? filtered
          .map(
            (player) => `
              <article class="player-card">
                ${headshot(player)}
                <div class="player-card-body">
                  <div class="player-card-topline">
                    <h2>${h(player.name)}</h2>
                    <span class="jersey-number">#${h(player.number)}</span>
                  </div>
                  <p class="player-position">${h(positionName(player.position))}${player.status !== "Active" ? ` · ${h(player.status)}` : ""}</p>
                  <p class="player-college"><strong>College:</strong> ${h(player.college)}</p>
                  <a href="${h(player.profile)}" target="_blank" rel="noreferrer">Official profile ↗</a>
                </div>
              </article>`,
          )
          .join("")
      : '<p class="empty-roster">No players match that search.</p>';
  }

  function openRoster() {
    const activeCount = players.filter((player) => player.status === "Active").length;
    elements.rosterSummary.textContent = `${activeCount} active players plus ${players.length - activeCount} reserve/injured, current as of ${formatDate(rosterData.meta.updated)}.`;
    renderRoster();
    showView("roster");
  }

  document.addEventListener("click", (event) => {
    const actionTarget = event.target.closest("[data-action]");
    if (actionTarget) {
      const action = actionTarget.dataset.action;
      if (action === "home") {
        renderDashboard();
        showView("dashboard");
      } else if (action === "browse") {
        openRoster();
      } else if (action === "quick-start") {
        openDeck("stars");
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
      }
      return;
    }

    const deckTarget = event.target.closest("[data-deck]");
    if (deckTarget) {
      openDeck(deckTarget.dataset.deck);
      return;
    }

    const stageTarget = event.target.closest("[data-stage]");
    if (stageTarget) {
      state.stage = stageTarget.dataset.stage;
      renderSetup();
      return;
    }

    const modeTarget = event.target.closest("[data-mode]");
    if (modeTarget) {
      state.mode = modeTarget.dataset.mode;
      elements.modeGrid.querySelectorAll("[data-mode]").forEach((button) => {
        const selected = button.dataset.mode === state.mode;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected);
      });
      return;
    }

    const lengthTarget = event.target.closest("[data-length]");
    if (lengthTarget && !lengthTarget.disabled) {
      state.length = lengthTarget.dataset.length === "all" ? "all" : Number(lengthTarget.dataset.length);
      renderLengthOptions();
      return;
    }

    const choiceTarget = event.target.closest("[data-choice]");
    if (choiceTarget) {
      const question = state.questions[state.questionIndex];
      answerQuestion(question.choices[Number(choiceTarget.dataset.choice)].value);
    }
  });

  document.addEventListener("submit", (event) => {
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
    },
    true,
  );

  elements.rosterSearch.addEventListener("input", renderRoster);
  elements.positionFilter.addEventListener("change", renderRoster);
  document.addEventListener("keydown", (event) => {
    if (document.querySelector('[data-view="training"].is-active') && state.answerLocked && event.key === "Enter") {
      nextQuestion();
    }
  });

  const activeCount = players.filter((player) => player.status === "Active").length;
  elements.rosterKicker.textContent = `${rosterData.meta.season} roster study guide · ${activeCount} active players`;
  elements.dataDate.textContent = formatDate(rosterData.meta.updated);
  populatePositionFilter();
  renderDashboard();
})();
