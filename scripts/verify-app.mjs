#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
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

  if (process.env.CAPTURE_DIR) {
    await mkdir(process.env.CAPTURE_DIR, { recursive: true });
    const screenshot = await client.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPTURE_DIR, 'deck-list.png'), Buffer.from(screenshot.data, 'base64'));
  }

  const deckStates = await evaluate(client, `(() => {
    const cards = [...document.querySelectorAll('[data-player-deck]')];
    const patriotsCard = document.querySelector('[data-player-deck="patriots"]');
    const nflCard = document.querySelector('[data-player-deck="nfl-top-100"]');
    const landing = {
      cardCount: cards.length,
      header: document.querySelector('#header-context').textContent,
      oldBrandVisible: document.querySelector('.site-header').textContent.includes('Player Decks'),
      teamLogos: cards.slice(0, 2).every((card) => card.querySelector('.player-deck-mark img')?.getAttribute('src')?.startsWith('assets/team-logos/')),
      patriotsEnabled: !patriotsCard.disabled,
      patriotsLabel: patriotsCard.textContent.replace(/\\s+/g, ' ').trim(),
      nflEnabled: !nflCard.disabled,
      nflLabel: nflCard.textContent.replace(/\\s+/g, ' ').trim(),
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
  if (deckStates.cardCount !== 3 || deckStates.header !== "Decks" || deckStates.oldBrandVisible || !deckStates.teamLogos || !deckStates.patriotsEnabled || !deckStates.patriotsLabel.includes("0 of 77 learned") || !deckStates.nflEnabled || !deckStates.nflLabel.includes("0 of 100 learned") || deckStates.studyRosterVisible || !deckStates.playersShortcutHidden || deckStates.touchAction !== "manipulation" || deckStates.palette.canvas !== "rgb(246, 247, 251)" || deckStates.palette.header !== "rgb(255, 255, 255)" || deckStates.palette.text !== "rgb(27, 30, 40)" || deckStates.overflow || !deckStates.enteredDeck) throw new Error(`Deck home failed: ${JSON.stringify(deckStates)}`);

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
    const packageDetails = [...document.querySelectorAll('[data-setup-kind="package"] small')].map((item) => item.textContent);
    const packageHasCounts = packageDetails.every((detail) => /\\d+ of \\d+ mastered/.test(detail));
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
    return { ...initial, packageDialogOpened, packageCount, packageDetails, packageHasCounts, changedPackage, dialogOpened, selectedMode, startLabel, swipeReturned };
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
    const lineupCounts = [...document.querySelectorAll('[data-setup-kind="package"] small')].every((item) => /\\d+ of \\d+ mastered/.test(item.textContent));
    document.querySelector('[data-setup-kind="package"][data-setup-value="special-teams"]').click();
    const specialTeamsStart = document.querySelector('#setup-start').textContent;
    document.querySelector('#setup-start').click();
    const lineupTraining = document.querySelector('[data-view="training"]').classList.contains('is-active');
    const optionSignature = (button) => {
      const style = getComputedStyle(button);
      return [style.minHeight, style.padding, style.backgroundColor, style.borderTopWidth, style.borderRadius, style.textAlign].join('|');
    };
    const lineupVisualAbsent = document.querySelector('#question-visual').hidden && !document.querySelector('.knowledge-stimulus');
    const lineupLabelHidden = document.querySelector('#question-type').hidden;
    const lineupOptionSignature = optionSignature(document.querySelector('.answer-button'));
    document.querySelector('.answer-button').click();
    const lineupFeedback = Boolean(document.querySelector('.knowledge-detail'));
    document.querySelector('[data-action="exit-session"]').click();

    document.querySelector('[data-study-type="trivia"]').click();
    const triviaInitial = {
      selected: document.querySelector('[data-study-type="trivia"]').getAttribute('aria-pressed') === 'true',
      title: document.querySelector('#setup-title').textContent,
      contentHidden: document.querySelector('#setup-content-choice').hidden,
      start: document.querySelector('#setup-start').textContent,
      comparisonControlsAbsent: !document.querySelector('#trivia-style-picker, [data-trivia-style]')
    };
    document.querySelector('#setup-package').click();
    const triviaPackCount = document.querySelectorAll('[data-setup-kind="package"]').length;
    const triviaCounts = [...document.querySelectorAll('[data-setup-kind="package"] small')].every((item) => /\\d+ of \\d+ mastered/.test(item.textContent));
    document.querySelector('#session-option-dialog [data-action="close-session-options"]').click();
    document.querySelector('#setup-start').click();
    const triviaTraining = document.querySelector('[data-view="training"]').classList.contains('is-active');
    const triviaStimulusAbsent = document.querySelector('#question-visual').hidden && !document.querySelector('.knowledge-stimulus');
    const triviaLabelHidden = document.querySelector('#question-type').hidden;
    const triviaRevealAbsent = !document.querySelector('.trivia-reveal');
    const triviaOptionSignature = optionSignature(document.querySelector('.answer-button'));
    document.querySelector('.answer-button').click();
    const triviaReveal = document.querySelector('.trivia-reveal');
    const triviaImage = triviaReveal?.querySelector('img');
    const revealRect = triviaReveal?.getBoundingClientRect();
    const feedbackRect = document.querySelector('.answer-feedback')?.getBoundingClientRect();
    const triviaFeedback = {
      answer: Boolean(document.querySelector('.trivia-answer-copy h2')?.textContent.trim()),
      fact: Boolean(document.querySelector('.trivia-fact')?.textContent.trim()),
      reveal: Boolean(triviaReveal),
      localImage: triviaReveal?.querySelector('img')?.getAttribute('src')?.startsWith('assets/trivia/') ?? false,
      alt: Boolean(triviaReveal?.querySelector('img')?.getAttribute('alt')),
      visibleCaptionAbsent: !triviaReveal?.querySelector('figcaption'),
      imageLeads: revealRect?.top < document.querySelector('.trivia-answer-copy')?.getBoundingClientRect().top,
      centered: Math.abs((revealRect?.left + revealRect?.width / 2) - (feedbackRect?.left + feedbackRect?.width / 2)) < 1,
      naturalFit: getComputedStyle(triviaImage).objectFit === 'contain',
      borderless: getComputedStyle(triviaImage).borderTopWidth === '0px',
      allOptionsRemain: [...document.querySelectorAll('.answer-button')].every((button) => getComputedStyle(button).display !== 'none')
    };
    const knowledgeSaved = Object.keys(JSON.parse(localStorage.getItem('cowboys-roster-lab-v1')).knowledge).length >= 2;
    document.querySelector('[data-action="exit-session"]').click();
    document.querySelector('[data-study-type="players"]').click();
    const playersRestored = document.querySelector('#setup-title').textContent === 'Most famous' && document.querySelector('#setup-mode-value').textContent === 'mixed facts';
    return { lineupInitial, lineupPackCount, lineupCounts, specialTeamsStart, lineupTraining, lineupVisualAbsent, lineupLabelHidden, lineupOptionSignature, lineupFeedback, triviaInitial, triviaPackCount, triviaCounts, triviaTraining, triviaStimulusAbsent, triviaLabelHidden, triviaRevealAbsent, triviaOptionSignature, triviaFeedback, knowledgeSaved, playersRestored };
  })()`);
  if (!knowledgeModes.lineupInitial.selected || knowledgeModes.lineupInitial.title !== 'Mixed' || !knowledgeModes.lineupInitial.sentence.includes('Practice recognition for 5 questions.') || !knowledgeModes.lineupInitial.contentHidden || knowledgeModes.lineupInitial.start !== 'Start 5 questions' || knowledgeModes.lineupPackCount !== 5 || !knowledgeModes.lineupCounts || knowledgeModes.specialTeamsStart !== 'Start 3 questions' || !knowledgeModes.lineupTraining || !knowledgeModes.lineupVisualAbsent || !knowledgeModes.lineupLabelHidden || !knowledgeModes.lineupFeedback || !knowledgeModes.triviaInitial.selected || knowledgeModes.triviaInitial.title !== 'Mixed' || !knowledgeModes.triviaInitial.contentHidden || knowledgeModes.triviaInitial.start !== 'Start 5 questions' || !knowledgeModes.triviaInitial.comparisonControlsAbsent || knowledgeModes.triviaPackCount !== 5 || !knowledgeModes.triviaCounts || !knowledgeModes.triviaTraining || !knowledgeModes.triviaStimulusAbsent || !knowledgeModes.triviaLabelHidden || !knowledgeModes.triviaRevealAbsent || knowledgeModes.lineupOptionSignature !== knowledgeModes.triviaOptionSignature || !knowledgeModes.triviaFeedback.answer || !knowledgeModes.triviaFeedback.fact || !knowledgeModes.triviaFeedback.reveal || !knowledgeModes.triviaFeedback.localImage || !knowledgeModes.triviaFeedback.alt || !knowledgeModes.triviaFeedback.visibleCaptionAbsent || !knowledgeModes.triviaFeedback.imageLeads || !knowledgeModes.triviaFeedback.centered || !knowledgeModes.triviaFeedback.naturalFit || !knowledgeModes.triviaFeedback.borderless || !knowledgeModes.triviaFeedback.allOptionsRemain || !knowledgeModes.knowledgeSaved || !knowledgeModes.playersRestored) throw new Error(`Knowledge modes failed: ${JSON.stringify(knowledgeModes)}`);

  if (process.env.CAPTURE_DIR) {
    await mkdir(process.env.CAPTURE_DIR, { recursive: true });
    await evaluate(client, `(() => {
      document.querySelector('[data-study-type="lineup"]').click();
      document.querySelector('#setup-start').click();
    })()`);
    await evaluate(client, 'new Promise((resolve) => setTimeout(resolve, 320))');
    let screenshot = await client.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPTURE_DIR, 'lineup-question.png'), Buffer.from(screenshot.data, 'base64'));
    await evaluate(client, `(() => {
      document.querySelector('[data-action="exit-session"]').click();
      document.querySelector('[data-study-type="trivia"]').click();
      document.querySelector('#setup-start').click();
    })()`);
    await evaluate(client, 'new Promise((resolve) => setTimeout(resolve, 320))');
    screenshot = await client.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPTURE_DIR, 'trivia-question.png'), Buffer.from(screenshot.data, 'base64'));
    await evaluate(client, `(() => {
      document.querySelector('.answer-button').click();
    })()`);
    await evaluate(client, 'new Promise((resolve) => setTimeout(resolve, 320))');
    screenshot = await client.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPTURE_DIR, 'trivia-photo-reveal.png'), Buffer.from(screenshot.data, 'base64'));
    await evaluate(client, `(() => {
      document.querySelector('[data-action="exit-session"]').click();
      document.querySelector('[data-study-type="players"]').click();
    })()`);
  }

  const lesson = await evaluate(client, `(() => {
    document.querySelector('#setup-start').click();
    const firstAnswer = document.querySelector('.answer-button');
    const firstAnswerStyle = getComputedStyle(firstAnswer);
    const optionSignature = [firstAnswerStyle.minHeight, firstAnswerStyle.padding, firstAnswerStyle.backgroundColor, firstAnswerStyle.borderTopWidth, firstAnswerStyle.borderRadius, firstAnswerStyle.textAlign].join('|');
    firstAnswer.click();
    return {
      training: document.querySelector('[data-view="training"]').classList.contains('is-active'),
      feedbackVisible: !document.querySelector('#answer-feedback').hidden,
      nextVisible: !document.querySelector('#next-wrap').hidden,
      internalProgress: JSON.parse(localStorage.getItem('cowboys-roster-lab-v1')).totalAnswers > 0,
      closeTop: document.querySelector('[data-action="exit-session"]').getBoundingClientRect().top,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      optionSignature
    };
  })()`);
  if (!lesson.training || !lesson.feedbackVisible || !lesson.nextVisible || !lesson.internalProgress || lesson.closeTop < 34 || lesson.overflow || lesson.optionSignature !== knowledgeModes.lineupOptionSignature) throw new Error(`Lesson flow failed: ${JSON.stringify(lesson)}`);

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

  const patriotsDeck = await evaluate(client, `(() => {
    document.querySelector('#header-back').click();
    document.querySelector('#header-back').click();
    document.querySelector('[data-player-deck="patriots"]').click();
    const setup = {
      header: document.querySelector('#header-context').textContent,
      title: document.querySelector('#setup-title').textContent,
      switchVisible: !document.querySelector('.study-type-switch').hidden,
      visibleStudyTypes: [...document.querySelectorAll('[data-study-type]')].filter((button) => !button.hidden).map((button) => button.textContent),
      rosterVisible: !document.querySelector('#browse-players').hidden,
      footerSource: document.querySelector('#data-source').textContent,
      footerHref: document.querySelector('#data-source').getAttribute('href'),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
    document.querySelector('#setup-package').click();
    const packageOptions = [...document.querySelectorAll('[data-setup-kind="package"]')].map((option) => ({
      title: option.querySelector('strong').textContent,
      detail: option.querySelector('small').textContent
    }));
    document.querySelector('[data-setup-kind="package"][data-setup-value="famous"]').click();
    document.querySelector('#setup-mode-value').click();
    document.querySelector('[data-setup-kind="mode"][data-setup-value="faces"]').click();
    document.querySelector('#setup-start').click();
    const playerQuestion = {
      training: document.querySelector('[data-view="training"]').classList.contains('is-active'),
      localHeadshot: document.querySelector('#question-visual img')?.getAttribute('src')?.startsWith('assets/patriots/') ?? false,
      fourChoices: document.querySelectorAll('.answer-button').length === 4
    };
    document.querySelector('.answer-button').click();
    const feedbackLabels = [...document.querySelectorAll('.feedback-facts span')].map((label) => label.textContent);
    const playerFeedback = {
      rosterFacts: feedbackLabels.includes('Number') && feedbackLabels.includes('College'),
      nflFactsAbsent: !feedbackLabels.includes('Team') && !feedbackLabels.includes('Rank')
    };
    document.querySelector('[data-action="exit-session"]').click();
    document.querySelector('[data-study-type="lineup"]').click();
    document.querySelector('#setup-package').click();
    const lineupPackCount = document.querySelectorAll('[data-setup-kind="package"]').length;
    document.querySelector('[data-setup-kind="package"][data-setup-value="special-teams"]').click();
    document.querySelector('#setup-start').click();
    const patriotNames = new Set(window.PATRIOTS_ROSTER.players.map((player) => player.name));
    const lineupChoices = [...document.querySelectorAll('.answer-button')].map((button) => button.textContent.trim());
    const lineup = {
      training: document.querySelector('[data-view="training"]').classList.contains('is-active'),
      packCount: lineupPackCount,
      fourChoices: lineupChoices.length === 4,
      patriotsOnly: lineupChoices.every((choice) => patriotNames.has(choice)),
      visualAbsent: document.querySelector('#question-visual').hidden
    };
    document.querySelector('[data-action="exit-session"]').click();
    document.querySelector('[data-study-type="trivia"]').click();
    document.querySelector('#setup-package').click();
    const triviaPackCount = document.querySelectorAll('[data-setup-kind="package"]').length;
    document.querySelector('#session-option-dialog [data-action="close-session-options"]').click();
    document.querySelector('#setup-start').click();
    const triviaQuestion = {
      training: document.querySelector('[data-view="training"]').classList.contains('is-active'),
      packCount: triviaPackCount,
      fourChoices: document.querySelectorAll('.answer-button').length === 4,
      visualAbsent: document.querySelector('#question-visual').hidden
    };
    document.querySelector('.answer-button').click();
    const triviaFeedback = {
      localImage: document.querySelector('.trivia-reveal img')?.getAttribute('src')?.startsWith('assets/trivia/patriots-') ?? false,
      answer: Boolean(document.querySelector('.trivia-answer-copy h2')?.textContent.trim()),
      fact: Boolean(document.querySelector('.trivia-fact')?.textContent.trim())
    };
    document.querySelector('[data-action="exit-session"]').click();
    document.querySelector('[data-study-type="players"]').click();
    document.querySelector('#browse-players').click();
    const roster = {
      active: document.querySelector('[data-view="roster"]').classList.contains('is-active'),
      count: document.querySelectorAll('.player-card').length,
      expectedCount: window.PATRIOTS_ROSTER.players.length,
      localHeadshots: [...document.querySelectorAll('.player-card .headshot img')].every((image) => image.getAttribute('src').startsWith('assets/patriots/')),
      collegeMarks: document.querySelectorAll('.college-mark').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
    document.querySelector('#header-back').click();
    document.querySelector('#header-back').click();
    document.querySelector('[data-player-deck="cowboys"]').click();
    document.querySelector('#browse-players').click();
    return { setup, packageOptions, playerQuestion, playerFeedback, lineup, triviaQuestion, triviaFeedback, roster, returnedToCowboysRoster: document.querySelector('[data-view="roster"]').classList.contains('is-active') };
  })()`);
  if (patriotsDeck.setup.header !== 'Patriots roster' || patriotsDeck.setup.title !== 'Most famous' || !patriotsDeck.setup.switchVisible || patriotsDeck.setup.visibleStudyTypes.join('|') !== 'Players|Lineup|Trivia' || !patriotsDeck.setup.rosterVisible || patriotsDeck.setup.footerSource !== 'official Patriots roster' || patriotsDeck.setup.footerHref !== 'https://www.patriots.com/team/players-roster/' || patriotsDeck.setup.overflow || patriotsDeck.packageOptions.length !== 8 || patriotsDeck.packageOptions.find((option) => option.title === 'Most famous')?.detail !== '0 of 8 mastered' || !patriotsDeck.playerQuestion.training || !patriotsDeck.playerQuestion.localHeadshot || !patriotsDeck.playerQuestion.fourChoices || !patriotsDeck.playerFeedback.rosterFacts || !patriotsDeck.playerFeedback.nflFactsAbsent || !patriotsDeck.lineup.training || patriotsDeck.lineup.packCount !== 5 || !patriotsDeck.lineup.fourChoices || !patriotsDeck.lineup.patriotsOnly || !patriotsDeck.lineup.visualAbsent || !patriotsDeck.triviaQuestion.training || patriotsDeck.triviaQuestion.packCount !== 5 || !patriotsDeck.triviaQuestion.fourChoices || !patriotsDeck.triviaQuestion.visualAbsent || !patriotsDeck.triviaFeedback.localImage || !patriotsDeck.triviaFeedback.answer || !patriotsDeck.triviaFeedback.fact || !patriotsDeck.roster.active || patriotsDeck.roster.count !== patriotsDeck.roster.expectedCount || patriotsDeck.roster.count !== 77 || !patriotsDeck.roster.localHeadshots || patriotsDeck.roster.collegeMarks !== 77 || patriotsDeck.roster.overflow || !patriotsDeck.returnedToCowboysRoster) throw new Error(`Patriots deck failed: ${JSON.stringify(patriotsDeck)}`);

  if (process.env.CAPTURE_DIR) {
    await evaluate(client, `(() => {
      document.querySelector('#header-back').click();
      document.querySelector('#header-back').click();
      document.querySelector('[data-player-deck="patriots"]').click();
    })()`);
    await evaluate(client, 'new Promise((resolve) => setTimeout(resolve, 200))');
    let screenshot = await client.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPTURE_DIR, 'patriots-setup.png'), Buffer.from(screenshot.data, 'base64'));
    await evaluate(client, `(() => {
      document.querySelector('#setup-mode-value').click();
      document.querySelector('[data-setup-kind="mode"][data-setup-value="faces"]').click();
      document.querySelector('#setup-start').click();
    })()`);
    await evaluate(client, 'new Promise((resolve) => setTimeout(resolve, 320))');
    screenshot = await client.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPTURE_DIR, 'patriots-player-question.png'), Buffer.from(screenshot.data, 'base64'));
    await evaluate(client, `(() => {
      document.querySelector('[data-action="exit-session"]').click();
      document.querySelector('#header-back').click();
      document.querySelector('[data-player-deck="cowboys"]').click();
      document.querySelector('#browse-players').click();
    })()`);
  }

  const nflDeck = await evaluate(client, `(() => {
    document.querySelector('#header-back').click();
    document.querySelector('#header-back').click();
    document.querySelector('[data-player-deck="nfl-top-100"]').click();
    const visibleStudyTypes = [...document.querySelectorAll('[data-study-type]')]
      .filter((button) => !button.hidden)
      .map((button) => button.textContent.trim());
    const setup = {
      header: document.querySelector('#header-context').textContent,
      title: document.querySelector('#setup-title').textContent,
      visibleStudyTypes,
      lineupHidden: document.querySelector('[data-study-type="lineup"]').hidden,
      rosterHidden: document.querySelector('#browse-players').hidden,
      switchColumns: getComputedStyle(document.querySelector('.study-type-switch')).gridTemplateColumns,
      dataDate: document.querySelector('#data-date').textContent,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
    document.querySelector('#setup-package').click();
    const packageOptions = [...document.querySelectorAll('[data-setup-kind="package"]')].map((option) => ({
      title: option.querySelector('strong').textContent,
      detail: option.querySelector('small').textContent
    }));
    document.querySelector('[data-setup-kind="package"][data-setup-value="top-100"]').click();
    document.querySelector('#setup-mode-value').click();
    const modeOptions = [...document.querySelectorAll('[data-setup-kind="mode"]')].map((option) => option.textContent.trim());
    document.querySelector('[data-setup-kind="mode"][data-setup-value="teams"]').click();
    document.querySelector('#setup-start').click();
    const firstChoice = document.querySelector('.answer-button');
    const firstChoiceStyle = getComputedStyle(firstChoice);
    const playerOptionSignature = [firstChoiceStyle.minHeight, firstChoiceStyle.padding, firstChoiceStyle.backgroundColor, firstChoiceStyle.borderTopWidth, firstChoiceStyle.borderRadius, firstChoiceStyle.textAlign].join('|');
    const playerQuestion = {
      training: document.querySelector('[data-view="training"]').classList.contains('is-active'),
      localHeadshot: document.querySelector('#question-visual img')?.getAttribute('src')?.startsWith('assets/nfl-top-100/') ?? false,
      promptMentionsTeam: document.querySelector('#question-title').textContent.startsWith('Which team does '),
      fourChoices: document.querySelectorAll('.answer-button').length === 4
    };
    firstChoice.click();
    const feedbackLabels = [...document.querySelectorAll('.feedback-facts span')].map((label) => label.textContent);
    const playerFeedback = {
      teamAndRank: feedbackLabels.includes('Team') && feedbackLabels.includes('Rank'),
      cowboyFactsAbsent: !feedbackLabels.includes('Number') && !feedbackLabels.includes('College')
    };
    document.querySelector('[data-action="exit-session"]').click();
    document.querySelector('[data-study-type="trivia"]').click();
    const triviaSetup = {
      selected: document.querySelector('[data-study-type="trivia"]').getAttribute('aria-pressed') === 'true',
      title: document.querySelector('#setup-title').textContent,
      contentHidden: document.querySelector('#setup-content-choice').hidden
    };
    document.querySelector('#setup-package').click();
    const triviaPacks = [...document.querySelectorAll('[data-setup-kind="package"]')].map((option) => option.querySelector('strong').textContent);
    document.querySelector('#session-option-dialog [data-action="close-session-options"]').click();
    document.querySelector('#setup-start').click();
    const triviaChoice = document.querySelector('.answer-button');
    const triviaChoiceStyle = getComputedStyle(triviaChoice);
    const triviaOptionSignature = [triviaChoiceStyle.minHeight, triviaChoiceStyle.padding, triviaChoiceStyle.backgroundColor, triviaChoiceStyle.borderTopWidth, triviaChoiceStyle.borderRadius, triviaChoiceStyle.textAlign].join('|');
    const triviaQuestion = {
      visualAbsent: document.querySelector('#question-visual').hidden,
      labelHidden: document.querySelector('#question-type').hidden,
      fourChoices: document.querySelectorAll('.answer-button').length === 4
    };
    triviaChoice.click();
    const triviaFeedback = {
      answer: Boolean(document.querySelector('.trivia-answer-copy h2')?.textContent.trim()),
      fact: Boolean(document.querySelector('.trivia-fact')?.textContent.trim()),
      imageAbsent: !document.querySelector('.trivia-reveal')
    };
    document.querySelector('[data-action="exit-session"]').click();
    document.querySelector('#header-back').click();
    document.querySelector('[data-player-deck="cowboys"]').click();
    document.querySelector('#browse-players').click();
    return { setup, packageOptions, modeOptions, playerQuestion, playerFeedback, playerOptionSignature, triviaSetup, triviaPacks, triviaQuestion, triviaFeedback, triviaOptionSignature, returnedToCowboysRoster: document.querySelector('[data-view="roster"]').classList.contains('is-active') };
  })()`);
  const expectedGroups = [
    { title: 'Top 10', detail: '0 of 10 mastered' },
    { title: 'Top 25', detail: '0 of 25 mastered' },
    { title: 'Top 50', detail: '0 of 50 mastered' },
    { title: 'Top 75', detail: '0 of 75 mastered' },
    { title: 'Top 100', detail: '0 of 100 mastered' },
  ];
  if (nflDeck.setup.header !== 'NFL Top 100' || nflDeck.setup.title !== 'Top 10' || nflDeck.setup.visibleStudyTypes.join('|') !== 'Players|Trivia' || !nflDeck.setup.lineupHidden || !nflDeck.setup.rosterHidden || nflDeck.setup.switchColumns.split(' ').length !== 2 || !nflDeck.setup.dataDate.includes('2026') || nflDeck.setup.overflow || JSON.stringify(nflDeck.packageOptions) !== JSON.stringify(expectedGroups) || !nflDeck.modeOptions.some((mode) => mode.includes('Teams')) || !nflDeck.modeOptions.some((mode) => mode.includes('Rankings')) || !nflDeck.playerQuestion.training || !nflDeck.playerQuestion.localHeadshot || !nflDeck.playerQuestion.promptMentionsTeam || !nflDeck.playerQuestion.fourChoices || !nflDeck.playerFeedback.teamAndRank || !nflDeck.playerFeedback.cowboyFactsAbsent || nflDeck.playerOptionSignature !== knowledgeModes.lineupOptionSignature || !nflDeck.triviaSetup.selected || nflDeck.triviaSetup.title !== 'Mixed' || !nflDeck.triviaSetup.contentHidden || nflDeck.triviaPacks.join('|') !== 'Mixed|Divisions|League structure|Schedule' || !nflDeck.triviaQuestion.visualAbsent || !nflDeck.triviaQuestion.labelHidden || !nflDeck.triviaQuestion.fourChoices || !nflDeck.triviaFeedback.answer || !nflDeck.triviaFeedback.fact || !nflDeck.triviaFeedback.imageAbsent || nflDeck.triviaOptionSignature !== knowledgeModes.lineupOptionSignature || !nflDeck.returnedToCowboysRoster) throw new Error(`NFL deck failed: ${JSON.stringify(nflDeck)}`);

  if (process.env.CAPTURE_DIR) {
    await evaluate(client, `(() => {
      document.querySelector('#header-back').click();
      document.querySelector('#header-back').click();
      document.querySelector('[data-player-deck="nfl-top-100"]').click();
    })()`);
    await evaluate(client, 'new Promise((resolve) => setTimeout(resolve, 200))');
    let screenshot = await client.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPTURE_DIR, 'nfl-top-100-setup.png'), Buffer.from(screenshot.data, 'base64'));
    await evaluate(client, `(() => {
      document.querySelector('#setup-mode-value').click();
      document.querySelector('[data-setup-kind="mode"][data-setup-value="teams"]').click();
      document.querySelector('#setup-start').click();
    })()`);
    await evaluate(client, 'new Promise((resolve) => setTimeout(resolve, 320))');
    screenshot = await client.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPTURE_DIR, 'nfl-top-100-player-question.png'), Buffer.from(screenshot.data, 'base64'));
    await evaluate(client, `(() => {
      document.querySelector('[data-action="exit-session"]').click();
      document.querySelector('#header-back').click();
      document.querySelector('[data-player-deck="cowboys"]').click();
      document.querySelector('#browse-players').click();
    })()`);
  }

  const masteryFlow = await evaluate(client, `(() => {
    document.querySelector('#header-back').click();
    document.querySelector('#setup-stage-value').click();
    document.querySelector('[data-setup-kind="stage"][data-setup-value="mastery"]').click();
    document.querySelector('#setup-length-value').click();
    document.querySelector('[data-setup-kind="length"][data-setup-value="all"]').click();
    document.querySelector('#setup-start').click();

    const playerIds = [];
    const progressLabels = [];
    const nextLabels = [];
    let feedbackStayedFocused = true;
    for (let index = 0; index < 32; index += 1) {
      const prompt = document.querySelector('#question-title').textContent;
      const visualName = document.querySelector('#question-visual img')?.alt.replace(/ headshot$/, '')
        ?? document.querySelector('.question-player strong')?.textContent;
      const player = window.COWBOYS_ROSTER.players.find((candidate) => candidate.name === visualName || prompt.includes(candidate.name));
      if (!player) throw new Error('Could not resolve mastery player from the rendered question.');
      const answer = prompt.startsWith('Who is this player')
        ? player.name
        : prompt.startsWith('What number')
          ? player.number
          : prompt.startsWith('What position')
            ? player.position
            : player.college;
      playerIds.push(player.id);
      progressLabels.push(document.querySelector('#game-progress-text').textContent);
      const input = document.querySelector('#recall-input');
      input.value = answer;
      document.querySelector('#recall-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      feedbackStayedFocused &&= !document.querySelector('.feedback-facts') && document.querySelector('#answer-feedback').textContent.trim() === '✓ Correct';
      nextLabels.push(document.querySelector('#next-wrap button').textContent.replace(/\\s+/g, ' ').trim());
      document.querySelector('#next-wrap button').click();
    }

    const stored = JSON.parse(localStorage.getItem('cowboys-roster-lab-v1'));
    const masteredPlayerIds = Object.entries(stored.players).filter(([, value]) => value.verified).map(([id]) => id);
    const results = document.querySelector('[data-view="results"]').classList.contains('is-active');
    document.querySelector('.result-actions [data-action="home"]').click();
    document.querySelector('[data-player-deck="cowboys"]').click();
    document.querySelector('#setup-package').click();
    const playerProgress = Object.fromEntries([...document.querySelectorAll('[data-setup-kind="package"]')].map((option) => [
      option.querySelector('strong').textContent,
      option.querySelector('small').textContent,
    ]));
    document.querySelector('#session-option-dialog [data-action="close-session-options"]').click();

    document.querySelector('[data-study-type="lineup"]').click();
    document.querySelector('#setup-package').click();
    const lineupProgress = [...document.querySelectorAll('[data-setup-kind="package"] small')].map((item) => item.textContent);
    document.querySelector('#session-option-dialog [data-action="close-session-options"]').click();

    document.querySelector('[data-study-type="trivia"]').click();
    document.querySelector('#setup-stage-value').click();
    document.querySelector('[data-setup-kind="stage"][data-setup-value="recall"]').click();
    document.querySelector('#setup-start').click();
    const triviaPrompt = document.querySelector('#question-title').textContent;
    const triviaQuestion = window.COWBOYS_TRIVIA.questions.find((question) => question.prompt === triviaPrompt);
    const triviaInput = document.querySelector('#recall-input');
    triviaInput.value = triviaQuestion.correct;
    document.querySelector('#recall-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    document.querySelector('[data-action="exit-session"]').click();
    document.querySelector('#setup-package').click();
    const triviaProgress = Object.fromEntries([...document.querySelectorAll('[data-setup-kind="package"]')].map((option) => [
      option.dataset.setupValue,
      option.querySelector('small').textContent,
    ]));
    document.querySelector('#session-option-dialog [data-action="close-session-options"]').click();
    document.querySelector('[data-study-type="players"]').click();
    document.querySelector('#browse-players').click();

    return {
      results,
      questionCount: playerIds.length,
      noAdjacentPlayer: playerIds.every((id, index) => index === 0 || id !== playerIds[index - 1]),
      everyPlayerAskedFourFacts: [...new Set(playerIds)].every((id) => playerIds.filter((candidate) => candidate === id).length === 4),
      plainProgress: progressLabels.every((label, index) => label === (index + 1) + ' of 32'),
      nextLabels,
      feedbackStayedFocused,
      masteredPlayers: masteredPlayerIds.length,
      playerProgress,
      lineupProgress,
      triviaMixedProgress: triviaProgress.mixed,
      triviaPackProgress: triviaProgress[triviaQuestion.pack],
      returnedToRoster: document.querySelector('[data-view="roster"]').classList.contains('is-active')
    };
  })()`);
  if (!masteryFlow.results || masteryFlow.questionCount !== 32 || !masteryFlow.noAdjacentPlayer || !masteryFlow.everyPlayerAskedFourFacts || !masteryFlow.plainProgress || !masteryFlow.feedbackStayedFocused || masteryFlow.nextLabels.slice(0, -1).some((label) => label !== 'Next fact →') || masteryFlow.nextLabels.at(-1) !== 'See results →' || masteryFlow.masteredPlayers !== 8 || masteryFlow.playerProgress['Most famous'] !== '✓ Mastered' || masteryFlow.playerProgress['Full roster'] !== '8 of 72 mastered' || masteryFlow.lineupProgress.some((detail) => !/^0 of \d+ mastered$/.test(detail)) || masteryFlow.triviaMixedProgress !== '1 of 40 mastered' || !masteryFlow.triviaPackProgress.startsWith('1 of ') || !masteryFlow.returnedToRoster) throw new Error(`Mastery flow failed: ${JSON.stringify(masteryFlow)}`);

  if (process.env.CAPTURE_DIR) {
    await evaluate(client, `(() => {
      document.querySelector('#header-back').click();
      document.querySelector('#setup-package').click();
    })()`);
    await evaluate(client, 'new Promise((resolve) => setTimeout(resolve, 200))');
    let screenshot = await client.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPTURE_DIR, 'group-mastery-progress.png'), Buffer.from(screenshot.data, 'base64'));
    await evaluate(client, `(() => {
      document.querySelector('#session-option-dialog [data-action="close-session-options"]').click();
      document.querySelector('#setup-stage-value').click();
      document.querySelector('[data-setup-kind="stage"][data-setup-value="mastery"]').click();
      document.querySelector('#setup-start').click();
      const input = document.querySelector('#recall-input');
      input.value = 'wrong answer';
      document.querySelector('#recall-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`);
    await evaluate(client, 'new Promise((resolve) => setTimeout(resolve, 200))');
    screenshot = await client.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPTURE_DIR, 'mastery-focused-feedback.png'), Buffer.from(screenshot.data, 'base64'));
    await evaluate(client, `(() => {
      document.querySelector('[data-action="exit-session"]').click();
      document.querySelector('#browse-players').click();
    })()`);
  }

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
