// Agentic Loops explainer: one agent runs Observe -> Think -> Act -> Check around a ring (column B),
// using tools and watched by stop rules (column A), while its scratchpad fills the context window (column C).
const Loops = (() => {
  // ---------- Mission library ----------
  // Each pass: o (observe), t (think), a [tool, action, result], c (check), plus flags:
  // ok = goal met, err = an error code (counts toward "same error 3 times"), replan, plan [steps].
  const PATTERNS = {
    react: { name: 'ReAct', sub: 'Reason one step, act, read the result, repeat', desc: 'Think one step, act, read the result, then think again. Flexible when the path is unknown.' },
    plan: { name: 'Plan & Execute', sub: 'Plan first, work the plan, re-plan when off track', desc: 'Write the plan up front, work through it step by step, and re-plan when a check says it is off track.' },
    reflect: { name: 'Reflection', sub: 'Draft, critique, revise until the checks pass', desc: 'Draft, let a separate Critic agent review against clear checks, revise, and repeat until the checks pass.' },
    guard: { name: 'Guarded Retry', sub: 'Retry, but never forever', desc: 'Retry when it makes sense, but stop when the same error repeats, keep the trace, and hand over to a person.' }
  };
  const MISSIONS = [
    {
      pattern: 'react', domain: 'Railways', title: 'Explain a 3-hour train delay and update passengers',
      prompt: 'Train 12560 is running 3 hours late. Find out why and update all 1,400 passengers.',
      tools: ['Live Train Tracking', 'Signalling Log', 'Crew Roster', 'Passenger Alerts'], max: 8, budget: 40000, ctx: 32000,
      passes: [
        { o: 'Train 12560 is 3 hours late. Cause unknown.', t: 'First find where the train is now.', a: ['Live Train Tracking', 'Get live position', 'Held outside Kanpur for 2 h 40 min'], c: 'Know where, not why. Go again.' },
        { o: 'Held outside Kanpur for 2 h 40 min.', t: 'A long hold usually means a signal or track problem. Check the signal log.', a: ['Signalling Log', 'Read the Kanpur signal log', 'Signal failure at 14:10, fixed at 16:35'], c: 'Cause found. Is it on the move, and when will it arrive?' },
        { o: 'Signal fixed at 16:35, train moving.', t: 'Check the crew change does not add more delay.', a: ['Crew Roster', 'Check crew duty hours', 'Crew changes at Kanpur on time: new arrival 23:40'], c: 'New arrival known. Ready to tell passengers.' },
        { o: 'Cause and new arrival time confirmed.', t: 'Send a short update in Hindi and English.', a: ['Passenger Alerts', 'SMS all 1,400 passengers', 'Delivered to 1,386, 14 numbers invalid'], c: 'Goal met: cause explained, passengers updated.', ok: true }
      ],
      result: { headline: 'Delay explained and 1,386 passengers updated in 4 passes', kpis: [['4', 'Passes'], ['1,386', 'Passengers updated'], ['23:40', 'New arrival'], ['6 min', 'Start to finish']], why: 'Every check passed: the cause was found and passengers were told.' }
    },
    {
      pattern: 'plan', domain: 'Retail', title: 'Clear 40% of excess winter stock in 3 weeks',
      prompt: 'We have 18,000 excess winter units. Sell at least 40% in the next 3 weeks without going below cost.',
      tools: ['Inventory ERP', 'Pricing Engine', 'Promo Scheduler', 'Sales Dashboard'], max: 10, budget: 60000, ctx: 16000,
      passes: [
        { o: '18,000 excess units, target 40% sold in 3 weeks.', t: 'Write the plan first.', plan: ['Find the excess by store', 'Mark down 20%', 'Run a weekend promotion', 'Measure sell-through weekly'], a: ['Inventory ERP', 'List excess stock by store', '18,000 units in 42 stores, mostly jackets'], c: 'Plan step 1 done.' },
        { o: 'Excess is mostly jackets, in 42 stores.', t: 'Plan step 2: a 20% markdown on jackets.', a: ['Pricing Engine', 'Apply a 20% markdown', 'Live in 42 stores, still above cost'], c: 'Plan step 2 done.' },
        { o: 'Markdown is live.', t: 'Plan step 3: a weekend promotion.', a: ['Promo Scheduler', 'Book a weekend promotion', 'Email and app push booked for Saturday'], c: 'Plan step 3 done.' },
        { o: 'Week 1 is over.', t: 'Plan step 4: measure.', a: ['Sales Dashboard', 'Read week-1 sell-through', 'Only 9% sold: heading for 27%'], c: 'Off track: 27% against a 40% target. Re-plan.', replan: true },
        { o: 'Heading for 27%. 12 stores are barely selling.', t: 'Re-plan: 35% off in the 12 slow stores, and bundle jackets with gloves.', plan: ['35% markdown in 12 slow stores', 'Jacket and gloves bundle', 'Measure again next week'], a: ['Pricing Engine', 'Apply 35% in 12 stores and add bundles', 'Live, still above cost'], c: 'New plan running. Measure next week.' },
        { o: 'Week 2 is over.', t: 'Measure again against the target.', a: ['Sales Dashboard', 'Read week-2 sell-through', '31% sold: heading for 44%'], c: 'Goal on track: 44% projected, above cost.', ok: true }
      ],
      result: { headline: 'On track to clear 44% of excess stock, after one re-plan', kpis: [['44%', 'Projected sell-through'], ['1', 'Re-plan'], ['12', 'Stores re-priced'], ['0', 'Sales below cost']], why: 'The measure step caught the plan going off track, and the re-plan fixed it.' }
    },
    {
      pattern: 'reflect', domain: 'HR', critic: true, title: 'Write an inclusive job ad for a senior data engineer',
      prompt: 'Write a job ad for a senior data engineer that is accurate, inclusive and easy to read.',
      tools: ['Role Profile', 'Draft Writer', 'Bias Checker', 'Job Board'], max: 6, budget: 30000, ctx: 32000,
      passes: [
        { o: 'Goal: an accurate, inclusive, readable ad.', t: 'Write a first draft from the role profile.', a: ['Draft Writer', 'Write draft v1', '420 words, 14 “must-have” requirements'], c: 'Critic: 14 must-haves put people off, and “rockstar” and “young team” are biased.' },
        { o: 'Critic feedback on v1.', t: 'Keep the 5 real must-haves and remove the biased words.', a: ['Draft Writer', 'Write draft v2', '310 words, 5 must-haves'], c: 'Critic: better. The salary range is missing; add flexible working.' },
        { o: 'Critic feedback on v2.', t: 'Add the salary band and flexible working, then run the checks.', a: ['Bias Checker', 'Run bias and readability checks', 'Bias score 96/100, reading age 14'], c: 'Critic: all checks pass.', ok: true }
      ],
      result: { headline: 'Job ad passed every check after 3 drafts', kpis: [['3', 'Drafts'], ['14 → 5', 'Must-haves'], ['96/100', 'Bias score'], ['310', 'Words']], why: 'The Critic’s checks all passed on draft 3.' }
    },
    {
      pattern: 'guard', domain: 'Stock Market', title: 'Build the daily trade report while the reports service is down',
      prompt: 'Build today’s trade report for our 3,000 clients before markets open.',
      tools: ['Reports API', 'Status Page', 'Retry Queue', 'Ops Ticket'], max: 8, budget: 40000, ctx: 32000,
      passes: [
        { o: 'Goal: the trade report for 3,000 clients before 9:15 am.', t: 'Request the report from the reports service.', a: ['Reports API', 'Request the report', 'Error 503: service unavailable'], c: 'Failed. Try again.', err: '503' },
        { o: 'Error 503 on the first try.', t: 'Probably a blip. Retry.', a: ['Reports API', 'Retry the request', 'Error 503: service unavailable'], c: 'The same error twice.', err: '503' },
        { o: 'Two 503 errors in a row.', t: 'Is the service itself down?', a: ['Status Page', 'Check the service status', 'Reports service degraded since 06:10'], c: 'It is the service, not the request.' },
        { o: 'Service degraded since 06:10.', t: 'Queue one last retry after a short wait.', a: ['Retry Queue', 'Retry after 2 minutes', 'Error 503: service unavailable'], c: 'The same error 3 times. Stop and hand over.', err: '503' }
      ],
      stop: 'repeat',
      handoff: ['Ops Ticket', 'Open ticket OPS-2291 with the full trace', 'On-call engineer paged at 07:02'],
      result: { headline: 'Stopped after 4 passes instead of retrying all night', kpis: [['4', 'Passes'], ['3', 'Same error'], ['07:02', 'Engineer paged'], ['2 h', 'Before market open']], why: 'The same error came back 3 times, so the loop stopped and handed over with the full trace.' }
    }
  ];
  const RULES = [
    ['goal', 'Goal met'],
    ['max', 'Too many passes'],
    ['budget', 'Out of budget'],
    ['repeat', 'Same error 3 times'],
    ['human', 'A person is needed']
  ];
  const WHY = {
    1: 'Every pass starts from the latest facts, not from what the agent assumed.',
    2: 'The model chooses one next step, using everything in the scratchpad.',
    3: 'One tool call, with a real result the agent can read.',
    4: 'Checked against the goal and every stop rule.'
  };

  // ---------- State ----------
  const K = AgentKit;
  const { $, rand, esc, wait, spawn, makeUnit, fly, ring, center, COLOR, setPhase, follow } = K;
  let running = false, mission;
  const CIRC = 2 * Math.PI * 38;

  const stEl = n => document.querySelector(`.lp-st[data-st="${n}"]`);
  function rule(id, text, cls) {
    const li = document.querySelector(`#lp-rules li[data-rule="${id}"]`);
    if (text != null) li.querySelector('small').textContent = text;
    if (cls) li.classList.add(cls);
  }
  function setRing(stage) { $('lp-progress').style.strokeDashoffset = CIRC * (1 - stage / 4); }
  function log(kind, html, cls = '') {
    const pass = $('lp-log').lastElementChild;
    const d = document.createElement('div');
    d.className = 'ln ' + cls;
    d.innerHTML = `<span class="k">${kind}</span> ${html}`;
    pass.appendChild(d);
    $('lp-log').scrollTop = $('lp-log').scrollHeight;
    return d;
  }
  function newPass(label) {
    const p = document.createElement('div');
    p.className = 'lp-pass';
    p.innerHTML = `<h6>${label}</h6>`;
    $('lp-log').appendChild(p);
    return p;
  }

  // ---------- Setup / reset ----------
  function buildSelect() {
    $('sw-objective').innerHTML = Object.entries(PATTERNS).map(([k, p]) => `<optgroup label="${esc(p.name)}">` +
      MISSIONS.map((m, i) => m.pattern === k ? `<option value="${i}">${esc(m.domain)}: ${esc(m.title)}</option>` : '').join('') + '</optgroup>').join('');
  }
  function loadMission() {
    mission = MISSIONS[+$('sw-objective').value];
    $('sw-prompt').value = mission.prompt;
  }
  function resetStage() {
    K.newRun();
    running = false;
    const m = mission, P = PATTERNS[m.pattern];
    $('bay-tool').innerHTML = '';
    m.tools.concat(m.handoff && !m.tools.includes(m.handoff[0]) ? [m.handoff[0]] : []).forEach(n => $('bay-tool').appendChild(makeUnit('tool', n)));
    $('lp-rules').innerHTML = RULES.map(([id, label]) => `<li data-rule="${id}"><b>${label}</b><small></small></li>`).join('');
    rule('goal', m.critic ? 'the Critic’s checks pass' : 'the check says done');
    rule('max', `max ${m.max} passes`);
    rule('budget', `max ${m.budget.toLocaleString('en-US')} tokens`);
    rule('repeat', 'then stop and hand over');
    rule('human', 'when a decision is not the agent’s to make');
    $('lp-pattern').textContent = P.name;
    $('lp-pattern-sub').textContent = P.sub;
    $('lp-iter').textContent = '0';
    $('lp-iter-of').textContent = `of max ${m.max} passes`;
    $('lp-now').textContent = '';
    document.querySelectorAll('.lp-st').forEach(s => s.classList.remove('on'));
    setRing(0);
    $('lp-ctx-bar').style.width = '0%';
    $('lp-ctx-bar').classList.remove('hot');
    $('lp-ctx-txt').textContent = `0 of ${m.ctx.toLocaleString('en-US')} tokens`;
    $('lp-log').innerHTML = '<div class="lp-pass"><div class="ln">The trace fills up as the agent works.</div></div>';
    $('sw-results').classList.remove('landed');
    $('sw-results').innerHTML = '<div class="sw-results-empty"><span class="sw-col-num">D</span><div><h3>Loop Results</h3><p>Lands here once a stop rule fires.</p></div></div>';
    document.querySelectorAll('#sw-stepper li').forEach(li => li.classList.remove('on', 'done'));
    $('sw-caption').innerHTML = '<span class="sw-caption-what">Pick a mission and press <b>Start the Loop</b>.</span><span class="sw-caption-why">Watch the agent go round until a stop rule fires.</span>';
    const kick = $('sw-kick');
    kick.disabled = false;
    kick.querySelector('span').textContent = 'Start the Loop';
  }

  // ---------- The loop ----------
  async function run() {
    if (running) return;
    resetStage();
    K.start();
    running = true;
    const m = mission, P = PATTERNS[m.pattern], kick = $('sw-kick');
    kick.disabled = true;
    kick.querySelector('span').textContent = 'Looping…';
    const st = { tokens: 0, ctx: 0, peak: 0, tools: 0, folds: 0, errs: {}, passes: 0 };
    $('lp-log').innerHTML = '';

    // Goal
    setPhase(0, `Goal: “${esc($('sw-prompt').value.trim() || m.prompt)}”`, `Pattern: ${P.name}. ${P.desc}`);
    newPass('Goal');
    log('goal', esc(m.prompt));
    const ringEl = $('lp-ring');
    follow(ringEl);
    const pos = n => center(stEl(n)), C = center(ringEl);
    const agent = spawn('agent', 'Agent', pos(1), { big: true, s: 0.2 });
    ring(agent._p, COLOR('agent'));
    await fly(agent, pos(1), { s: 0.95, dur: 600, arc: 0 });
    let critic = null;
    if (m.critic) {
      const at = pos(4);
      critic = spawn('critic', 'Critic', { x: at.x - 8, y: at.y + 62 }, { s: 0.2 });
      ring(critic._p, COLOR('critic'));
      await fly(critic, { x: at.x - 8, y: at.y + 62 }, { s: 0.75, dur: 500, arc: 0 });
    }
    await wait(500);

    // Runs a quarter of the ring, clockwise, from station n to the next one.
    const step = async n => {
      const from = pos(n), to = pos(n % 4 + 1), R = Math.hypot(from.x - C.x, from.y - C.y);
      const mid = Math.atan2((from.y + to.y) / 2 - C.y, (from.x + to.x) / 2 - C.x);
      await fly(agent, to, { dur: 750, ctrl: { x: C.x + Math.SQRT2 * R * Math.cos(mid), y: C.y + Math.SQRT2 * R * Math.sin(mid) } });
    };
    const stage = (n, what) => {
      document.querySelectorAll('.lp-st').forEach(s => s.classList.toggle('on', +s.dataset.st === n));
      setRing(n);
      $('lp-now').textContent = what;
      setPhase(n, `<b>${['', 'Observe', 'Think', 'Act', 'Check'][n]}:</b> ${esc(what)}`, n === 4 && m.critic ? 'A separate Critic agent reviews the work against clear checks.' : WHY[n]);
    };
    const spend = n => {
      st.tokens += n; st.ctx += n; st.peak = Math.max(st.peak, st.ctx);
      const pct = Math.min(100, st.ctx / m.ctx * 100);
      $('lp-ctx-bar').style.width = pct + '%';
      $('lp-ctx-bar').classList.toggle('hot', pct > 75);
      $('lp-ctx-txt').textContent = `${st.ctx.toLocaleString('en-US')} of ${m.ctx.toLocaleString('en-US')} tokens`;
      rule('budget', `${st.tokens.toLocaleString('en-US')} of ${m.budget.toLocaleString('en-US')} tokens used`);
    };

    let stopped = null;
    for (const [i, p] of m.passes.entries()) {
      st.passes = i + 1;
      $('lp-iter').textContent = i + 1;
      rule('max', `pass ${i + 1} of max ${m.max}`);
      newPass(`Pass ${i + 1}`);

      stage(1, p.o);
      log('observe', esc(p.o));
      spend(rand(300, 500));
      await wait(1000);

      await step(1);
      stage(2, p.t);
      agent.classList.add('work');
      log(p.replan ? 're-plan' : 'think', esc(p.t), p.replan ? 'bad' : '');
      if (p.plan) log(i ? 'plan v2' : 'plan', '<ol>' + p.plan.map(s => `<li>${esc(s)}</li>`).join('') + '</ol>');
      spend(rand(700, 1100));
      await wait(p.plan ? 1500 : 1100);
      agent.classList.remove('work');

      await step(2);
      const [tool, action, result] = p.a;
      stage(3, `${action} (${tool})`);
      const dock = [...$('bay-tool').children].find(u => u.dataset.name === tool);
      dock.classList.add('picked');
      const g = spawn('tool', tool, center(dock.querySelector('.bob')));
      await fly(g, agent._p, { s: 0.5, dur: 900, arc: 80 });
      g.classList.add('merge');
      ring(agent._p, COLOR('tool'));
      setTimeout(() => g.remove(), 450);
      st.tools++;
      log('act', `<b>${esc(tool)}</b> · ${esc(action)}`);
      await wait(600);
      log('result', esc(result), p.err ? 'bad' : '');
      spend(rand(800, 1300));
      await wait(p.err ? 1100 : 800);

      await step(3);
      stage(4, p.c);
      if (critic) { critic.classList.add('work'); ring(critic._p, COLOR('critic')); }
      if (p.err) {
        st.errs[p.err] = (st.errs[p.err] || 0) + 1;
        rule('repeat', `error ${p.err} seen ${st.errs[p.err]} of 3`, st.errs[p.err] >= 3 ? 'hit' : 'warn');
      }
      log(critic ? 'critic' : 'check', esc(p.c), p.ok ? 'ok' : (p.err || p.replan || critic ? 'bad' : ''));
      spend(rand(300, 500));
      await wait(1200);
      if (critic) critic.classList.remove('work');

      // Context window: past 75%, older passes are summarised to make room.
      if (st.ctx > m.ctx * 0.75) {
        const old = [...$('lp-log').children].slice(1, -1).filter(el => !el.classList.contains('folded'));
        if (old.length) {
          old.forEach(el => el.classList.add('folded'));
          st.folds++;
          st.ctx = Math.round(st.ctx * 0.35);
          spend(0);
          log('memory', `context ${Math.round(st.peak / m.ctx * 100)}% full: ${old.length} older pass${old.length > 1 ? 'es' : ''} summarised to make room`, 'ok');
          setPhase(4, 'The scratchpad was nearly full, so older passes were summarised.', 'Context is finite. Long loops keep a summary, not every word.');
          await wait(1300);
        }
      }

      if (p.ok) { stopped = 'goal'; break; }
      if (p.err && st.errs[p.err] >= 3) { stopped = 'repeat'; break; }
      if (i + 1 >= m.max) { stopped = 'max'; break; }
      await step(4);
    }

    // Stop
    rule(stopped, null, 'hit');
    document.querySelectorAll('.lp-st').forEach(s => s.classList.remove('on'));
    setRing(4);
    if (stopped === 'goal') {
      setPhase(4, 'Stop rule fired: goal met. The loop ends.', 'The agent stops because the check passed, not because it ran out of ideas.');
      $('lp-now').textContent = 'Goal met';
      ring(agent._p, COLOR('agent'));
    } else {
      setPhase(4, 'Stop rule fired: the same error 3 times. The loop hands over to a person.', 'Without this rule it would keep retrying, and spending, all night.');
      $('lp-now').textContent = 'Stopped: handing over';
      agent.classList.add('flash');
      if (m.handoff) {
        const [tool, action, result] = m.handoff;
        newPass('Hand-over');
        const dock = [...$('bay-tool').children].find(u => u.dataset.name === tool);
        dock.classList.add('picked');
        const g = spawn('tool', tool, center(dock.querySelector('.bob')));
        await fly(g, agent._p, { s: 0.5, dur: 900, arc: 80 });
        g.remove();
        st.tools++;
        log('act', `<b>${esc(tool)}</b> · ${esc(action)}`);
        await wait(500);
        log('result', esc(result), 'ok');
        rule('human', 'handed over with the full trace', 'hit');
      }
      agent.classList.remove('flash');
    }
    await wait(600);
    document.querySelectorAll('#sw-stepper li').forEach(li => li.classList.add('done'));

    const R = m.result, label = RULES.find(r => r[0] === stopped)[1];
    const res = $('sw-results');
    res.innerHTML = `<div class="sw-res-top"><span class="sw-res-badge">SIMULATED LOOP · ${stopped === 'goal' ? 'GOAL MET' : 'STOPPED SAFELY'}</span><span style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">${esc(P.name)} · ${esc(m.title)}</span></div>
      <div class="sw-res-head">${esc(R.headline)}</div>
      <div class="sw-kpis">${R.kpis.map(([v, l], i) => `<div class="sw-kpi" style="animation-delay:${i * 0.08}s"><strong data-v="${esc(v)}">${esc(v)}</strong><span>${esc(l)}</span></div>`).join('')}</div>
      <div class="sw-res-grid">
        <div class="sw-res-box"><h4>Why it stopped</h4><p class="lp-res-p"><b>${esc(label)}.</b> ${esc(R.why)}</p></div>
        <div class="sw-res-box" style="animation-delay:.08s"><h4>The pattern: ${esc(P.name)}</h4><p class="lp-res-p">${esc(P.desc)}</p></div>
        <div class="sw-res-box" style="animation-delay:.16s"><h4>Loop stats</h4><div class="sw-stats">
          <div><b>${st.passes}</b>passes</div><div><b>${st.tools}</b>tool calls</div><div><b>${st.tokens.toLocaleString('en-US')}</b>tokens</div>
          <div><b>${Math.round(st.peak / m.ctx * 100)}%</b>context peak</div><div><b>${st.folds}</b>summaries</div><div><b>$${(st.tokens * 0.000006).toFixed(3)}</b>model cost</div></div></div>
      </div>`;
    res.classList.add('landed');
    follow(res);
    res.querySelectorAll('.sw-kpi strong').forEach(K.countUp);
    kick.disabled = false;
    kick.querySelector('span').textContent = 'Run again';
    running = false;
  }

  async function launch() {
    try { await run(); } catch (e) { if (e !== K.ABORT) { console.error(e); resetStage(); } }
  }

  function init() {
    K.setSky($('sw-sky'));
    $('lp-progress').style.strokeDasharray = CIRC;
    buildSelect();
    loadMission();
    resetStage();
    $('sw-objective').addEventListener('change', () => { loadMission(); resetStage(); });
    $('sw-kick').addEventListener('click', launch);
    $('sw-reset').addEventListener('click', resetStage);
    $('sw-speed').addEventListener('change', e => { K.setSpeed(+e.target.value); });
    // Paths are measured from the layout, so a width change mid-run restarts the stage.
    let rt, lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; if (running) resetStage(); } }, 300);
    });
  }
  return { init };
})();

document.addEventListener('DOMContentLoaded', Loops.init);
