#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const root = resolve("www");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const mimeTypes = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".svg": "image/svg+xml" };

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const requested = pathname === "/" ? "/index.html" : pathname;
    const filePath = normalize(join(root, requested));
    if (!filePath.startsWith(root)) throw new Error("Invalid path");
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Not a file");
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

await new Promise((resolveReady) => server.listen(0, "127.0.0.1", resolveReady));
const webPort = server.address().port;
const chromePort = webPort + 1;
const profile = await mkdtemp(join(tmpdir(), "player-decks-check-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  `--remote-debugging-port=${chromePort}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore" });

async function retry(task, attempts = 50) {
  let error;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await task(); } catch (caught) { error = caught; await new Promise((resolveWait) => setTimeout(resolveWait, 100)); }
  }
  throw error;
}

function connect(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let id = 0;
  const ready = new Promise((resolveReady, rejectReady) => {
    socket.addEventListener("open", resolveReady, { once: true });
    socket.addEventListener("error", rejectReady, { once: true });
  });
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handlers.rejectCall(new Error(message.error.message));
    else handlers.resolveCall(message.result);
  });
  return {
    async call(method, params = {}) {
      await ready;
      const callId = ++id;
      return new Promise((resolveCall, rejectCall) => {
        pending.set(callId, { resolveCall, rejectCall });
        socket.send(JSON.stringify({ id: callId, method, params }));
      });
    },
    close() { socket.close(); },
  };
}

async function evaluate(client, expression) {
  const response = await client.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}

try {
  await retry(() => fetch(`http://127.0.0.1:${chromePort}/json/version`).then((response) => {
    if (!response.ok) throw new Error("Chrome not ready");
    return response.json();
  }));
  const target = await fetch(`http://127.0.0.1:${chromePort}/json/new?${encodeURIComponent(`http://127.0.0.1:${webPort}/`)}`, { method: "PUT" }).then((response) => response.json());
  const client = connect(target.webSocketDebuggerUrl);
  await client.call("Page.enable");
  await client.call("Runtime.enable");
  await client.call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await retry(async () => {
    if (await evaluate(client, "document.readyState !== 'complete' || !document.querySelector('[data-player-deck]')")) throw new Error("App not ready");
  });

  const deckStates = await evaluate(client, `(() => {
    const cards = [...document.querySelectorAll('[data-player-deck]')];
    const landing = {
      cardCount: cards.length,
      header: document.querySelector('#header-context').textContent,
      oldBrandVisible: document.querySelector('.site-header').textContent.includes('Player Decks'),
      unavailableDisabled: cards[1].disabled,
      unavailableLabel: cards[1].textContent.replace(/\\s+/g, ' ').trim(),
      studyRosterVisible: /Study\\s+Cowboys\\s+roster/i.test(document.body.textContent),
      playersShortcutHidden: document.querySelector('#browse-players').hidden,
      touchAction: getComputedStyle(document.body).touchAction,
      palette: {
        canvas: getComputedStyle(document.body).backgroundColor,
        header: getComputedStyle(document.querySelector('.site-header')).backgroundColor,
        text: getComputedStyle(document.body).color
      },
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
    cards[0].click();
    return { ...landing, enteredDeck: document.querySelector('[data-view="setup"]').classList.contains('is-active') };
  })()`);
  if (deckStates.cardCount !== 2 || deckStates.header !== "Decks" || deckStates.oldBrandVisible || !deckStates.unavailableDisabled || !deckStates.unavailableLabel.includes("Coming next") || deckStates.studyRosterVisible || !deckStates.playersShortcutHidden || deckStates.touchAction !== "manipulation" || deckStates.palette.canvas !== "rgb(246, 247, 251)" || deckStates.palette.header !== "rgb(255, 255, 255)" || deckStates.palette.text !== "rgb(27, 30, 40)" || deckStates.overflow || !deckStates.enteredDeck) throw new Error(`Deck home failed: ${JSON.stringify(deckStates)}`);

  const setup = await evaluate(client, `(() => {
    const setupView = document.querySelector('[data-view="setup"]');
    const initial = {
      active: setupView.classList.contains('is-active'),
      training: document.querySelector('[data-view="training"]').classList.contains('is-active'),
      packageTitle: document.querySelector('#setup-title').textContent,
      sentence: document.querySelector('.session-sentence-card').innerText.replace(/\\s+/g, ' ').trim(),
      header: document.querySelector('#header-context').textContent,
      backLabel: document.querySelector('#header-back').getAttribute('aria-label'),
      backText: document.querySelector('#header-back').textContent.trim(),
      backLeft: document.querySelector('#header-back').getBoundingClientRect().left,
      backInRail: document.querySelector('#header-back').getBoundingClientRect().bottom <= document.querySelector('.site-header').getBoundingClientRect().bottom,
      fluff: /Group 1|Begin with|Smart practice|Training level|What do you want to learn/i.test(setupView.textContent),
      memberSummaryAbsent: !document.querySelector('#setup-members, .package-members, .package-member'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
    document.querySelector('#setup-package').click();
    const packageDialogOpened = document.querySelector('#session-option-dialog').open;
    const packageCount = document.querySelectorAll('[data-setup-kind="package"]').length;
    const packageHasCounts = [...document.querySelectorAll('[data-setup-kind="package"] small')].every((item) => /players/.test(item.textContent));
    document.querySelector('[data-setup-kind="package"][data-setup-value="offense"]').click();
    const changedPackage = document.querySelector('#setup-title').textContent;
    document.querySelector('#setup-package').click();
    document.querySelector('[data-setup-kind="package"][data-setup-value="famous"]').click();
    document.querySelector('#setup-mode-value').click();
    const dialogOpened = document.querySelector('#session-option-dialog').open;
    document.querySelector('[data-setup-kind="mode"][data-setup-value="faces"]').click();
    const selectedMode = document.querySelector('#setup-mode-value').textContent;
    const startLabel = document.querySelector('#setup-start').textContent;
    const touch = (type, x, y) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, 'changedTouches', { value: [{ clientX: x, clientY: y }] });
      setupView.dispatchEvent(event);
    };
    touch('touchstart', 320, 300);
    touch('touchend', 180, 305);
    const swipeReturned = document.querySelector('[data-view="dashboard"]').classList.contains('is-active');
    document.querySelector('[data-player-deck="cowboys"]').click();
    return { ...initial, packageDialogOpened, packageCount, packageHasCounts, changedPackage, dialogOpened, selectedMode, startLabel, swipeReturned };
  })()`);
  if (!setup.active || setup.training || setup.packageTitle !== 'Most famous' || setup.header !== 'Cowboys roster' || !setup.sentence.includes('Practice recognition with mixed facts for 5 cards.') || setup.backLabel !== 'Back to decks' || setup.backText !== '←' || setup.backLeft > 20 || !setup.backInRail || setup.fluff || !setup.memberSummaryAbsent || setup.overflow || !setup.packageDialogOpened || setup.packageCount !== 8 || !setup.packageHasCounts || setup.changedPackage !== 'Offense' || !setup.dialogOpened || setup.selectedMode !== 'faces & names' || setup.startLabel !== 'Start 5 cards' || !setup.swipeReturned) throw new Error(`Setup flow failed: ${JSON.stringify(setup)}`);

  const knowledgeModes = await evaluate(client, `(() => {
    document.querySelector('[data-study-type="lineup"]').click();
    const lineupInitial = {
      selected: document.querySelector('[data-study-type="lineup"]').getAttribute('aria-pressed') === 'true',
      title: document.querySelector('#setup-title').textContent,
      sentence: document.querySelector('.session-sentence-card').innerText.replace(/\\s+/g, ' ').trim(),
      contentHidden: document.querySelector('#setup-content-choice').hidden,
      start: document.querySelector('#setup-start').textContent
    };
    document.querySelector('#setup-package').click();
    const lineupPackCount = document.querySelectorAll('[data-setup-kind="package"]').length;
    const lineupCounts = [...document.querySelectorAll('[data-setup-kind="package"] small')].every((item) => /questions/.test(item.textContent));
    document.querySelector('[data-setup-kind="package"][data-setup-value="special-teams"]').click();
    const specialTeamsStart = document.querySelector('#setup-start').textContent;
    document.querySelector('#setup-start').click();
    const lineupTraining = document.querySelector('[data-view="training"]').classList.contains('is-active');
    const lineupStimulus = Boolean(document.querySelector('.knowledge-stimulus'));
    document.querySelector('.answer-button').click();
    const lineupFeedback = Boolean(document.querySelector('.knowledge-detail'));
    document.querySelector('[data-action="exit-session"]').click();

    document.querySelector('[data-study-type="trivia"]').click();
    const triviaInitial = {
      selected: document.querySelector('[data-study-type="trivia"]').getAttribute('aria-pressed') === 'true',
      title: document.querySelector('#setup-title').textContent,
      contentHidden: document.querySelector('#setup-content-choice').hidden,
      start: document.querySelector('#setup-start').textContent
    };
    document.querySelector('#setup-package').click();
    const triviaPackCount = document.querySelectorAll('[data-setup-kind="package"]').length;
    const triviaCounts = [...document.querySelectorAll('[data-setup-kind="package"] small')].every((item) => /questions/.test(item.textContent));
    document.querySelector('#session-option-dialog [data-action="close-session-options"]').click();
    document.querySelector('#setup-start').click();
    const triviaTraining = document.querySelector('[data-view="training"]').classList.contains('is-active');
    const triviaStimulusAbsent = document.querySelector('#question-visual').hidden && !document.querySelector('.knowledge-stimulus');
    const triviaRevealAbsent = !document.querySelector('.trivia-reveal');
    document.querySelector('.answer-button').click();
    const triviaReveal = document.querySelector('.trivia-reveal');
    const triviaFeedback = {
      detail: Boolean(document.querySelector('.knowledge-detail')),
      reveal: Boolean(triviaReveal),
      localImage: triviaReveal?.querySelector('img')?.getAttribute('src')?.startsWith('assets/trivia/') ?? false,
      alt: Boolean(triviaReveal?.querySelector('img')?.getAttribute('alt')),
      caption: Boolean(triviaReveal?.querySelector('figcaption')?.textContent.trim())
    };
    const knowledgeSaved = Object.keys(JSON.parse(localStorage.getItem('cowboys-roster-lab-v1')).knowledge).length >= 2;
    document.querySelector('[data-action="exit-session"]').click();
    document.querySelector('[data-study-type="players"]').click();
    const playersRestored = document.querySelector('#setup-title').textContent === 'Most famous' && document.querySelector('#setup-mode-value').textContent === 'mixed facts';
    return { lineupInitial, lineupPackCount, lineupCounts, specialTeamsStart, lineupTraining, lineupStimulus, lineupFeedback, triviaInitial, triviaPackCount, triviaCounts, triviaTraining, triviaStimulusAbsent, triviaRevealAbsent, triviaFeedback, knowledgeSaved, playersRestored };
  })()`);
  if (!knowledgeModes.lineupInitial.selected || knowledgeModes.lineupInitial.title !== 'Mixed' || !knowledgeModes.lineupInitial.sentence.includes('Practice recognition for 5 questions.') || !knowledgeModes.lineupInitial.contentHidden || knowledgeModes.lineupInitial.start !== 'Start 5 questions' || knowledgeModes.lineupPackCount !== 5 || !knowledgeModes.lineupCounts || knowledgeModes.specialTeamsStart !== 'Start 3 questions' || !knowledgeModes.lineupTraining || !knowledgeModes.lineupStimulus || !knowledgeModes.lineupFeedback || !knowledgeModes.triviaInitial.selected || knowledgeModes.triviaInitial.title !== 'Mixed' || !knowledgeModes.triviaInitial.contentHidden || knowledgeModes.triviaInitial.start !== 'Start 5 questions' || knowledgeModes.triviaPackCount !== 5 || !knowledgeModes.triviaCounts || !knowledgeModes.triviaTraining || !knowledgeModes.triviaStimulusAbsent || !knowledgeModes.triviaRevealAbsent || !knowledgeModes.triviaFeedback.detail || !knowledgeModes.triviaFeedback.reveal || !knowledgeModes.triviaFeedback.localImage || !knowledgeModes.triviaFeedback.alt || !knowledgeModes.triviaFeedback.caption || !knowledgeModes.knowledgeSaved || !knowledgeModes.playersRestored) throw new Error(`Knowledge modes failed: ${JSON.stringify(knowledgeModes)}`);

  const lesson = await evaluate(client, `(() => {
    document.querySelector('#setup-start').click();
    const firstAnswer = document.querySelector('.answer-button');
    firstAnswer.click();
    return {
      training: document.querySelector('[data-view="training"]').classList.contains('is-active'),
      feedbackVisible: !document.querySelector('#answer-feedback').hidden,
      nextVisible: !document.querySelector('#next-wrap').hidden,
      internalProgress: JSON.parse(localStorage.getItem('cowboys-roster-lab-v1')).totalAnswers > 0,
      closeTop: document.querySelector('[data-action="exit-session"]').getBoundingClientRect().top,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  })()`);
  if (!lesson.training || !lesson.feedbackVisible || !lesson.nextVisible || !lesson.internalProgress || lesson.closeTop < 34 || lesson.overflow) throw new Error(`Lesson flow failed: ${JSON.stringify(lesson)}`);

  const rosterControls = await evaluate(client, `(() => {
    document.querySelector('[data-action="exit-session"]').click();
    document.querySelector('#browse-players').click();
    document.querySelector('#roster-controls-button').click();
    const dialogOpened = document.querySelector('#roster-controls-dialog').open;
    const combined = Boolean(document.querySelector('[name="group"]') && document.querySelector('[name="position"]') && document.querySelector('[name="sort"]'));
    const learningControlsAbsent = !document.querySelector('[name="progress"], [name="sort"][value="practice"], [name="sort"][value="progress"]');
    const groupOptionCount = document.querySelectorAll('[name="group"]').length;
    document.querySelector('[name="group"][value="famous"]').checked = true;
    document.querySelector('#roster-controls-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const famousPlayerCount = document.querySelectorAll('.player-card').length;
    const expectedFamousPlayerCount = window.COWBOYS_ROSTER.players.filter((player) => player.tier === 'famous').length;
    const learningBadgesAbsent = !document.querySelector('.learning-status');
    document.querySelector('#roster-controls-button').click();
    document.querySelector('[name="group"][value="practice-squad"]').checked = true;
    document.querySelector('#roster-controls-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const practiceSquadCount = document.querySelectorAll('.player-card').length;
    const expectedPracticeSquadCount = window.COWBOYS_ROSTER.players.filter((player) => player.status === 'Practice Squad').length;
    const practiceStatusAligned = document.querySelector('.player-status')?.textContent.includes('Practice squad') && !document.querySelector('.player-position')?.textContent.includes('Practice Squad');
    document.querySelector('#roster-controls-button').click();
    document.querySelector('[data-action="clear-roster-controls"]').click();
    document.querySelector('#roster-controls-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    document.querySelector('#roster-controls-button').click();
    document.querySelector('[name="position"][value="WR"]').checked = true;
    document.querySelector('#roster-controls-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const badge = document.querySelector('#roster-filter-count').textContent;
    document.querySelector('#roster-controls-button').click();
    document.querySelector('[data-action="clear-roster-controls"]').click();
    document.querySelector('#roster-controls-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    document.querySelector('#roster-controls-button').click();
    const sortOptionCount = document.querySelectorAll('[name="sort"]').length;
    document.querySelector('[name="sort"][value="height"]').checked = true;
    document.querySelector('#roster-controls-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const tallestInches = Math.max(...window.COWBOYS_ROSTER.players.map((player) => {
      const [feet, inches] = player.height.split('-').map(Number);
      return feet * 12 + inches;
    }));
    const tallestHeight = Math.floor(tallestInches / 12) + '′' + (tallestInches % 12) + '″';
    const heightSorted = document.querySelector('.player-position').textContent.includes(tallestHeight);
    document.querySelector('#roster-controls-button').click();
    document.querySelector('[name="sort"][value="weight"]').checked = true;
    document.querySelector('#roster-controls-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const heaviest = Math.max(...window.COWBOYS_ROSTER.players.map((player) => Number(player.weight)));
    const weightSorted = document.querySelector('.player-position').textContent.includes(heaviest + ' lb');
    document.querySelector('#roster-controls-button').click();
    document.querySelector('[name="sort"][value="depth"]').checked = true;
    document.querySelector('#roster-controls-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const depthSorted = document.querySelector('.player-status')?.textContent.startsWith('Starter · ');
    document.querySelector('#roster-controls-button').click();
    document.querySelector('[data-action="clear-roster-controls"]').click();
    document.querySelector('#roster-controls-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const reset = document.querySelector('#roster-filter-count').hidden;
    const back = document.querySelector('#header-back');
    return { dialogOpened, combined, learningControlsAbsent, groupOptionCount, famousPlayerCount, expectedFamousPlayerCount, learningBadgesAbsent, practiceSquadCount, expectedPracticeSquadCount, practiceStatusAligned, badge, sortOptionCount, heightSorted, weightSorted, depthSorted, reset, backLabel: back.getAttribute('aria-label'), backAction: back.dataset.action, backText: back.textContent.trim() };
  })()`);
  if (!rosterControls.dialogOpened || !rosterControls.combined || !rosterControls.learningControlsAbsent || rosterControls.groupOptionCount !== 8 || rosterControls.famousPlayerCount !== 8 || rosterControls.famousPlayerCount !== rosterControls.expectedFamousPlayerCount || !rosterControls.learningBadgesAbsent || rosterControls.practiceSquadCount !== rosterControls.expectedPracticeSquadCount || !rosterControls.practiceStatusAligned || rosterControls.badge !== ' · 1' || rosterControls.sortOptionCount !== 7 || !rosterControls.heightSorted || !rosterControls.weightSorted || !rosterControls.depthSorted || !rosterControls.reset || rosterControls.backLabel !== 'Back to Cowboys roster' || rosterControls.backAction !== 'deck' || rosterControls.backText !== '←') throw new Error(`Roster controls failed: ${JSON.stringify(rosterControls)}`);

  await evaluate(client, `(() => {
    const search = document.querySelector('#roster-search');
    search.value = 'Lamb';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  const roster = await retry(async () => {
    const result = await evaluate(client, `(() => ({
      active: document.querySelector('[data-view="roster"]').classList.contains('is-active'),
      cards: document.querySelectorAll('.player-card').length,
      clearVisible: !document.querySelector('#roster-search-clear').hidden,
      refineLabel: document.querySelector('#roster-controls-button').textContent.replace(/\\s+/g, ' ').trim(),
      cardHeight: document.querySelector('.player-card')?.getBoundingClientRect().height,
      headshotWidth: document.querySelector('.player-card .headshot')?.getBoundingClientRect().width,
      physicals: document.querySelector('.player-position')?.textContent,
      collegeMark: document.querySelector('.college-mark img')?.getAttribute('src'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    }))()`);
    if (!result.active || result.cards !== 1) throw new Error("Roster not filtered yet");
    return result;
  });
  if (!roster.clearVisible || roster.refineLabel !== 'Refine' || roster.cardHeight > 110 || roster.headshotWidth > 78 || !/′.*″.*lb/.test(roster.physicals) || !roster.collegeMark?.startsWith('assets/college-marks/') || roster.overflow) throw new Error(`Roster search failed: ${JSON.stringify(roster)}`);
  const cleared = await evaluate(client, `(() => {
    document.querySelector('#roster-search-clear').click();
    return {
      value: document.querySelector('#roster-search').value,
      focused: document.activeElement === document.querySelector('#roster-search'),
      clearHidden: document.querySelector('#roster-search-clear').hidden,
      cards: document.querySelectorAll('.player-card').length,
      marks: document.querySelectorAll('.college-mark').length,
      marksWithImages: document.querySelectorAll('.college-mark img').length,
      maxCardHeight: Math.max(...[...document.querySelectorAll('.player-card')].map((card) => card.getBoundingClientRect().height)),
      total: window.COWBOYS_ROSTER.players.length
    };
  })()`);
  if (cleared.value || !cleared.focused || !cleared.clearHidden || cleared.cards !== cleared.total || cleared.marks !== cleared.total || cleared.marksWithImages < cleared.total - 2 || cleared.maxCardHeight > 116) throw new Error(`Roster clear failed: ${JSON.stringify(cleared)}`);

  await client.call("Emulation.setDeviceMetricsOverride", { width: 320, height: 700, deviceScaleFactor: 3, mobile: true });
  const narrow = await evaluate(client, `(() => {
    document.querySelector('#roster-controls-button').click();
    const dialog = document.querySelector('#roster-controls-dialog');
    const rect = dialog.getBoundingClientRect();
    const actions = dialog.querySelector('.dialog-actions').getBoundingClientRect();
    return {
      open: dialog.open,
      withinViewport: rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      actionsReachable: actions.top < innerHeight && actions.bottom <= innerHeight,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  })()`);
  if (!narrow.open || !narrow.withinViewport || !narrow.actionsReachable || narrow.documentOverflow) throw new Error(`Narrow refine sheet failed: ${JSON.stringify(narrow)}`);
  await evaluate(client, `document.querySelector('#roster-controls-dialog').close()`);
  await client.call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  const reducedMotion = await evaluate(client, `getComputedStyle(document.querySelector('[data-view="roster"]')).animationDuration`);
  if (reducedMotion !== "1e-05s") throw new Error(`Reduced motion failed: ${reducedMotion}`);
  client.close();
  console.log("Player Decks production flow passed at 390×844.");
} finally {
  chrome.kill("SIGTERM");
  server.close();
  if (chrome.exitCode === null) await new Promise((resolveExit) => chrome.once("exit", resolveExit));
  await retry(() => rm(profile, { recursive: true, force: true }), 10);
}
