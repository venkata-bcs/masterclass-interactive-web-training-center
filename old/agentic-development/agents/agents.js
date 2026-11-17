// AI Agents explainer: equip one agent with orders, gear and limits (columns A and B), then run the
// same request as a plain model call, a fixed workflow and an agent (three lanes) and compare them.
const Agents = (() => {
  // ---------- Task library ----------
  // trace steps: think | act (tool, what, result, surprise?) | guard (text, blocked?) | hitl (question, what happens on no)
  const TASKS = [
    {
      domain: 'Retail', agent: 'Care Agent',
      title: 'Sort out a “delivered” parcel that never arrived',
      prompt: 'Order #4471 says delivered, but I never got it. Please sort it out.',
      role: 'Customer-care agent for an online store. Resolve delivery problems end to end, within the refund policy.',
      gear: { tool: ['Order System', 'Courier API', 'Reship & Refund', 'Email & SMS'], knowledge: ['Refund Policy', 'Courier SLAs'], memory: ['Customer History'] },
      guard: [['Refund limit', 'Refunds over ₹5,000 need a person'], ['Privacy', 'Never share another customer’s details']],
      llm: 'So sorry about this! Parcels sometimes show as delivered early. Please wait 24 hours, check with neighbours, then contact support.',
      llmNote: 'Polite, but it cannot see order #4471 and cannot act. Nothing is fixed.',
      flow: ['Look up order', 'Check courier status', 'Send delay email'], failAt: 1,
      surprise: 'Courier says “delivered”, the customer has nothing',
      flowNote: 'No branch for “delivered but not received”. It stopped and opened a ticket for a person.',
      trace: [
        ['think', 'Find the order and where the parcel actually went.'],
        ['act', 'Order System', 'Look up order #4471', 'Shipped 3 days ago, ₹2,340, prepaid'],
        ['act', 'Courier API', 'Get tracking', 'Marked delivered yesterday at 14:02', true],
        ['think', 'Delivered but not received: check the proof of delivery.'],
        ['act', 'Courier API', 'Fetch delivery photo and GPS', 'Photo shows a different door, GPS 1.2 km away'],
        ['think', 'A misdelivery. The policy allows a free reship.'],
        ['guard', 'Refund limit: ₹2,340 is under ₹5,000, no person needed'],
        ['act', 'Reship & Refund', 'Reship and open a courier claim', 'Replacement ships today, claim #C-881 filed'],
        ['act', 'Email & SMS', 'Update the customer', 'Customer told, with the new tracking link']
      ],
      agentNote: 'Found the real problem, fixed it within policy and told the customer.'
    },
    {
      domain: 'HR', agent: 'HR Helpdesk Agent',
      title: 'Plan two weeks of leave in December',
      prompt: 'How much leave do I have left, and can I take two weeks off in the second half of December?',
      role: 'HR helpdesk agent. Answer leave questions from real records and raise requests, within the leave policy.',
      gear: { tool: ['HRIS', 'Leave Calendar', 'Leave Request', 'Chat'], knowledge: ['Leave Policy', 'Holiday Calendar'], memory: ['Past Requests'] },
      guard: [['Privacy', 'Never reveal who else is on leave, or why'], ['Approval', 'Every request goes to the manager']],
      llm: 'Most companies give 18 to 24 days of annual leave. Check your balance in the HR portal and ask your manager about December.',
      llmNote: 'Generic numbers. It does not know this employee or this team.',
      flow: ['Look up balance', 'Check policy', 'Book Dec 15–26'], failAt: 2,
      surprise: 'Dec 15–26 already has 3 people off (team cap is 3)',
      flowNote: 'Tried to book blocked dates, was rejected by the calendar, and stopped.',
      trace: [
        ['think', 'Check the balance and the team calendar before promising anything.'],
        ['act', 'HRIS', 'Get leave balance', '14 days left, 2 carry over to January'],
        ['act', 'Leave Calendar', 'Check the team for Dec 15–26', 'Already 3 of 5 people off: the team cap', true],
        ['think', 'Those dates are full. Find another two-week window.'],
        ['act', 'Leave Calendar', 'Find open 10-day windows', 'Dec 1–12 and Jan 2–13 are open'],
        ['guard', 'Privacy: say the dates are full, not who is off or why'],
        ['act', 'Leave Request', 'Raise a request for Dec 1–12', 'Draft sent to the manager for approval'],
        ['act', 'Chat', 'Reply to the employee', '“You have 14 days. Dec 15–26 is full, so I have requested Dec 1–12.”']
      ],
      agentNote: 'Used the real balance, found open dates, raised the request and kept colleagues’ details private.'
    },
    {
      domain: 'Railways', agent: 'Passenger Agent',
      title: 'Get a passenger home after a cancelled train',
      prompt: 'My 6 pm train from Delhi to Lucknow is cancelled. Get me there tonight.',
      role: 'Rail passenger-care agent. Rebook disrupted passengers on the best available option, within fare rules.',
      gear: { tool: ['PNR Lookup', 'Seat Availability', 'Rebooking', 'Refunds'], knowledge: ['Fare Rules', 'Connections Map'], memory: ['Passenger Preferences'] },
      guard: [['Fare OK', 'Extra fare needs the passenger’s OK'], ['Seat first', 'Never rebook without a confirmed seat']],
      llm: 'Sorry to hear that! You can check other trains on the railway website or ask at the station enquiry counter.',
      llmNote: 'Pointed to a website. The passenger is still stuck on the platform.',
      flow: ['Check PNR', 'Find next direct train', 'Rebook'], failAt: 1,
      surprise: 'The next direct train is full, waitlist 140',
      flowNote: 'Put the passenger on a waitlist of 140. They will not travel tonight.',
      trace: [
        ['think', 'Check the booking, then look for any seat tonight.'],
        ['act', 'PNR Lookup', 'Read PNR 482-1937', 'Train cancelled, AC 3-tier, 1 passenger'],
        ['act', 'Seat Availability', 'Next direct train', 'Full, waitlist 140', true],
        ['think', 'Direct is hopeless. Try a connection.'],
        ['act', 'Seat Availability', 'Search via Kanpur', '7:10 pm to Kanpur and 1:05 am to Lucknow, both have seats'],
        ['hitl', 'The connection costs ₹420 more. Book it?', 'the agent books a bus at no extra cost instead'],
        ['act', 'Rebooking', 'Book both legs', 'Confirmed, arrives 2:30 am'],
        ['act', 'Refunds', 'Refund the cancelled ticket', '₹1,180 refund started']
      ],
      agentNote: 'Found a connection the fixed path never looks for, and asked before charging more.'
    },
    {
      domain: 'Stock Market', agent: 'Broker Support Agent',
      title: 'Explain a rejected stock order',
      prompt: 'My buy order for 200 shares was rejected this morning. Why, and what can I do?',
      role: 'Broker support agent. Explain orders and account issues from real data. Never trades on its own.',
      gear: { tool: ['Order Book', 'Margin Check', 'Market Status', 'Order Entry'], knowledge: ['Exchange Rules', 'Order Types'], memory: ['Client Preferences'] },
      guard: [['No trading', 'Never place a trade without the client’s explicit OK'], ['No tips', 'No buy or sell advice']],
      llm: 'Orders can be rejected for many reasons, such as low funds or market conditions. Please contact your broker for details.',
      llmNote: 'A list of maybes. No actual reason for this order.',
      flow: ['Look up order', 'Check funds', 'Send “please retry”'], failAt: 1,
      surprise: 'Funds were fine: the stock was locked at its upper circuit',
      flowNote: 'Funds passed, so it said “please retry”. The retry fails the same way.',
      trace: [
        ['think', 'Find the order and its rejection code.'],
        ['act', 'Order Book', 'Get today’s orders', 'Buy 200 at ₹412, rejected at 9:41 am: price band'],
        ['act', 'Margin Check', 'Check funds', 'Enough margin: not the cause'],
        ['act', 'Market Status', 'Check the stock', 'Hit its 20% upper circuit at 9:38 am', true],
        ['think', 'The circuit limit caused it. Explain, offer options, do not trade.'],
        ['guard', 'Blocked: placing an order for the client without their OK', true],
        ['act', 'Order Entry', 'Prepare a draft order for the client to review', 'Draft ready, not placed']
      ],
      agentNote: 'Found the real reason, explained it and left the decision with the client.'
    }
  ];
  const GEAR_KINDS = ['tool', 'knowledge', 'memory'];

  // ---------- State ----------
  const K = AgentKit;
  const { $, rand, esc, wait, check, makeUnit, spawn, fly, ring, center, COLOR, setPhase, follow, line } = K;
  let running = false, task;

  const lane = name => document.querySelector(`.ag-lane[data-lane="${name}"]`);
  function setLane(name, cls, text) {
    const r = lane(name);
    r.classList.remove('live', 'ok', 'alert');
    if (cls) r.classList.add(cls);
    r.querySelector('.sw-state').textContent = text;
  }
  function verdict(name, ok, text) {
    const v = $('verdict-' + name);
    v.className = 'ag-verdict show ' + (ok ? 'good' : 'bad');
    v.innerHTML = `<b>${ok ? '✓' : '✗'}</b> ${esc(text)}`;
  }
  const station = (label, cls = '') => `<div class="ag-st ${cls}"><span>${esc(label)}</span></div>`;

  // ---------- Setup / reset ----------
  function buildSelect() {
    const groups = {};
    TASKS.forEach((t, i) => { (groups[t.domain] = groups[t.domain] || []).push(`<option value="${i}">${esc(t.title)}</option>`); });
    $('sw-objective').innerHTML = Object.entries(groups).map(([d, o]) => `<optgroup label="${esc(d)}">${o.join('')}</optgroup>`).join('');
  }
  function loadTask() {
    task = TASKS[+$('sw-objective').value];
    $('sw-prompt').value = task.prompt;
  }
  function resetStage() {
    K.newRun();
    running = false;
    const t = task;
    $('bay-role').innerHTML = '';
    $('bay-role').appendChild(makeUnit('role', 'Sealed orders'));
    $('ag-role').textContent = t.role;
    GEAR_KINDS.forEach(k => { $('bay-' + k).innerHTML = ''; t.gear[k].forEach(n => $('bay-' + k).appendChild(makeUnit(k, n))); });
    $('bay-guard').innerHTML = '';
    t.guard.forEach(([n, full]) => { const u = makeUnit('guard', n); u.title = full; $('bay-guard').appendChild(u); });
    document.querySelectorAll('.sw-bay .op').forEach(u => u.classList.remove('picked', 'launched'));
    $('ag-slot').innerHTML = '';
    $('ag-name').textContent = 'No agent yet';
    $('ag-chips').innerHTML = '';
    document.querySelectorAll('.ag-part').forEach(p => p.classList.remove('on'));
    $('track-llm').innerHTML = station('Prompt') + station('Model') + station('Answer');
    $('track-flow').innerHTML = t.flow.map((s, i) => station(`${i + 1}. ${s}`)).join('');
    $('track-agent').innerHTML = station('Think', 'home') + [...new Set(t.trace.filter(s => s[0] === 'act').map(s => s[1]))]
      .map(n => `<div class="ag-st tool" data-tool="${esc(n)}"><span>${esc(n)}</span></div>`).join('');
    ['llm', 'flow', 'agent'].forEach(n => { $('feed-' + n).innerHTML = ''; $('verdict-' + n).className = 'ag-verdict'; setLane(n, '', 'idle'); });
    document.querySelectorAll('.ag-st').forEach(s => s.classList.remove('on', 'did', 'bad'));
    $('sw-results').classList.remove('landed');
    $('sw-results').innerHTML = '<div class="sw-results-empty"><span class="sw-col-num">C</span><div><h3>Side by side</h3><p>The three approaches are compared here once all three have run.</p></div></div>';
    document.querySelectorAll('#sw-stepper li').forEach(li => li.classList.remove('on', 'done'));
    $('sw-caption').innerHTML = '<span class="sw-caption-what">Pick a task and press <b>Brief the Agent</b>.</span><span class="sw-caption-why">Same request, three approaches. Watch where each one breaks.</span>';
    const kick = $('sw-kick');
    kick.disabled = false;
    kick.querySelector('span').textContent = 'Brief the Agent';
  }

  // ---------- The run ----------
  async function mission() {
    if (running) return;
    resetStage();
    K.start();
    running = true;
    const t = task, kick = $('sw-kick');
    const prompt = $('sw-prompt').value.trim() || t.prompt;
    const stats = { llm: { calls: 1, tools: 0, tokens: rand(400, 700) }, flow: { calls: 0, tools: 0, tokens: 0 }, agent: { calls: 0, tools: 0, tokens: 0 } };
    kick.disabled = true;
    kick.querySelector('span').textContent = 'Agent at work…';

    // 0. Brief
    setPhase(0, `Request received: “${esc(prompt)}”`, 'All three approaches get exactly these words.');
    ring(center(kick), COLOR('cmd'));
    await wait(700);

    // 1. Equip: the agent appears at HQ and is issued its orders, gear and limits
    setPhase(1, 'A model becomes an agent when it is issued orders, gear and limits.', 'The model is the brain. Everything else is what makes it useful and safe.');
    const slot = $('ag-slot');
    follow(slot);
    const agent = spawn('agent', t.agent, center(slot), { big: true, s: 0.2 });
    ring(agent._p, COLOR('agent'));
    await fly(agent, center(slot), { s: 1.25, dur: 600, arc: 0 });
    document.querySelector('.ag-part[data-part="model"]').classList.add('on');
    $('ag-name').textContent = t.agent;
    await wait(300);
    for (const kind of ['role', ...GEAR_KINDS, 'guard']) {
      const row = document.querySelector(`#ag-dossier .sw-row[data-row="${kind}"]`);
      follow(row);
      row.classList.add('scan');
      await wait(250);
      const units = [...$('bay-' + kind).children];
      await Promise.all(units.map(async (u, i) => {
        u.classList.add('picked');
        const f = spawn(kind, u.dataset.name, center(u.querySelector('.bob')));
        u.classList.add('launched');
        await fly(f, agent._p, { s: 0.4, dur: 1000, arc: 60, delay: i * 120 });
        f.classList.add('merge');
        ring(agent._p, COLOR(kind));
        const chip = document.createElement('span');
        chip.className = `sw-chip c-${kind}`;
        chip.textContent = kind === 'role' ? 'Orders: ' + t.agent : u.dataset.name;
        $('ag-chips').appendChild(chip);
        setTimeout(() => f.remove(), 450);
      }));
      document.querySelector(`.ag-part[data-part="${kind === 'role' || kind === 'guard' ? kind : 'gear'}"]`).classList.add('on');
      row.classList.remove('scan');
      await wait(150);
    }

    // 2. Plain model call
    setPhase(2, 'First, a plain model call: one prompt in, one answer out.', 'It only knows what it was trained on. It cannot look anything up or do anything.');
    const llmTrack = [...$('track-llm').children];
    follow(lane('llm'));
    setLane('llm', 'live', 'running');
    const llm = spawn('llm', 'Model', center(llmTrack[0]), { s: 0.2 });
    await fly(llm, center(llmTrack[0]), { s: 0.8, dur: 400, arc: 0 });
    line('feed-llm', `<span class="k">prompt</span> ${esc(prompt)}`);
    for (let i = 1; i < llmTrack.length; i++) {
      llmTrack[i - 1].classList.add('did');
      await fly(llm, center(llmTrack[i]), { dur: 650, arc: 20 });
      llmTrack[i].classList.add('on');
      await wait(400);
    }
    line('feed-llm', `<span class="k">answer</span> ${esc(t.llm)}`);
    await wait(700);
    setLane('llm', 'alert', 'nothing done');
    verdict('llm', false, t.llmNote);
    await wait(900);

    // 3. Fixed workflow
    setPhase(3, 'Next, a fixed workflow: the same coded steps, every time.', 'Reliable while the world matches the script. The first surprise stops it.');
    const flowTrack = [...$('track-flow').children];
    follow(lane('flow'));
    setLane('flow', 'live', 'running');
    const flow = spawn('flow', 'Workflow', center(flowTrack[0]), { s: 0.2 });
    await fly(flow, center(flowTrack[0]), { s: 0.8, dur: 400, arc: 0 });
    for (const [i, step] of t.flow.entries()) {
      if (i) await fly(flow, center(flowTrack[i]), { dur: 650, arc: 20 });
      flowTrack[i].classList.add('on');
      stats.flow.tools++;
      line('feed-flow', `<span class="k">step ${i + 1}</span> ${esc(step)}`);
      await wait(500);
      if (i === t.failAt) {
        flowTrack[i].classList.add('bad');
        flow.classList.add('flash');
        line('feed-flow', `<span class="k">surprise</span> ${esc(t.surprise)}`, 'bad');
        await wait(700);
        line('feed-flow', '<span class="k">stop</span> no coded branch for this case', 'bad');
        break;
      }
      flowTrack[i].classList.add('did');
      line('feed-flow', '✓ done', 'ok');
    }
    await wait(500);
    setLane('flow', 'alert', 'broken');
    verdict('flow', false, t.flowNote);
    await wait(900);

    // 4. Agent: look, decide, act, repeat
    setPhase(4, 'Now the agent. It looks, decides the next step, acts and checks the result.', 'Its path is not coded in advance. It depends on what it finds.');
    const agentTrack = $('track-agent'), home = agentTrack.querySelector('.home');
    follow(lane('agent'));
    setLane('agent', 'live', 'working');
    await fly(agent, center(home), { s: 0.8, dur: 1100, arc: 90 });
    home.classList.add('on');
    let skip = false;
    for (const [kind, a, b, c, d] of t.trace) {
      if (skip && kind === 'act') { skip = false; continue; }
      if (kind === 'think') {
        stats.agent.calls++;
        stats.agent.tokens += rand(900, 1600);
        if (agent._p.x !== center(home).x) await fly(agent, center(home), { dur: 600, arc: 30 });
        agent.classList.add('work');
        setPhase(4, `<b>Think:</b> ${esc(a)}`, 'The model decides the next step from what it has seen so far.');
        line('feed-agent', `<span class="k">think</span> ${esc(a)}`, '', 7);
        await wait(900);
        agent.classList.remove('work');
      } else if (kind === 'act') {
        stats.agent.calls++;
        stats.agent.tools++;
        stats.agent.tokens += rand(600, 1200);
        const st = agentTrack.querySelector(`[data-tool="${CSS.escape(a)}"]`);
        await fly(agent, center(st), { dur: 650, arc: 30 });
        st.classList.add('on');
        ring(center(st), COLOR('tool'));
        setPhase(4, `<b>Act:</b> ${esc(b)} with ${esc(a)}.`, d ? 'A surprise. The workflow stopped here; the agent adapts.' : 'Every tool call returns a real result the agent can read.');
        line('feed-agent', `<span class="k">act</span> <b>${esc(a)}</b> · ${esc(b)}`, '', 7);
        await wait(550);
        line('feed-agent', `<span class="k">${d ? 'surprise' : 'result'}</span> ${esc(c)}`, d ? 'bad' : '', 7);
        if (d) st.classList.add('bad');
        await wait(d ? 1100 : 650);
        st.classList.add('did');
      } else if (kind === 'guard') {
        setPhase(4, b ? 'A guardrail blocks the action.' : 'A guardrail checks the action first.', 'Limits are checked on every action, not just at the end.');
        if (b) agent.classList.add('flash');
        line('feed-agent', `<span class="k">${b ? 'BLOCKED' : 'guard'}</span> ${esc(a.replace(/^Blocked: /, ''))}`, b ? 'bad' : 'ok', 7);
        ring(agent._p, COLOR('guard'));
        await wait(1100);
        agent.classList.remove('flash');
      } else if (kind === 'hitl') {
        setPhase(4, `<b>Ask a person:</b> ${esc(a)}`, 'Spending more of the customer’s money is their call, not the agent’s.');
        const ln = line('feed-agent', `<span class="k">ask</span> ${esc(a)} <span class="ag-ask"><button type="button" class="yes">Yes</button><button type="button" class="no">No</button><i></i></span>`, '', 7);
        const ok = await new Promise(res => {
          let left = 5;
          const tick = setInterval(() => { left--; ln.querySelector('i').textContent = `auto-yes in ${left}s`; if (left <= 0) { clearInterval(tick); res(true); } }, 1000 / K.speed());
          ln.querySelector('i').textContent = `auto-yes in ${left}s`;
          ln.querySelector('.yes').onclick = () => { clearInterval(tick); res(true); };
          ln.querySelector('.no').onclick = () => { clearInterval(tick); res(false); };
        });
        check();
        ln.querySelector('.ag-ask').remove();
        line('feed-agent', ok ? '✓ approved by the customer' : `✗ declined: ${esc(b)}`, ok ? 'ok' : 'bad', 7);
        skip = !ok;
        await wait(700);
      }
    }
    await fly(agent, center(home), { dur: 600, arc: 30 });
    setLane('agent', 'ok', 'done');
    verdict('agent', true, t.agentNote);
    await wait(500);

    // Compare
    setPhase(4, 'Side by side: each approach has a job it is best at.', 'Use the simplest one that works. Agents earn their cost when the path depends on what they find.');
    document.querySelectorAll('#sw-stepper li').forEach(li => li.classList.add('done'));
    const S = stats, cell = (v, ok) => `<td class="${ok ? 'y' : 'n'}">${ok ? '✓' : '✗'} ${v}</td>`;
    const res = $('sw-results');
    res.innerHTML = `<div class="sw-res-top"><span class="sw-res-badge">SIMULATED RUN · COMPARED</span><span style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">${esc(t.domain)} · ${esc(t.title)}</span></div>
      <div class="sw-res-head">Only the agent finished the job, and it cost the most to run.</div>
      <div class="ag-table-wrap"><table class="ag-table">
        <thead><tr><th></th><th><i class="dot c-llm"></i>Plain model</th><th><i class="dot c-flow"></i>Fixed workflow</th><th><i class="dot c-agent"></i>Agent</th></tr></thead>
        <tbody>
          <tr><th>Sees live data</th>${cell('no', false)}${cell('yes', true)}${cell('yes', true)}</tr>
          <tr><th>Takes action</th>${cell('no', false)}${cell('coded steps only', true)}${cell('chooses its steps', true)}</tr>
          <tr><th>Handles the surprise</th>${cell('no', false)}${cell('no', false)}${cell('yes', true)}</tr>
          <tr><th>Predictable</th>${cell('mostly', true)}${cell('fully', true)}${cell('varies, needs limits', false)}</tr>
          <tr><th>Model calls · tool calls</th><td>${S.llm.calls} · 0</td><td>0 · ${S.flow.tools}</td><td>${S.agent.calls} · ${S.agent.tools}</td></tr>
          <tr><th>Tokens</th><td>${S.llm.tokens.toLocaleString('en-US')}</td><td>0</td><td>${S.agent.tokens.toLocaleString('en-US')}</td></tr>
          <tr class="ag-outcome"><th>This task</th><td>${esc(t.llmNote)}</td><td>${esc(t.flowNote)}</td><td>${esc(t.agentNote)}</td></tr>
        </tbody>
      </table></div>`;
    res.classList.add('landed');
    follow(res);
    kick.disabled = false;
    kick.querySelector('span').textContent = 'Run again';
    running = false;
  }

  async function launch() {
    try { await mission(); } catch (e) { if (e !== K.ABORT) { console.error(e); resetStage(); } }
  }

  function init() {
    K.setSky($('sw-sky'));
    buildSelect();
    loadTask();
    resetStage();
    $('sw-objective').addEventListener('change', () => { loadTask(); resetStage(); });
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

document.addEventListener('DOMContentLoaded', Agents.init);
