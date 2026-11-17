/* =============================================================================
   READ-ALOUD SPEECH COACH
   The student reads a paragraph aloud; the browser's speech recognition
   (Web Speech API) turns it into text, which is aligned word by word against
   the paragraph to highlight progress live and produce a scored report.
   ============================================================================= */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Practice paragraphs: self-introductions for interviews and events.
  // Written without digits, hyphens or contractions so every word on screen
  // maps to exactly one spoken word.
  // ---------------------------------------------------------------------------
  const PARAGRAPHS = [
    {
      id: 'fresher',
      title: 'Fresher: Tell me about yourself',
      level: 'Beginner',
      text: 'Good morning, and thank you for this opportunity. My name is Priya Sharma, and I recently completed my engineering degree in computer science. During college, I built a small web application that helps students share notes before exams. I enjoy solving problems, and I learn new tools quickly. Outside of studies, I teach basic computer skills to children near my home. I am looking for a role where I can grow as a developer and contribute to a strong team.'
    },
    {
      id: 'campus-hr',
      title: 'Campus HR round',
      level: 'Beginner',
      text: 'Hello, I am Arjun Reddy from Hyderabad. I have just finished my bachelor\'s degree in commerce with first class marks. My strengths are clear communication, patience, and a habit of planning my day in advance. In my final year, I led a team of five students to run our college cultural festival. That experience taught me how to stay calm under pressure and still meet every deadline. I am excited to begin my career with a company that values hard work and learning.'
    },
    {
      id: 'experienced',
      title: 'Experienced professional',
      level: 'Intermediate',
      text: 'Thank you for having me today. I am a data engineer with four years of experience building reliable data pipelines for retail and banking clients. In my current role, I designed a cloud based reporting platform that reduced the daily processing time from six hours to under forty minutes. I work closely with analysts and business teams to understand what they really need before I write any code. I am now looking for a role with larger data volumes and more ownership.'
    },
    {
      id: 'group-discussion',
      title: 'Opening a group discussion',
      level: 'Intermediate',
      text: 'Good afternoon, everyone. Before we begin, let me quickly introduce myself. I am Meera, a final year student of electronics engineering. On today\'s topic, I believe artificial intelligence will create more jobs than it removes, but only for people who keep learning. I would like to hear different views from all of you, and I will try to support my points with simple, real examples from our daily lives.'
    },
    {
      id: 'career-switch',
      title: 'Career switcher',
      level: 'Advanced',
      text: 'Good morning. My name is Rahul, and my journey into technology has been a little different. I started my career as a mechanical engineer in a manufacturing plant, where I noticed how much time we lost because of manual reports. That curiosity led me to learn Python and automation in the evenings. Over the last two years, I have automated several workflows that saved my team hundreds of hours. Today, I am confident that my practical mindset makes me a valuable addition to an analytics team.'
    },
    {
      id: 'elevator-pitch',
      title: 'Networking elevator pitch',
      level: 'Advanced',
      text: 'Hi, it is a pleasure to meet you. I am Ananya, a cloud solutions architect who helps growing companies move their applications to the cloud without disrupting their customers. Recently, my team migrated a hospital\'s patient booking system with zero downtime over a single weekend. I am passionate about designing systems that are secure, affordable, and simple to maintain. I would love to learn more about the challenges your company is facing this year.'
    }
  ];

  const DWELL_AFTER_LAST_WORD = 1500; // auto-finish this long after the final word is read
  const IDEAL_WPM = [110, 160];
  const BEST_KEY = 'sc-best-v1';

  // ---------------------------------------------------------------------------
  // Text normalisation
  // ---------------------------------------------------------------------------
  const CONTRACTIONS = {
    "i'm": 'i am', "it's": 'it is', "that's": 'that is', "let's": 'let us', "what's": 'what is', "there's": 'there is',
    "he's": 'he is', "she's": 'she is', "i've": 'i have', "we've": 'we have', "you've": 'you have', "they've": 'they have',
    "i'll": 'i will', "we'll": 'we will', "you'll": 'you will', "i'd": 'i would', "we're": 'we are', "you're": 'you are',
    "they're": 'they are', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'cannot',
    "won't": 'will not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "haven't": 'have not'
  };
  // Words a recogniser cannot tell apart by sound alone
  const HOMOPHONES = [
    ['to', 'too', 'two'], ['for', 'four'], ['right', 'write'], ['hear', 'here'], ['new', 'knew'], ['by', 'buy', 'bye'],
    ['their', 'there'], ['one', 'won'], ['no', 'know'], ['meet', 'meat'], ['week', 'weak'], ['hours', 'ours'],
    ['role', 'roll'], ['plane', 'plain']
  ];
  const CANON = {};
  HOMOPHONES.forEach(group => group.forEach(w => { CANON[w] = group[0]; }));

  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function numberWords(n) {
    if (n < 20) return [ONES[n]];
    if (n < 100) return n % 10 ? [TENS[Math.floor(n / 10)], ONES[n % 10]] : [TENS[n / 10]];
    if (n < 1000) return [ONES[Math.floor(n / 100)], 'hundred', ...(n % 100 ? numberWords(n % 100) : [])];
    return [String(n)];
  }

  const clean = w => w.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9']/g, '').replace(/'/g, '');

  // Spoken text -> comparable tokens
  function tokenizeSpoken(text) {
    const out = [];
    text.toLowerCase().replace(/[’‘]/g, "'").split(/[\s\-–—/]+/).forEach(raw => {
      const bare = raw.replace(/[^a-z0-9']/g, '');
      if (!bare) return;
      if (CONTRACTIONS[bare]) { out.push(...CONTRACTIONS[bare].split(' ')); return; }
      if (/^\d+$/.test(bare)) { out.push(...numberWords(parseInt(bare, 10))); return; }
      const w = clean(bare);
      if (w) out.push(w);
    });
    return out;
  }

  function similarity(a, b) {
    if (a === b) return 1;
    const m = a.length, n = b.length;
    if (!m || !n) return 0;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return 1 - prev[n] / Math.max(m, n);
  }

  // 'ok' when the spoken word counts as the expected word, 'near' when it looks
  // like a misreading of it, otherwise 'diff'
  const compareCache = new Map();
  function compare(expected, heard) {
    const key = expected + '|' + heard;
    let c = compareCache.get(key);
    if (c === undefined) { c = compareUncached(expected, heard); compareCache.set(key, c); }
    return c;
  }
  function compareUncached(expected, heard) {
    if (expected === heard) return 'ok';
    if ((CANON[expected] || expected) === (CANON[heard] || heard)) return 'ok';
    const s = similarity(expected, heard);
    // Small spelling differences on longer words (names especially) are the recogniser, not the reader
    if (expected.length >= 5 && s >= 0.8) return 'ok';
    return s >= 0.5 ? 'near' : 'diff';
  }

  // ---------------------------------------------------------------------------
  // Word alignment: edit distance between the spoken tokens and the passage,
  // with the passage tail free so a partial reading lines up with its prefix.
  // A misheard word must cost less than an extra word (1), otherwise the
  // cheapest alignment parks the cursor and the highlight stops following.
  // ---------------------------------------------------------------------------
  const subCost = c => (c === 'ok' ? 0 : c === 'near' ? 0.5 : 0.8);
  function align(passage, spoken) {
    const n = passage.length, m = spoken.length;
    const cmp = [];
    const D = [new Float64Array(n + 1)];
    for (let j = 1; j <= n; j++) D[0][j] = j;
    for (let i = 1; i <= m; i++) {
      D[i] = new Float64Array(n + 1);
      D[i][0] = i;
      cmp[i] = [];
      for (let j = 1; j <= n; j++) {
        const c = compare(passage[j - 1], spoken[i - 1]);
        cmp[i][j] = c;
        D[i][j] = Math.min(D[i - 1][j - 1] + subCost(c), D[i - 1][j] + 1, D[i][j - 1] + 1);
      }
    }
    // Furthest point reached: cheapest end column (ties go to the shorter prefix)
    let reached = 0;
    for (let j = 1; j <= n; j++) if (D[m][j] < D[m][reached] - 1e-6) reached = j;

    const status = new Array(n).fill('pending');
    const heardAs = new Array(n).fill('');
    const extras = [];
    let i = m, j = reached;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0) {
        const c = cmp[i][j];
        if (Math.abs(D[i][j] - (D[i - 1][j - 1] + subCost(c))) < 1e-4) {
          status[j - 1] = c === 'ok' ? 'ok' : 'miss';
          heardAs[j - 1] = spoken[i - 1];
          i--; j--;
          continue;
        }
      }
      if (j > 0 && (i === 0 || Math.abs(D[i][j] - (D[i][j - 1] + 1)) < 1e-4)) {
        status[j - 1] = 'skip';
        j--;
      } else {
        extras.unshift(spoken[i - 1]);
        i--;
      }
    }
    return { status, heardAs, extras, reached };
  }

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------
  const $ = id => document.getElementById(id);
  const el = {
    notice: $('scNotice'), tabs: $('scTabs'), title: $('scTitle'), level: $('scLevel'), count: $('scWordCount'),
    best: $('scBest'), lang: $('scLang'), passage: $('scPassage'), heard: $('scHeard'), main: $('scMain'),
    end: $('scEnd'), reset: $('scReset'), listen: $('scListen'), status: $('scStatus'), time: $('scTime'),
    progressText: $('scReadCount'), wpm: $('scWpm'), progress: $('scProgress'), report: $('scReport')
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  function readBest() { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (e) { return {}; } }
  function saveBest(id, score) {
    const best = readBest();
    if (best[id] !== undefined && best[id] >= score) return;
    best[id] = score;
    try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch (e) { /* storage unavailable */ }
  }

  function showNotice(html) { el.notice.innerHTML = `<span class="msr">error</span><div>${html}</div>`; el.notice.hidden = false; }
  function hideNotice() { el.notice.hidden = true; }

  // ---------------------------------------------------------------------------
  // Session state
  // ---------------------------------------------------------------------------
  let current = 0;          // paragraph index
  let words = [];           // display words of the passage
  let target = [];          // normalised passage tokens (1:1 with words)
  let spans = [];
  let state = 'idle';       // idle | listening | paused | ending | done
  let rec = null;
  let committed = '';       // final recognised text across all sessions
  let interim = '';         // in-flight text of the current session
  let activeMs = 0;         // time spent listening (pauses excluded)
  let tickAt = 0;
  let result = null;
  let autoEndTimer = 0;
  let restarts = [];

  function renderTabs() {
    const best = readBest();
    el.tabs.innerHTML = PARAGRAPHS.map((p, i) => `
      <button type="button" class="sc-tab" role="tab" aria-selected="${i === current}" data-i="${i}">
        <b>${esc(p.title)}</b>
        <small>${p.level}${best[p.id] !== undefined ? `<i>Best ${best[p.id]}</i>` : ''}</small>
      </button>`).join('');
    const locked = state === 'listening' || state === 'paused' || state === 'ending';
    el.tabs.querySelectorAll('.sc-tab').forEach(b => { b.disabled = locked; });
  }

  function loadParagraph(i) {
    current = i;
    const p = PARAGRAPHS[i];
    words = p.text.split(/\s+/);
    target = words.map(clean);
    el.passage.innerHTML = words.map((w, n) => `<span class="sc-w" data-n="${n}">${esc(w)}</span>`).join(' ');
    spans = [...el.passage.querySelectorAll('.sc-w')];
    el.title.textContent = p.title;
    el.level.textContent = p.level;
    el.level.className = `sc-level is-${p.level.toLowerCase()}`;
    el.count.textContent = `${words.length} words`;
    const best = readBest()[p.id];
    el.best.textContent = best !== undefined ? `Best score ${best}` : 'Not attempted yet';
    resetSession();
  }

  function resetSession() {
    stopRecognition(true);
    stopSpeaking();
    clearTimeout(autoEndTimer);
    committed = '';
    interim = '';
    activeMs = 0;
    result = null;
    el.report.hidden = true;
    setState('idle');
    renderLive();
  }

  function setState(next) {
    if (state === 'listening' && next !== 'listening') activeMs += performance.now() - tickAt;
    if (next === 'listening') tickAt = performance.now();
    state = next;
    const labels = {
      idle: ['mic', 'Start'], listening: ['pause', 'Pause'], paused: ['play_arrow', 'Resume'],
      ending: ['hourglass_top', 'Scoring...'], done: ['replay', 'Start again']
    };
    const [icon, text] = labels[state];
    el.main.innerHTML = `<span class="msr">${icon}</span><span>${text}</span>`;
    el.main.classList.toggle('is-listening', state === 'listening');
    el.main.disabled = state === 'ending' || !SR;
    el.end.disabled = !(state === 'listening' || state === 'paused');
    el.listen.disabled = state === 'listening' || state === 'paused' || state === 'ending';
    el.lang.disabled = state !== 'idle' && state !== 'done';
    el.passage.classList.toggle('is-live', state === 'listening');
    el.status.dataset.state = state;
    el.status.textContent = { idle: 'Ready', listening: 'Listening...', paused: 'Paused', ending: 'Finishing...', done: 'Scored' }[state];
    renderTabs();
  }

  // ---------------------------------------------------------------------------
  // Speech recognition
  // ---------------------------------------------------------------------------
  function startRecognition() {
    rec = new SR();
    rec.lang = el.lang.value;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // Rebuild this session's text from the full result list on every event.
    // Some browsers (Chrome on Android) repeat earlier words in each new result,
    // so a result that extends the previous one replaces it.
    rec.onresult = (e) => {
      const parts = [];
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.trim();
        if (!t) continue;
        const prev = parts[parts.length - 1];
        if (prev && t.toLowerCase().startsWith(prev.toLowerCase())) parts[parts.length - 1] = t;
        else parts.push(t);
      }
      interim = parts.join(' ');
      scheduleRender();
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        showNotice('Microphone access was blocked. Allow the microphone for this site (the icon in the address bar), then press <b>Resume</b>.');
      } else if (e.error === 'audio-capture') {
        showNotice('No microphone was found. Plug one in or check your system sound settings, then press <b>Resume</b>.');
      } else if (e.error === 'network') {
        showNotice('The speech service could not be reached. Check your internet connection, then press <b>Resume</b>.');
      } else {
        showNotice(`Speech recognition stopped (${esc(e.error)}). Press <b>Resume</b> to continue.`);
      }
      if (state === 'listening') setState('paused');
    };

    rec.onend = () => {
      // Bank this session's words before the next session starts from an empty list
      if (interim.trim()) { committed += ' ' + interim; interim = ''; }
      rec = null;
      if (state === 'listening') {
        // Browsers end a session after a stretch of silence: quietly start another,
        // unless it keeps failing straight away
        const now = performance.now();
        restarts = restarts.filter(t => now - t < 4000).concat(now);
        if (restarts.length > 5) { setState('paused'); showNotice('The microphone keeps stopping. Press <b>Resume</b> to try again.'); return; }
        setTimeout(() => {
          if (state !== 'listening' || rec) return;
          try { startRecognition(); } catch (err) { setState('paused'); showNotice('The microphone stopped. Press <b>Resume</b> to continue.'); }
        }, 120);
      } else if (state === 'ending') {
        finish();
      }
      renderLive();
    };

    rec.start();
  }

  function stopRecognition(hard) {
    if (!rec) return;
    const r = rec;
    if (hard) { r.onend = null; r.onresult = null; r.onerror = null; rec = null; r.abort(); }
    else r.stop();
  }

  function onMain() {
    if (!SR) return;
    hideNotice();
    stopSpeaking();
    if (state === 'done') resetSession();
    if (state === 'idle' || state === 'paused') {
      setState('listening');
      try { if (!rec) startRecognition(); } catch (err) { setState('paused'); showNotice('Could not start the microphone. Please try again.'); }
    } else if (state === 'listening') {
      setState('paused');
      stopRecognition(false);
    }
  }

  function onEnd() {
    clearTimeout(autoEndTimer);
    if (state !== 'listening' && state !== 'paused') return;
    const wasRunning = !!rec;
    setState('ending');
    if (wasRunning) {
      stopRecognition(false);
      // Safety net in case the engine never reports that it ended
      setTimeout(() => { if (state === 'ending') { stopRecognition(true); finish(); } }, 2500);
    } else {
      finish();
    }
  }

  // ---------------------------------------------------------------------------
  // Live rendering
  // ---------------------------------------------------------------------------
  let renderQueued = false;
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; renderLive(); });
  }

  function renderLive() {
    const spoken = tokenizeSpoken(committed + ' ' + interim);
    const a = align(target, spoken);
    spans.forEach((s, n) => {
      const st = a.status[n];
      s.className = 'sc-w' + (st === 'pending' ? '' : ` is-${st}`) + (n === a.reached && state !== 'done' ? ' is-next' : '');
      s.title = st === 'miss' ? `Heard: "${a.heardAs[n]}"` : st === 'skip' ? 'Skipped' : '';
    });
    const recent = (committed + ' ' + interim).trim().split(/\s+/).slice(-40).join(' ');
    el.heard.innerHTML = recent
      ? `<span class="msr">hearing</span><span>${esc(recent)}</span>`
      : '<span class="msr">hearing</span><span>What the microphone hears will appear here as you read.</span>';
    el.progressText.textContent = `${a.reached} / ${target.length}`;
    el.progress.style.width = `${(a.reached / target.length) * 100}%`;
    updateClock(a);

    // Reached the last word: wrap up automatically
    if (state === 'listening' && a.reached === target.length && a.status[target.length - 1] !== 'skip') {
      clearTimeout(autoEndTimer);
      autoEndTimer = setTimeout(onEnd, DWELL_AFTER_LAST_WORD);
    }
    return a;
  }

  function elapsed() { return activeMs + (state === 'listening' ? performance.now() - tickAt : 0); }
  function updateClock(a) {
    const ms = elapsed();
    el.time.textContent = fmtTime(ms);
    if (a) {
      const read = a.status.filter(s => s === 'ok' || s === 'miss').length;
      el.wpm.textContent = ms > 5000 ? Math.round(read / (ms / 60000)) : '-';
    }
  }
  setInterval(() => { if (state === 'listening') updateClock(); }, 250);

  // ---------------------------------------------------------------------------
  // Scoring + report
  // ---------------------------------------------------------------------------
  function finish() {
    if (state === 'done') return;
    clearTimeout(autoEndTimer);
    const ms = elapsed();
    setState('done');
    const a = renderLive();
    const total = target.length;
    const ok = a.status.filter(s => s === 'ok').length;
    const miss = a.status.filter(s => s === 'miss').length;
    const skip = a.status.filter(s => s === 'skip').length;
    const notReached = total - a.reached;
    const attempted = ok + miss + skip;
    const minutes = ms / 60000;
    const wpm = minutes > 0 ? Math.round((ok + miss) / minutes) : 0;

    const accuracy = attempted ? (ok / attempted) * 100 : 0;
    const completion = (a.reached / total) * 100;
    let pace = 0;
    if (ok + miss > 0) {
      if (wpm < IDEAL_WPM[0]) pace = Math.max(0, 100 - (IDEAL_WPM[0] - wpm) * 1.5);
      else if (wpm > IDEAL_WPM[1]) pace = Math.max(0, 100 - (wpm - IDEAL_WPM[1]) * 1.5);
      else pace = 100;
    }
    const extraPenalty = Math.min(10, a.extras.length);
    const score = attempted ? Math.max(0, Math.round(accuracy * 0.6 + completion * 0.25 + pace * 0.15 - extraPenalty)) : 0;

    result = { ok, miss, skip, notReached, wpm, accuracy, completion, pace, score, ms, align: a, total };
    if (attempted) saveBest(PARAGRAPHS[current].id, score);
    renderTabs();
    const best = readBest()[PARAGRAPHS[current].id];
    if (best !== undefined) el.best.textContent = `Best score ${best}`;
    renderReport();
  }

  function rating(score) {
    if (score >= 90) return [5, 'Excellent', 'Clear, accurate and well paced. You are interview ready on this one.'];
    if (score >= 80) return [4, 'Very good', 'Strong reading with only a few slips. One more round will make it polished.'];
    if (score >= 65) return [3, 'Good', 'A solid attempt. Work on the highlighted words and try again.'];
    if (score >= 45) return [2, 'Fair', 'You are getting there. Slow down a little and read every word clearly.'];
    return [1, 'Keep practising', 'Read the paragraph once silently, then aloud slowly. Accuracy first, speed later.'];
  }

  function renderReport() {
    const r = result;
    const a = r.align;
    const [stars, label, blurb] = rating(r.score);
    const missedWords = [];
    const misread = [];
    a.status.forEach((s, n) => {
      if (s === 'skip' || s === 'pending') missedWords.push(words[n]);
      if (s === 'miss') misread.push([words[n], a.heardAs[n]]);
    });
    const plain = w => w.replace(/[^A-Za-z0-9']/g, '');
    const chip = (w, extra = '') => `<button type="button" class="sc-word-chip" data-say="${esc(plain(w))}"><span class="msr">volume_up</span>${esc(plain(w))}${extra}</button>`;

    const tips = [];
    if (!r.ok && !r.miss) tips.push('No words were recognised. Check the microphone is allowed and close to you, and choose the English variety closest to your accent.');
    if (r.notReached > 0 && (r.ok || r.miss)) tips.push(`You stopped ${r.notReached} words before the end. Finish the whole paragraph to lift your completion score.`);
    if (r.skip > 0) tips.push(`You skipped ${r.skip} word${r.skip > 1 ? 's' : ''}. Keep your eyes one word ahead of your voice so small words like "a", "the" and "of" are not dropped.`);
    if (misread.length) tips.push(`Practise these slowly: ${misread.slice(0, 5).map(m => `"${plain(m[0])}"`).join(', ')}. Tap any word below to hear it.`);
    if (r.wpm && r.wpm < IDEAL_WPM[0]) tips.push(`Your pace was ${r.wpm} words per minute. Aim for ${IDEAL_WPM[0]} to ${IDEAL_WPM[1]}: read in phrases rather than word by word.`);
    if (r.wpm > IDEAL_WPM[1]) tips.push(`Your pace was ${r.wpm} words per minute, which is fast for an interview. Pause briefly at every comma and full stop.`);
    if (a.extras.length > 3) tips.push('Several extra words were heard. Avoid fillers like "um" and "uh", and do not repeat words when you restart a sentence.');
    if (r.score >= 90) tips.push('Great result. Try a harder paragraph, or read this one again without looking at the screen too often.');
    if (!tips.length) tips.push('Nice work. Read it once more focusing on a confident, steady tone.');

    const C = 2 * Math.PI * 70;
    el.report.innerHTML = `
      <div class="sc-report-top">
        <div class="sc-ring" role="img" aria-label="Score ${r.score} out of 100">
          <svg viewBox="0 0 168 168" aria-hidden="true">
            <defs><linearGradient id="scGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c2410c"/><stop offset="0.6" stop-color="#f97316"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>
            <circle class="track" cx="84" cy="84" r="70"/>
            <circle class="fill" cx="84" cy="84" r="70" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
          </svg>
          <div><b>${r.score}</b><small>out of 100</small></div>
        </div>
        <div class="sc-verdict">
          <span class="pa-kicker" style="color:var(--pa-saffron-d);">Your reading report</span>
          <h2>${label}</h2>
          <div class="sc-stars" aria-label="${stars} out of 5 stars">${[1, 2, 3, 4, 5].map(n => `<span class="msr${n > stars ? ' off' : ''}">star</span>`).join('')}</div>
          <p>${blurb}</p>
        </div>
      </div>
      <div class="sc-stats">
        <div class="sc-stat"><small>Accuracy</small><b>${Math.round(r.accuracy)}%</b><span>of words you attempted</span></div>
        <div class="sc-stat"><small>Completion</small><b>${Math.round(r.completion)}%</b><span>${r.total - r.notReached} of ${r.total} words reached</span></div>
        <div class="sc-stat"><small>Pace</small><b>${r.wpm || '-'}</b><span>words per minute (ideal ${IDEAL_WPM[0]} to ${IDEAL_WPM[1]})</span></div>
        <div class="sc-stat"><small>Reading time</small><b>${fmtTime(r.ms)}</b><span>pauses not counted</span></div>
      </div>
      <div class="sc-counts">
        <span class="sc-count is-ok"><span class="msr">check_circle</span>${r.ok} correct</span>
        <span class="sc-count is-miss"><span class="msr">spellcheck</span>${r.miss} misread</span>
        <span class="sc-count is-skip"><span class="msr">remove_circle</span>${r.skip + r.notReached} missed</span>
        <span class="sc-count is-extra"><span class="msr">add_circle</span>${a.extras.length} extra</span>
      </div>
      <div class="sc-detail">
        <div class="sc-box">
          <h3><span class="msr">spellcheck</span>Misread words</h3>
          ${misread.length ? `<div class="sc-chips">${misread.map(([w, h]) => chip(w, ` <s>${esc(h)}</s>`)).join('')}</div>` : '<p class="sc-empty">None. Every word you read was recognised correctly.</p>'}
        </div>
        <div class="sc-box">
          <h3><span class="msr">remove_circle</span>Missed words</h3>
          ${missedWords.length ? `<div class="sc-chips">${missedWords.map(w => chip(w)).join('')}</div>` : '<p class="sc-empty">None. You read every word.</p>'}
        </div>
        ${a.extras.length ? `<div class="sc-box is-wide"><h3><span class="msr">add_circle</span>Extra words heard</h3><div class="sc-chips">${a.extras.map(w => `<span class="sc-word-chip is-extra">${esc(w)}</span>`).join('')}</div></div>` : ''}
        <div class="sc-box is-wide">
          <h3><span class="msr">tips_and_updates</span>How to improve</h3>
          <ul class="sc-tips">${tips.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="sc-report-actions">
        <button type="button" class="sc-btn is-primary" data-act="retry"><span class="msr">replay</span>Try again</button>
        <button type="button" class="sc-btn" data-act="next"><span class="msr">arrow_forward</span>Next paragraph</button>
      </div>`;
    el.report.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.report.querySelector('.fill').style.strokeDashoffset = C * (1 - r.score / 100);
    }));
    el.report.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------------------
  // Text to speech: model reading and single-word pronunciation
  // ---------------------------------------------------------------------------
  function speak(text, onDone) {
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = el.lang.value;
    u.rate = 0.92;
    if (onDone) { u.onend = onDone; u.onerror = onDone; }
    synth.speak(u);
  }
  function stopSpeaking() {
    if (synth && synth.speaking) synth.cancel();
    el.listen.innerHTML = '<span class="msr">volume_up</span>Hear it first';
  }
  function onListen() {
    if (!synth) return;
    if (synth.speaking) { stopSpeaking(); return; }
    el.listen.innerHTML = '<span class="msr">stop</span>Stop audio';
    speak(PARAGRAPHS[current].text, stopSpeaking);
  }

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------
  el.tabs.addEventListener('click', (e) => {
    const b = e.target.closest('.sc-tab');
    if (b && !b.disabled) loadParagraph(Number(b.dataset.i));
  });
  el.main.addEventListener('click', onMain);
  el.end.addEventListener('click', onEnd);
  el.reset.addEventListener('click', resetSession);
  el.listen.addEventListener('click', onListen);
  el.report.addEventListener('click', (e) => {
    const say = e.target.closest('[data-say]');
    if (say) { speak(say.dataset.say); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'next') loadParagraph((current + 1) % PARAGRAPHS.length);
    else resetSession();
    el.passage.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  window.addEventListener('beforeunload', () => stopRecognition(true));

  if (!synth) el.listen.hidden = true;
  loadParagraph(0);
  if (!SR) {
    showNotice('Your browser does not support speech recognition. Please open this page in <b>Google Chrome</b> or <b>Microsoft Edge</b> on a computer or Android phone.');
    setState('idle');
  }
})();
