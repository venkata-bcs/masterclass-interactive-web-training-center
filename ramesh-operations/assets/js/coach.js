/* =============================================================================
   READ-ALOUD COACH (practice.html)
   Same flow as communication-skill-prep: Start, Pause, Resume, End and score,
   live word highlighting and a report. Speech recognition and playback follow
   the language chosen in the header.
   ============================================================================= */
(function () {
  'use strict';

  const S = window.SpeechMatch, R = window.RT, { t, pick, esc } = window.Shell;
  const Shell = window.Shell;
  const LESSONS = R.lessons();
  const SETS = [['desk', 'setDesk', 'storefront'], ['course', 'setCourse', 'school'], ['question', 'setQuestion', 'forum']];
  const DWELL_AFTER_LAST_WORD = 1500;
  const ONE_PASS_RESTARTS = 5;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  let setId = 'desk', lessonId = null;
  let words = [], target = [], spans = [];
  let state = 'idle';       // idle | listening | paused | ending | done
  let rec = null, committed = '', interim = '', activeMs = 0, tickAt = 0, autoEndTimer = 0, restarts = [], result = null;
  let el = {};

  const fmtTime = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const paragraph = id => LESSONS.find(l => l.id === id);
  const inSet = () => LESSONS.filter(l => l.set === setId);

  function showNotice(text) { el.notice.innerHTML = `<span class="msr">error</span><div>${esc(text)}</div>`; el.notice.hidden = false; }
  function hideNotice() { el.notice.hidden = true; }

  // ---------------------------------------------------------------------------
  // Page structure (rebuilt on language change)
  // ---------------------------------------------------------------------------
  function renderPage() {
    stopRecognition(true);
    stopSpeaking();
    document.getElementById('rtMain').innerHTML = `
      <header class="rt-hero is-short">
        <span class="rt-kicker"><span class="msr">mic</span>${esc(t('navPractice'))}</span>
        <h1>${esc(t('practiceTitle'))}</h1>
        <p>${esc(t('practiceLead'))}</p>
      </header>
      <div class="sc-notice" id="scNotice" role="alert" hidden></div>
      <div class="sc-notice is-soft" id="scVoice" hidden></div>
      <section class="rt-panel">
        <div class="rt-seg" id="scSets" role="tablist"></div>
        <div class="sc-tabs" id="scTabs" role="tablist"></div>
        <div class="sc-meta">
          <h2 id="scTitle"></h2>
          <span><span class="msr">notes</span><span id="scCount"></span></span>
          <span><span class="msr">emoji_events</span><span id="scBest"></span></span>
        </div>
        <div class="sc-passage" id="scPassage"></div>
        <div class="sc-progress" aria-hidden="true"><span id="scProgress"></span></div>
        <div class="sc-heard" id="scHeard" aria-live="polite"></div>
        <div class="sc-controls">
          <button type="button" class="rt-btn is-primary" id="scMain"></button>
          <button type="button" class="rt-btn is-end" id="scEnd" disabled><span class="msr">stop_circle</span>${esc(t('endScore'))}</button>
          <button type="button" class="rt-btn is-ghost" id="scReset"><span class="msr">restart_alt</span>${esc(t('reset'))}</button>
          <button type="button" class="rt-btn is-ghost" id="scListen"><span class="msr">volume_up</span>${esc(t('hearFirst'))}</button>
          <div class="sc-live">
            <span class="sc-status" id="scStatus" data-state="idle"></span>
            <span>${esc(t('time'))} <b id="scTime">0:00</b></span>
            <span>${esc(t('words'))} <b id="scRead">0 / 0</b></span>
            <span>${esc(t('pace'))} <b id="scWpm">-</b> ${esc(t('wpm'))}</span>
          </div>
        </div>
        <div class="sc-legend" aria-hidden="true">
          <span><span class="sc-w is-ok">${esc(t('legendOk'))}</span></span>
          <span><span class="sc-w is-miss">${esc(t('legendMiss'))}</span></span>
          <span><span class="sc-w is-skip">${esc(t('legendSkip'))}</span></span>
          <span><span class="sc-w is-next">${esc(t('legendNext'))}</span></span>
        </div>
      </section>
      <section class="sc-report" id="scReport" aria-live="polite" hidden></section>
      <section class="rt-section">
        <h2><span class="msr">calculate</span>${esc(t('howTitle'))}</h2>
        <ol class="rt-steps">${['how1', 'how2', 'how3', 'how4'].map(k => `<li>${esc(t(k))}</li>`).join('')}</ol>
        <div class="rt-tip"><span class="msr">lightbulb</span><div>${esc(t('howTip'))}</div></div>
      </section>`;

    el = {};
    [['notice', 'scNotice'], ['voice', 'scVoice'], ['sets', 'scSets'], ['tabs', 'scTabs'], ['title', 'scTitle'], ['count', 'scCount'], ['best', 'scBest'],
      ['passage', 'scPassage'], ['progress', 'scProgress'], ['heard', 'scHeard'], ['main', 'scMain'], ['end', 'scEnd'], ['reset', 'scReset'], ['listen', 'scListen'],
      ['status', 'scStatus'], ['time', 'scTime'], ['read', 'scRead'], ['wpm', 'scWpm'], ['report', 'scReport']].forEach(([k, id]) => { el[k] = document.getElementById(id); });

    el.sets.addEventListener('click', e => {
      const b = e.target.closest('[data-set]');
      if (!b || b.disabled) return;
      setId = b.dataset.set;
      loadLesson(inSet()[0].id);
    });
    el.tabs.addEventListener('click', e => {
      const b = e.target.closest('[data-id]');
      if (b && !b.disabled) loadLesson(b.dataset.id);
    });
    el.main.addEventListener('click', onMain);
    el.end.addEventListener('click', onEnd);
    el.reset.addEventListener('click', resetSession);
    el.listen.addEventListener('click', onListen);
    el.report.addEventListener('click', onReportClick);

    updateVoiceAvailability();
    loadLesson(lessonId || inSet()[0].id);
    if (!SR) showNotice(t('errBrowser'));
  }

  function renderPickers() {
    const locked = ['listening', 'paused', 'ending'].includes(state);
    el.sets.innerHTML = SETS.map(([id, key, icon]) =>
      `<button type="button" role="tab" data-set="${id}" aria-selected="${id === setId}" ${locked ? 'disabled' : ''}><span class="msr">${icon}</span>${esc(t(key))}</button>`).join('');
    el.tabs.innerHTML = inSet().map(l => {
      const best = Shell.getBest(l.id);
      const ready = best !== undefined && best >= Shell.READY_SCORE;
      return `<button type="button" class="sc-tab${ready ? ' is-ready' : ''}" role="tab" aria-selected="${l.id === lessonId}" data-id="${l.id}" ${locked ? 'disabled' : ''}>
        <b>${esc(pick(l.title))}</b><small>${best !== undefined ? `${esc(t('best'))} ${best}` : esc(t('notAttempted'))}</small></button>`;
    }).join('');
    const active = el.tabs.querySelector('[aria-selected="true"]');
    if (active) el.tabs.scrollLeft = active.offsetLeft - el.tabs.offsetLeft - 8;
  }

  function loadLesson(id) {
    lessonId = id;
    const l = paragraph(id);
    setId = l.set;
    words = pick(l).split(/\s+/);
    target = S.tokenizeScript(words);
    el.passage.innerHTML = words.map((w, n) => `<span class="sc-w" data-n="${n}">${esc(w)}</span>`).join(' ');
    spans = [...el.passage.querySelectorAll('.sc-w')];
    el.title.textContent = pick(l.title);
    el.count.textContent = `${words.length} ${t('words')}`;
    showBest();
    resetSession();
  }

  function showBest() {
    const best = Shell.getBest(lessonId);
    el.best.textContent = best !== undefined ? `${t('best')} ${best}` : t('notAttempted');
  }

  function resetSession() {
    stopRecognition(true);
    stopSpeaking();
    clearTimeout(autoEndTimer);
    committed = ''; interim = ''; activeMs = 0; result = null; restarts = [];
    el.report.hidden = true;
    hideNotice();
    setState('idle');
    renderLive();
  }

  function setState(next) {
    if (state === 'listening' && next !== 'listening') activeMs += performance.now() - tickAt;
    if (next === 'listening') tickAt = performance.now();
    state = next;
    const labels = { idle: ['mic', 'start'], listening: ['pause', 'pause'], paused: ['play_arrow', 'resume'], ending: ['hourglass_top', 'scoring'], done: ['replay', 'again'] };
    const [icon, key] = labels[state];
    el.main.innerHTML = `<span class="msr">${icon}</span><span>${esc(t(key))}</span>`;
    el.main.classList.toggle('is-listening', state === 'listening');
    el.main.disabled = state === 'ending' || !SR;
    el.end.disabled = !(state === 'listening' || state === 'paused');
    el.listen.disabled = state === 'listening' || state === 'paused' || state === 'ending' || !voiceFor();
    el.passage.classList.toggle('is-live', state === 'listening');
    el.status.dataset.state = state;
    el.status.textContent = t({ idle: 'ready', listening: 'listening', paused: 'paused', ending: 'finishing', done: 'scored' }[state]);
    Shell.lockLanguage(['listening', 'paused', 'ending'].includes(state));
    renderPickers();
  }

  // ---------------------------------------------------------------------------
  // Speech recognition
  // ---------------------------------------------------------------------------
  function startRecognition() {
    rec = new SR();
    rec.lang = Shell.srLang();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // Rebuild this session's text from the full result list on every event.
    // Chrome on Android repeats earlier words in each new result, so a result
    // that extends the previous one replaces it.
    rec.onresult = (e) => {
      const parts = [];
      for (let i = 0; i < e.results.length; i++) {
        const text = e.results[i][0].transcript.trim();
        if (!text) continue;
        const prev = parts[parts.length - 1];
        if (prev && text.toLowerCase().startsWith(prev.toLowerCase())) parts[parts.length - 1] = text;
        else parts.push(text);
      }
      interim = parts.join(' ');
      scheduleRender();
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      const messages = {
        'not-allowed': 'errBlocked', 'service-not-allowed': 'errBlocked', 'audio-capture': 'errNoMic', network: 'errNet', 'language-not-supported': 'errLang'
      };
      showNotice(messages[e.error] ? t(messages[e.error]) : t('errOther')(e.error));
      if (state === 'listening') setState('paused');
    };

    rec.onend = () => {
      // Bank this session's words before the next session starts from an empty list
      if (interim.trim()) { committed += ' ' + interim; interim = ''; }
      rec = null;
      if (state === 'listening') {
        // Browsers end a session after silence: quietly start another, unless it keeps failing
        const now = performance.now();
        restarts = restarts.filter(x => now - x < 4000).concat(now);
        if (restarts.length > ONE_PASS_RESTARTS) { setState('paused'); showNotice(t('errRepeat')); return; }
        setTimeout(() => {
          if (state !== 'listening' || rec) return;
          try { startRecognition(); } catch (err) { setState('paused'); showNotice(t('errStart')); }
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
    if (hard) { r.onend = null; r.onresult = null; r.onerror = null; rec = null; r.abort(); } else r.stop();
  }

  function onMain() {
    if (!SR) return;
    hideNotice();
    stopSpeaking();
    if (state === 'done') resetSession();
    if (state === 'idle' || state === 'paused') {
      setState('listening');
      try { if (!rec) startRecognition(); } catch (err) { setState('paused'); showNotice(t('errStart')); }
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
    const heardText = `${committed} ${interim}`.trim();
    const a = S.align(target, S.tokenizeSpoken(heardText, Shell.lang()));
    spans.forEach((s, n) => {
      const st = a.status[n];
      s.className = 'sc-w' + (st === 'pending' ? '' : ` is-${st}`) + (n === a.reached && state !== 'done' ? ' is-next' : '');
      s.title = st === 'miss' ? a.heardAs[n] : '';
    });
    const recent = heardText.split(/\s+/).slice(-40).join(' ');
    el.heard.innerHTML = `<span class="msr">hearing</span><span>${esc(recent || t('heardHint'))}</span>`;
    el.read.textContent = `${a.reached} / ${target.length}`;
    el.progress.style.width = `${(a.reached / target.length) * 100}%`;
    updateClock(a);

    // Reached the last word: wrap up automatically
    if (state === 'listening' && a.reached === target.length && a.status[target.length - 1] !== 'skip') {
      clearTimeout(autoEndTimer);
      autoEndTimer = setTimeout(onEnd, DWELL_AFTER_LAST_WORD);
    }
    return a;
  }

  const elapsed = () => activeMs + (state === 'listening' ? performance.now() - tickAt : 0);
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
  // Scoring and report
  // ---------------------------------------------------------------------------
  function finish() {
    if (state === 'done') return;
    clearTimeout(autoEndTimer);
    const ms = elapsed();
    setState('done');
    const a = renderLive();
    const r = S.scoreAttempt(a, target.length, ms, Shell.lang());
    result = { ...r, ms, align: a, total: target.length };
    if (r.attempted) Shell.setBest(lessonId, r.score);
    renderPickers();
    showBest();
    renderReport();
  }

  function rating(score) {
    if (score >= 90) return [5, t('r5')];
    if (score >= 80) return [4, t('r4')];
    if (score >= 65) return [3, t('r3')];
    if (score >= 45) return [2, t('r2')];
    return [1, t('r1')];
  }

  function renderReport() {
    const r = result, a = r.align;
    const [lo, hi] = S.PACE[Shell.lang()];
    const [stars, [label, blurb]] = rating(r.score);
    const missedWords = [], misread = [];
    a.status.forEach((s, n) => {
      if (s === 'skip' || s === 'pending') missedWords.push(words[n]);
      if (s === 'miss') misread.push([words[n], a.heardAs[n]]);
    });
    const plain = w => w.replace(/[^\p{L}\p{M}\p{N}'.#]/gu, '').replace(/\.$/, '');
    const chip = (w, extra = '') => `<button type="button" class="sc-word-chip" data-say="${esc(plain(w))}"><span class="msr">volume_up</span>${esc(plain(w))}${extra}</button>`;

    const tips = [];
    if (!r.ok && !r.miss) tips.push(t('tipNone'));
    if (r.notReached > 0 && (r.ok || r.miss)) tips.push(t('tipStop')(r.notReached));
    if (r.skip > 0) tips.push(t('tipSkip')(r.skip));
    if (misread.length) tips.push(t('tipMiss')(misread.slice(0, 5).map(m => plain(m[0])).join(', ')));
    if (r.wpm && r.wpm < lo) tips.push(t('tipSlow')(r.wpm, lo, hi));
    if (r.wpm > hi) tips.push(t('tipFast')(r.wpm, lo, hi));
    if (a.extras.length > 3) tips.push(t('tipExtra'));
    if (r.score >= 90) tips.push(t('tipGreat'));
    if (!tips.length) tips.push(t('tipOk'));

    const C = 2 * Math.PI * 70;
    el.report.innerHTML = `
      <div class="sc-report-top">
        <div class="sc-ring" role="img" aria-label="${r.score} / 100">
          <svg viewBox="0 0 168 168" aria-hidden="true">
            <defs><linearGradient id="scGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b3fa8"/><stop offset="1" stop-color="#1d7bf2"/></linearGradient></defs>
            <circle class="track" cx="84" cy="84" r="70"/>
            <circle class="fill" cx="84" cy="84" r="70" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
          </svg>
          <div><b>${r.score}</b><small>${esc(t('scoreOf'))}</small></div>
        </div>
        <div class="sc-verdict">
          <span class="rt-kicker is-plain">${esc(t('reportKicker'))}</span>
          <h2>${esc(label)}</h2>
          <div class="sc-stars" aria-label="${stars} / 5">${[1, 2, 3, 4, 5].map(n => `<span class="msr${n > stars ? ' off' : ''}">star</span>`).join('')}</div>
          <p>${esc(blurb)}</p>
        </div>
      </div>
      <div class="sc-stats">
        <div class="sc-stat"><small>${esc(t('accuracy'))}</small><b>${Math.round(r.accuracy)}%</b><span>${esc(t('accuracySub'))}</span></div>
        <div class="sc-stat"><small>${esc(t('completion'))}</small><b>${Math.round(r.completion)}%</b><span>${r.total - r.notReached} / ${r.total} ${esc(t('completionSub'))}</span></div>
        <div class="sc-stat"><small>${esc(t('pace'))}</small><b>${r.wpm || '-'}</b><span>${esc(t('paceSub'))} ${lo} ${esc(t('to'))} ${hi}</span></div>
        <div class="sc-stat"><small>${esc(t('readingTime'))}</small><b>${fmtTime(r.ms)}</b><span>${esc(t('readingSub'))}</span></div>
      </div>
      <div class="sc-counts">
        <span class="sc-count is-ok"><span class="msr">check_circle</span>${r.ok} ${esc(t('correct'))}</span>
        <span class="sc-count is-miss"><span class="msr">spellcheck</span>${r.miss} ${esc(t('misread'))}</span>
        <span class="sc-count is-skip"><span class="msr">remove_circle</span>${r.skip + r.notReached} ${esc(t('missed'))}</span>
        <span class="sc-count is-extra"><span class="msr">add_circle</span>${a.extras.length} ${esc(t('extra'))}</span>
      </div>
      <div class="sc-detail">
        <div class="sc-box"><h3><span class="msr">spellcheck</span>${esc(t('misreadTitle'))}</h3>
          ${misread.length ? `<div class="sc-chips">${misread.map(([w, h]) => chip(w, ` <s>${esc(h)}</s>`)).join('')}</div>` : `<p class="sc-empty">${esc(t('noMisread'))}</p>`}</div>
        <div class="sc-box"><h3><span class="msr">remove_circle</span>${esc(t('missedTitle'))}</h3>
          ${missedWords.length ? `<div class="sc-chips">${missedWords.map(w => chip(w)).join('')}</div>` : `<p class="sc-empty">${esc(t('noMissed'))}</p>`}</div>
        ${a.extras.length ? `<div class="sc-box is-wide"><h3><span class="msr">add_circle</span>${esc(t('extraTitle'))}</h3><div class="sc-chips">${a.extras.map(w => `<span class="sc-word-chip is-extra">${esc(w)}</span>`).join('')}</div></div>` : ''}
        <div class="sc-box is-wide"><h3><span class="msr">tips_and_updates</span>${esc(t('improve'))}</h3><ul class="sc-tips">${tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
      <div class="sc-report-actions">
        <button type="button" class="rt-btn is-primary" data-act="retry"><span class="msr">replay</span>${esc(t('tryAgain'))}</button>
        <button type="button" class="rt-btn" data-act="next"><span class="msr">arrow_forward</span>${esc(t('nextScript'))}</button>
      </div>`;
    el.report.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.report.querySelector('.fill').style.strokeDashoffset = C * (1 - r.score / 100);
    }));
    el.report.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function onReportClick(e) {
    const say = e.target.closest('[data-say]');
    if (say) { speak(say.dataset.say); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'next') {
      const list = inSet();
      loadLesson(list[(list.findIndex(l => l.id === lessonId) + 1) % list.length].id);
    } else resetSession();
    el.passage.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------------------------------------------------------------------------
  // Model reading. Many computers have no Telugu voice. Without one the browser
  // reads silently or in the wrong accent, so the button turns off and says why.
  // ---------------------------------------------------------------------------
  function voiceFor() {
    if (!synth) return null;
    const prefix = Shell.lang();
    return synth.getVoices().find(v => v.lang.toLowerCase().replace('_', '-').startsWith(prefix)) || null;
  }
  function updateVoiceAvailability() {
    if (!el.listen) return;
    const has = !!voiceFor();
    el.listen.hidden = !synth;
    if (state === 'idle' || state === 'done') el.listen.disabled = !has;
    el.voice.hidden = has || !synth || !synth.getVoices().length;
    if (!el.voice.hidden) el.voice.textContent = t('noVoice');
  }
  if (synth) synth.addEventListener('voiceschanged', updateVoiceAvailability);

  function speak(text, onDone) {
    const voice = voiceFor();
    if (!voice) { if (onDone) onDone(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.92;
    if (onDone) { u.onend = onDone; u.onerror = onDone; }
    synth.speak(u);
  }
  function stopSpeaking() {
    if (synth && synth.speaking) synth.cancel();
    if (el.listen) el.listen.innerHTML = `<span class="msr">volume_up</span>${esc(t('hearFirst'))}`;
  }
  function onListen() {
    if (!synth) return;
    if (synth.speaking) { stopSpeaking(); return; }
    el.listen.innerHTML = `<span class="msr">stop</span>${esc(t('stopAudio'))}`;
    speak(pick(paragraph(lessonId)), stopSpeaking);
  }

  window.addEventListener('beforeunload', () => stopRecognition(true));

  const wanted = new URLSearchParams(location.search).get('id');
  if (wanted && paragraph(wanted)) { lessonId = wanted; setId = paragraph(wanted).set; }
  Shell.init(renderPage);
})();
