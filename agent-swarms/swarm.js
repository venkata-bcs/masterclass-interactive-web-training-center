// Agent Swarm simulator: a Kick-Off agent picks skills, tools and memory (column A),
// assembles agents plus planner / tester / exit checker (column B), flies the swarm in
// formation through the control tower (column C) and lands the results (panel D).
const Swarm = (() => {
  // ---------- Scenario library ----------
  const INDUSTRIES = {
    retail: {
      label: 'Retail',
      pools: {
        skill: ['Demand Forecasting', 'Promo Planning', 'Price Elasticity', 'Customer Segmentation', 'Recommendation', 'Fraud Scoring'],
        tool: ['POS Data API', 'Inventory ERP', 'Supplier Portal', 'CRM', 'Email & SMS', 'Returns System'],
        memory: ['3-Year Sales History', 'Store Profiles', 'Customer 360', 'Fraud Patterns', 'Brand Guidelines']
      },
      objectives: [
        {
          title: 'Cut festive-season stock-outs by 30%',
          prompt: 'Cut stock-outs by 30% across our 120 stores before the festive season, without raising inventory cost.',
          pick: { skill: ['Demand Forecasting', 'Promo Planning', 'Price Elasticity'], tool: ['POS Data API', 'Inventory ERP', 'Supplier Portal'], memory: ['3-Year Sales History', 'Store Profiles'] },
          agents: [['Forecaster', 'predicts demand per store and SKU'], ['Replenisher', 'raises purchase orders'], ['Pricer', 'tunes markdowns']],
          plan: ['Pull 3 years of POS sales for 120 stores', 'Forecast festive demand per SKU', 'Compare forecast with stock on hand', 'Draft purchase orders and markdowns'],
          tests: ['Forecast error under 12%', 'No purchase order over budget', 'Every store covered'],
          exit: 'Projected stock-outs down 30% or more, within budget',
          hitl: 'Approve ₹4.2 Cr of purchase orders across 38 suppliers?',
          guard: 'purchase order to an unapproved supplier',
          result: { headline: 'Stock-outs projected down 34% for the festive season', kpis: [['-34%', 'Stock-outs'], ['+1.8%', 'Inventory cost'], ['6 hrs', 'To plan (was 3 weeks)'], ['18,400', 'SKUs forecast']], deliv: ['Store-by-store replenishment plan', '38 purchase orders ready to send', 'Markdown calendar for slow movers'] }
        },
        {
          title: 'Personalise offers for 2M loyalty members',
          prompt: 'Personalise festive offers for our 2 million loyalty members and lift repeat purchases.',
          pick: { skill: ['Customer Segmentation', 'Recommendation', 'Promo Planning'], tool: ['CRM', 'Email & SMS', 'POS Data API'], memory: ['Customer 360', 'Brand Guidelines'] },
          agents: [['Segmenter', 'groups members by behaviour'], ['Curator', 'picks the best offer per member'], ['Copywriter', 'writes on-brand messages']],
          plan: ['Build segments from 2M member profiles', 'Match offers to each segment', 'Write messages in the brand voice', 'Schedule sends by channel'],
          tests: ['Every offer inside margin rules', 'Messages pass the brand-tone check', 'Opt-outs respected'],
          exit: 'Every eligible member has one offer and one message',
          hitl: 'Approve 14 offer variants and the send schedule?',
          guard: 'message that used a member’s health data',
          result: { headline: 'Personalised offers ready for 1.96M members', kpis: [['1.96M', 'Members reached'], ['+11%', 'Predicted repeat purchases'], ['14', 'Offer variants'], ['2 hrs', 'Campaign build time']], deliv: ['Segment map with 9 audiences', '14 offer variants with margin check', 'Channel send schedule'] }
        },
        {
          title: 'Stop return fraud without slowing honest customers',
          prompt: 'Detect and stop return fraud across all stores without slowing down honest customers.',
          pick: { skill: ['Fraud Scoring', 'Customer Segmentation'], tool: ['Returns System', 'POS Data API', 'CRM'], memory: ['Fraud Patterns', 'Customer 360'] },
          agents: [['Detective', 'scores each return for risk'], ['Profiler', 'checks customer history'], ['Resolver', 'approves or routes to staff']],
          plan: ['Stream today’s returns from all stores', 'Score each return against fraud patterns', 'Check the customer’s purchase history', 'Auto-approve low risk, route high risk'],
          tests: ['Honest returns approved in under 2 min', 'Known fraud cases caught in replay', 'Every decision has a reason code'],
          exit: 'Every return has a decision and a reason',
          hitl: 'Block refunds for 3 accounts linked to a wardrobing ring?',
          guard: 'decision that used the customer’s age',
          result: { headline: 'Return-fraud losses projected down 41%', kpis: [['41%', 'Fraud caught'], ['92%', 'Honest returns auto-approved'], ['48 s', 'Average decision time'], ['3', 'Fraud rings uncovered']], deliv: ['Risk score on every return', 'Case files for 3 suspected rings', 'Store-staff alert playbook'] }
        }
      ]
    },
    logistics: {
      label: 'Logistics',
      pools: {
        skill: ['Route Optimisation', 'ETA Prediction', 'Load Planning', 'Anomaly Detection', 'Carrier Negotiation', 'Demand Sensing'],
        tool: ['Fleet Telematics', 'TMS', 'Weather API', 'Port Status Feed', 'Maps & Traffic', 'IoT Sensors'],
        memory: ['Lane History', 'Carrier Contracts', 'Driver Rules', 'Cold-Chain Specs', 'Customer SLAs']
      },
      objectives: [
        {
          title: 'Re-route 400 trucks around a port strike',
          prompt: 'A port strike starts tonight. Re-route our 400 trucks and keep on-time delivery above 95%.',
          pick: { skill: ['Route Optimisation', 'ETA Prediction', 'Carrier Negotiation'], tool: ['Port Status Feed', 'Fleet Telematics', 'Maps & Traffic'], memory: ['Lane History', 'Customer SLAs', 'Driver Rules'] },
          agents: [['Navigator', 'finds new routes'], ['Dispatcher', 'reassigns trucks and drivers'], ['Broker', 'books backup carriers']],
          plan: ['Read live port status and truck positions', 'Find alternate ports and routes', 'Reassign drivers within legal hours', 'Send customers new ETAs'],
          tests: ['No driver over legal hours', 'Every SLA customer has a new ETA', 'Extra cost under 8%'],
          exit: 'All 400 trucks have a confirmed route',
          hitl: 'Approve a ₹38 L premium for 22 backup carriers?',
          guard: 'route through a restricted hazmat zone',
          result: { headline: 'All 400 trucks re-routed in 19 minutes', kpis: [['96.4%', 'On-time delivery'], ['+6.1%', 'Extra cost'], ['19 min', 'Re-plan time'], ['1,240', 'Customers notified']], deliv: ['A new route for every truck', '22 backup carrier bookings', 'Customer ETA notices sent'] }
        },
        {
          title: 'Cut last-mile cost per parcel by 15%',
          prompt: 'Cut our last-mile cost per parcel by 15% in our three metro cities.',
          pick: { skill: ['Route Optimisation', 'Load Planning', 'Demand Sensing'], tool: ['TMS', 'Maps & Traffic', 'Fleet Telematics'], memory: ['Lane History', 'Driver Rules'] },
          agents: [['Forecaster', 'predicts parcels per pin code'], ['Packer', 'fills vans to capacity'], ['Router', 'builds the shortest routes']],
          plan: ['Forecast tomorrow’s parcels per pin code', 'Group parcels into van loads', 'Build routes around traffic', 'Publish routes to driver apps'],
          tests: ['Vans loaded to 90% or more', 'No route breaks a delivery window', 'Driver breaks respected'],
          exit: 'Cost per parcel down 15% or more in simulation',
          hitl: 'Switch 3 depots to the new routing plan from Monday?',
          guard: 'route that made a driver skip a break',
          result: { headline: 'Cost per parcel down 17% in simulation', kpis: [['-17%', 'Cost per parcel'], ['93%', 'Van fill rate'], ['-21%', 'Kilometres driven'], ['-19%', 'CO₂']], deliv: ['Daily routes for 3 cities', 'Depot roll-out plan', 'Route packs for driver apps'] }
        },
        {
          title: 'Predict cold-chain failures before spoilage',
          prompt: 'Warn us before any refrigerated load of vaccines or food is about to spoil, and fix it in time.',
          pick: { skill: ['Anomaly Detection', 'ETA Prediction'], tool: ['IoT Sensors', 'Fleet Telematics', 'Weather API'], memory: ['Cold-Chain Specs', 'Lane History'] },
          agents: [['Sentinel', 'watches temperature sensors'], ['Predictor', 'forecasts failure risk'], ['Responder', 'dispatches fixes']],
          plan: ['Stream sensor data from 900 reefers', 'Spot early-warning patterns', 'Predict which loads will breach limits', 'Send the nearest crew or a swap truck'],
          tests: ['Alerts at least 45 min before a breach', 'False alarms under 5%', 'Every alert has an owner'],
          exit: 'No at-risk load without an action',
          hitl: 'Divert reefer KA-09 with ₹1.1 Cr of vaccines to the backup hub?',
          guard: 'alert being closed without evidence',
          result: { headline: 'Spoilage risk caught 52 minutes early on average', kpis: [['52 min', 'Warning lead time'], ['₹6.8 Cr', 'Spoilage prevented'], ['3.2%', 'False alarms'], ['900', 'Reefers watched']], deliv: ['Live risk board for 900 reefers', 'Repair-crew dispatch rules', 'Monthly spoilage report'] }
        }
      ]
    },
    finance: {
      label: 'Finance',
      pools: {
        skill: ['Reconciliation', 'Anomaly Detection', 'Financial Analysis', 'Regulatory Reporting', 'Credit Scoring', 'Document Reading'],
        tool: ['General Ledger', 'Bank Feeds', 'Core Banking', 'KYC Registry', 'Spreadsheet Engine', 'Document Vault'],
        memory: ['Chart of Accounts', 'Past Audit Findings', 'Sanctions Lists', 'Credit Policy', 'Client Financials']
      },
      objectives: [
        {
          title: 'Close the books 5 days faster',
          prompt: 'Close our monthly books 5 days faster with zero audit findings.',
          pick: { skill: ['Reconciliation', 'Anomaly Detection', 'Regulatory Reporting'], tool: ['General Ledger', 'Bank Feeds', 'Spreadsheet Engine'], memory: ['Chart of Accounts', 'Past Audit Findings'] },
          agents: [['Reconciler', 'matches bank and ledger'], ['Investigator', 'explains every mismatch'], ['Reporter', 'drafts the close pack']],
          plan: ['Pull the ledger and 14 bank feeds', 'Match 260k transactions', 'Explain and fix every break', 'Draft the close pack for the CFO'],
          tests: ['Every account reconciled to zero', 'Every adjustment has evidence', 'Close pack matches the ledger'],
          exit: 'Trial balance balanced and ready to sign off',
          hitl: 'Post 12 adjusting journal entries worth ₹2.3 Cr?',
          guard: 'posting into a locked accounting period',
          result: { headline: 'Books closed on day 3 instead of day 8', kpis: [['3 days', 'Close time'], ['97.6%', 'Auto-matched'], ['100%', 'Breaks explained'], ['0', 'Audit findings']], deliv: ['Reconciled ledger', 'Evidence for 12 adjustments', 'CFO close pack'] }
        },
        {
          title: 'Flag suspicious transactions in real time (AML)',
          prompt: 'Flag suspicious payments in real time and cut false alerts in half, without missing a sanctions hit.',
          pick: { skill: ['Anomaly Detection', 'Regulatory Reporting'], tool: ['Core Banking', 'KYC Registry', 'Bank Feeds'], memory: ['Sanctions Lists', 'Past Audit Findings'] },
          agents: [['Watcher', 'scores every payment'], ['Analyst', 'builds the case story'], ['Filer', 'drafts the regulator report']],
          plan: ['Stream payments as they happen', 'Score risk against sanctions and patterns', 'Build a case for high-risk alerts', 'Draft suspicious-activity reports'],
          tests: ['Scoring under 200 ms', 'Sanctions hits never missed', 'Each case has a full trail'],
          exit: 'Every high-risk alert has a reviewed case',
          hitl: 'File a suspicious-activity report for 4 linked accounts?',
          guard: 'customer PII sent to the language model unmasked',
          result: { headline: 'False alerts down 54%, with no missed sanctions hits', kpis: [['-54%', 'False alerts'], ['140 ms', 'Scoring speed'], ['312', 'Cases auto-drafted'], ['0', 'Sanctions misses']], deliv: ['Real-time risk scores', '312 ready-to-review cases', '4 draft regulator reports'] }
        },
        {
          title: 'Prepare a ₹50 Cr credit memo in one afternoon',
          prompt: 'Prepare the credit memo for a ₹50 Cr mid-market loan by this evening.',
          pick: { skill: ['Financial Analysis', 'Credit Scoring', 'Document Reading'], tool: ['Document Vault', 'Spreadsheet Engine', 'KYC Registry'], memory: ['Credit Policy', 'Client Financials'] },
          agents: [['Reader', 'extracts numbers from statements'], ['Modeller', 'models cash flows and ratios'], ['Writer', 'drafts the credit memo']],
          plan: ['Read 3 years of audited statements', 'Spread financials and compute ratios', 'Stress-test the cash flows', 'Draft the memo with a recommendation'],
          tests: ['Every number traced to a source page', 'Ratios inside policy or flagged', 'Memo follows the bank template'],
          exit: 'Memo complete with risk grade and covenants',
          hitl: 'Recommend approval at risk grade B+ with 2 covenants?',
          guard: 'memo quoting an unverified news rumour',
          result: { headline: 'Credit memo ready in 3.5 hours instead of 2 weeks', kpis: [['3.5 hrs', 'Turnaround'], ['640', 'Pages read'], ['100%', 'Numbers traced'], ['B+', 'Risk grade']], deliv: ['Financial spread with ratios', 'Stress-test scenarios', 'Credit memo draft'] }
        }
      ]
    },
    insurance: {
      label: 'Insurance',
      pools: {
        skill: ['Claims Triage', 'Damage Assessment', 'Fraud Detection', 'Risk Pricing', 'Document Reading', 'Customer Messaging'],
        tool: ['Policy Admin', 'Photo Analysis', 'Claims System', 'Garage Network', 'Payments', 'Third-Party Data'],
        memory: ['Policy Wordings', 'Claims History', 'Fraud Rings', 'Underwriting Rules', 'Repair Price Book']
      },
      objectives: [
        {
          title: 'Settle simple motor claims in under 1 hour',
          prompt: 'Settle simple motor claims in under one hour, from first photo to payment.',
          pick: { skill: ['Claims Triage', 'Damage Assessment', 'Customer Messaging'], tool: ['Photo Analysis', 'Claims System', 'Payments', 'Garage Network'], memory: ['Policy Wordings', 'Repair Price Book'] },
          agents: [['Triage', 'checks cover and simplicity'], ['Assessor', 'estimates damage from photos'], ['Settler', 'pays and updates the customer']],
          plan: ['Read the claim and the policy', 'Estimate damage from photos', 'Check price against the repair book', 'Pay or book a garage, then tell the customer'],
          tests: ['Cover confirmed before payment', 'Estimate within 10% of garage quote', 'Customer told at every step'],
          exit: 'Claim paid, or handed to a person with reasons',
          hitl: 'Pay ₹48,500 for claim MC-2291 (estimate confidence 94%)?',
          guard: 'payment to a bank account changed 2 hours ago',
          result: { headline: 'Simple claims settled in 42 minutes on average', kpis: [['42 min', 'Average settlement'], ['71%', 'Straight-through'], ['96%', 'Estimate accuracy'], ['4.8 / 5', 'Customer score']], deliv: ['Paid claims with audit trail', 'Garage bookings', 'Customer updates by SMS'] }
        },
        {
          title: 'Uncover organised fraud rings',
          prompt: 'Find organised fraud rings hidden in last year’s claims.',
          pick: { skill: ['Fraud Detection', 'Document Reading'], tool: ['Claims System', 'Third-Party Data', 'Photo Analysis'], memory: ['Claims History', 'Fraud Rings'] },
          agents: [['Linker', 'connects people, cars, garages'], ['Spotter', 'finds reused photos and papers'], ['Prosecutor', 'builds the evidence pack']],
          plan: ['Load 180k claims from last year', 'Link shared phones, addresses and garages', 'Find reused photos and documents', 'Build evidence packs for investigators'],
          tests: ['Every link backed by data', 'Known rings found again in replay', 'No one flagged for a protected trait'],
          exit: 'Every suspected ring has an evidence pack',
          hitl: 'Send 6 suspected rings (₹9.4 Cr exposure) to investigators?',
          guard: 'flag based on a claimant’s postcode alone',
          result: { headline: '6 fraud rings found, worth ₹9.4 Cr in exposure', kpis: [['6', 'Rings found'], ['₹9.4 Cr', 'Exposure'], ['180k', 'Claims scanned'], ['1,900 hrs', 'Analyst time saved']], deliv: ['Network map of 6 rings', 'Evidence packs', 'Watch-list rules for new claims'] }
        },
        {
          title: 'Quote small-business policies in minutes',
          prompt: 'Quote small-business insurance in minutes instead of days, within our underwriting rules.',
          pick: { skill: ['Risk Pricing', 'Document Reading', 'Customer Messaging'], tool: ['Policy Admin', 'Third-Party Data'], memory: ['Underwriting Rules', 'Claims History'] },
          agents: [['Collector', 'gathers business data'], ['Underwriter', 'scores the risk'], ['Quoter', 'prices and explains the quote']],
          plan: ['Read the application and documents', 'Add location and business data', 'Score risk against underwriting rules', 'Price the policy and draft the quote'],
          tests: ['Price inside approved rate bands', 'Every exclusion explained', 'Referral rules followed'],
          exit: 'Quote issued, or referred with a reason',
          hitl: 'Issue a quote above the auto-approval limit for a bakery chain?',
          guard: 'pricing that used the owner’s nationality',
          result: { headline: 'Quotes issued in 6 minutes instead of 3 days', kpis: [['6 min', 'Quote time'], ['78%', 'Auto-quoted'], ['-4 pts', 'Projected loss ratio'], ['+31%', 'Broker satisfaction']], deliv: ['Priced quote with explanation', 'Referral notes for edge cases', 'Broker-ready PDF'] }
        }
      ]
    }
  };
  const KINDS = ['skill', 'tool', 'memory'];

  // ---------- State ----------
  const $ = id => document.getElementById(id);
  const ABORT = new Error('swarm-abort');
  let ACTIVE = 0, CUR = -1, SPEED = 1, running = false;
  let sky, industry, scenario;
  const check = () => { if (CUR !== ACTIVE) throw ABORT; };
  const wait = async ms => { await new Promise(r => setTimeout(r, ms / SPEED)); check(); };
  const rand = (a, b) => Math.round(a + Math.random() * (b - a));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Drones ----------
  function droneSVG(fast) {
    const dur = fast ? '0.12s' : '0.9s';
    const rotor = (x, y, rev) => `<g transform="translate(${x} ${y})"><circle r="11" fill="currentColor" fill-opacity=".13" stroke="currentColor" stroke-opacity=".5" stroke-width="1.2"/>` +
      `<g><rect x="-10" y="-1.4" width="20" height="2.8" rx="1.4" fill="currentColor"/><rect x="-1.4" y="-10" width="2.8" height="20" rx="1.4" fill="currentColor" opacity=".45"/>` +
      `<animateTransform attributeName="transform" type="rotate" from="0" to="${rev ? -360 : 360}" dur="${dur}" repeatCount="indefinite"/></g></g>`;
    return `<svg viewBox="-34 -34 68 68" style="color:var(--c)">` +
      `<g stroke="#64748b" stroke-width="3.4" stroke-linecap="round"><line x1="-18" y1="-18" x2="18" y2="18"/><line x1="18" y1="-18" x2="-18" y2="18"/></g>` +
      rotor(-18, -18) + rotor(18, -18, 1) + rotor(-18, 18, 1) + rotor(18, 18) +
      `<rect x="-10" y="-10" width="20" height="20" rx="6" fill="#0b1020" stroke="currentColor" stroke-width="2"/>` +
      `<circle r="3.6" fill="currentColor"><animate attributeName="opacity" values="1;.25;1" dur="1.4s" repeatCount="indefinite"/></circle></svg>`;
  }
  function makeDrone(kind, label, fast) {
    const el = document.createElement('div');
    el.className = `drone c-${kind}`;
    el.dataset.name = label;
    el.innerHTML = `<div class="bob" style="animation-delay:-${(Math.random() * 2).toFixed(2)}s">${droneSVG(fast)}</div><span class="lbl">${esc(label)}</span>`;
    return el;
  }
  const T = p => `translate(${p.x}px, ${p.y}px) scale(${p.s}) rotate(${p.r || 0}deg)`;
  function center(el) {
    const r = el.getBoundingClientRect(), s = sky.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
  }
  function spawn(kind, label, at, opts = {}) {
    const el = makeDrone(kind, label, true);
    el.classList.add('fly');
    if (opts.big) el.classList.add('big');
    el._p = { x: at.x, y: at.y, s: opts.s ?? 1, r: 0 };
    el.style.transform = T(el._p);
    sky.appendChild(el);
    return el;
  }
  // Flies along a quadratic curve that lifts by `arc` pixels, banking towards the direction of travel.
  async function fly(el, to, { s = el._p.s, dur = 1100, arc = 70, delay = 0 } = {}) {
    const p = el._p, N = 16, frames = [];
    const cx = (p.x + to.x) / 2, cy = Math.min(p.y, to.y) - arc;
    const tilt = Math.max(-16, Math.min(16, (to.x - p.x) / 22));
    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t;
      frames.push({ transform: T({ x: u * u * p.x + 2 * u * t * cx + t * t * to.x, y: u * u * p.y + 2 * u * t * cy + t * t * to.y, s: p.s + (s - p.s) * t, r: Math.sin(Math.PI * t) * tilt }) });
    }
    const a = el.animate(frames, { duration: dur / SPEED, delay: delay / SPEED, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards' });
    el._p = { x: to.x, y: to.y, s, r: 0 };
    try { await a.finished; } catch (e) { throw ABORT; }
    check();
    el.style.transform = T(el._p);
    a.cancel();
  }
  function ring(at, color) {
    const r = document.createElement('div');
    r.className = 'sw-ring';
    r.style.cssText = `left:${at.x}px;top:${at.y}px;--c:${color}`;
    r.style.animationDuration = (0.9 / SPEED) + 's';
    sky.appendChild(r);
    setTimeout(() => r.remove(), 1000 / SPEED);
  }
  function beam(from, to) {
    const b = document.createElement('div');
    b.className = 'sw-beam';
    b.style.cssText = `left:${from.x}px;top:${from.y}px;height:${Math.max(0, to.y - from.y)}px`;
    sky.appendChild(b);
    setTimeout(() => b.remove(), 700 / SPEED);
  }
  const COLOR = k => getComputedStyle(document.documentElement).getPropertyValue('--c-' + k).trim();

  // ---------- Page chrome ----------
  function setPhase(k, what, why) {
    document.querySelectorAll('#sw-stepper li').forEach(li => {
      const i = +li.dataset.k;
      li.classList.toggle('on', i === k);
      li.classList.toggle('done', i < k);
    });
    const cap = $('sw-caption');
    cap.innerHTML = `<span class="sw-caption-what">${what}</span><span class="sw-caption-why">${why}</span>`;
    cap.classList.remove('flash'); void cap.offsetWidth; cap.classList.add('flash');
  }
  function follow(el) {
    const r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > window.innerHeight - 20) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function line(feedId, html, cls = '') {
    const f = $(feedId);
    const d = document.createElement('div');
    d.className = 'ln ' + cls;
    d.innerHTML = html;
    f.appendChild(d);
    while (f.children.length > 5) f.firstChild.remove();
    return d;
  }
  const rowEl = (col, name) => document.querySelector(`#${col} .sw-row[data-row="${name}"]`);
  function setRowState(name, cls, text) {
    const r = rowEl('sw-col3', name);
    r.classList.remove('live', 'ok', 'alert');
    if (cls) r.classList.add(cls);
    r.querySelector('.sw-state').textContent = text;
    return r;
  }

  // ---------- Setup / reset ----------
  function buildSelect() {
    const sel = $('sw-objective');
    sel.innerHTML = Object.entries(INDUSTRIES).map(([k, ind]) =>
      `<optgroup label="${ind.label}">` + ind.objectives.map((o, i) => `<option value="${k}:${i}">${esc(o.title)}</option>`).join('') + '</optgroup>').join('');
  }
  function loadScenario() {
    const [k, i] = $('sw-objective').value.split(':');
    industry = INDUSTRIES[k];
    scenario = industry.objectives[+i];
    $('sw-prompt').value = scenario.prompt;
  }
  function resetStage() {
    ACTIVE++;
    running = false;
    sky.innerHTML = '';
    KINDS.forEach(kind => {
      const bay = $('bay-' + kind);
      bay.innerHTML = '';
      industry.pools[kind].forEach(name => bay.appendChild(makeDrone(kind, name, false)));
    });
    document.querySelectorAll('.sw-row').forEach(r => r.classList.remove('scan', 'live', 'ok', 'alert'));
    document.querySelectorAll('#sw-col3 .sw-state').forEach(s => { s.textContent = 'idle'; });
    document.querySelectorAll('.sw-col').forEach(c => c.classList.remove('dim'));
    document.querySelectorAll('#sw-col3 .sw-feed').forEach(f => { f.innerHTML = ''; });
    $('sw-agents').innerHTML = '<div class="sw-wait">Waiting for the kick-off&hellip;</div>';
    $('sw-plan').innerHTML = ''; $('sw-tests').innerHTML = '';
    $('sw-exit').textContent = ''; $('sw-exit').classList.remove('met');
    $('sw-results').classList.remove('landed');
    $('sw-results').innerHTML = '<div class="sw-results-empty"><span class="sw-col-num">D</span><div><h3>Mission Results</h3><p>The swarm lands here with tested, audited results.</p></div></div>';
    document.querySelectorAll('#sw-stepper li').forEach(li => li.classList.remove('on', 'done'));
    $('sw-caption').innerHTML = '<span class="sw-caption-what">Choose an objective and press <b>Kick Off Agent</b>.</span><span class="sw-caption-why">Every drone you see is a reusable building block. The library grows with every mission.</span>';
    const kick = $('sw-kick');
    kick.disabled = false;
    kick.querySelector('span').textContent = 'Kick Off Agent';
  }

  // ---------- The mission ----------
  async function mission() {
    if (running) return;
    resetStage();
    CUR = ACTIVE;
    running = true;
    const sc = scenario, t0 = performance.now();
    const kick = $('sw-kick');
    kick.disabled = true;
    kick.querySelector('span').textContent = 'Swarm in flight…';
    const stats = { tools: 0, tokens: 0 };

    // 0. Brief
    setPhase(0, `Brief received: “${esc($('sw-prompt').value.trim() || sc.prompt)}”`, 'No workflow was drawn by hand. The goal is the only input.');
    const cmd = spawn('cmd', 'Kick-Off Agent', center(kick), { big: true });
    ring(cmd._p, COLOR('cmd'));
    await wait(500);
    follow($('sw-stepper'));
    await wait(450);

    // 1. Assemble: scan the hangar rows and launch the picks
    setPhase(1, 'The Kick-Off Agent scans the hangar and picks only what this goal needs.', 'Right capabilities only: lower cost, lower risk, faster results.');
    const picks = [];
    for (const kind of KINDS) {
      const row = rowEl('sw-col1', kind), rc = center(row);
      await fly(cmd, { x: rc.x, y: rc.y - row.offsetHeight / 2 + 14 }, { dur: 950, arc: 50 });
      row.classList.add('scan');
      await wait(450);
      const docked = [...$('bay-' + kind).children];
      for (const d of docked) {
        if (sc.pick[kind].includes(d.dataset.name)) {
          d.classList.add('picked');
          const at = center(d.querySelector('.bob'));
          beam(cmd._p, at);
          ring(at, COLOR(kind));
          await wait(230);
        } else d.classList.add('skip');
      }
      await wait(250);
      const lifts = docked.filter(d => d.classList.contains('picked')).map(async (d, i) => {
        const f = spawn(kind, d.dataset.name, center(d.querySelector('.bob')));
        d.classList.add('launched');
        picks.push({ f, kind, name: d.dataset.name });
        await fly(f, { x: f._p.x + (i % 2 ? 10 : -10), y: f._p.y - 16 }, { dur: 420, arc: 6, delay: i * 70 });
      });
      await Promise.all(lifts);
      row.classList.remove('scan');
    }

    // 2. Build: picks fly to agent cards and merge into agents
    setPhase(2, 'Picked capabilities fly to the Assembly Deck and combine into specialist agents.', 'Agents are assembled per mission, not hard-coded, so new use-cases ship in days.');
    const agentsBox = $('sw-agents');
    agentsBox.innerHTML = '';
    const cards = sc.agents.map(([name, role], i) => {
      const c = document.createElement('div');
      c.className = 'sw-agent';
      c.style.animationDelay = (i * 0.08) + 's';
      c.innerHTML = `<div class="sw-slot"></div><h5>${esc(name)}</h5><p>${esc(role)}</p><div class="sw-chips"></div>`;
      agentsBox.appendChild(c);
      return c;
    });
    follow(rowEl('sw-col2', 'agents'));
    await fly(cmd, (() => { const c = center(rowEl('sw-col2', 'agents')); return { x: c.x, y: c.y - 70 }; })(), { dur: 900, arc: 40 });
    const count = {};
    await Promise.all(picks.map(async (p, i) => {
      const n = count[p.kind] = (count[p.kind] ?? -1) + 1;
      const card = cards[n % cards.length];
      await fly(p.f, center(card.querySelector('.sw-slot')), { s: 0.55, dur: 1300, arc: 90, delay: i * 120 });
      p.f.classList.add('merge');
      ring(p.f._p, COLOR(p.kind));
      const chip = document.createElement('span');
      chip.className = `sw-chip c-${p.kind}`;
      chip.textContent = p.name;
      card.querySelector('.sw-chips').appendChild(chip);
      setTimeout(() => p.f.remove(), 500);
    }));
    const agentDrones = [];
    for (const [i, card] of cards.entries()) {
      const at = center(card.querySelector('.sw-slot'));
      at.y -= 10; // keeps the drone's name tag inside the slot, above the role text
      const a = spawn('agent', sc.agents[i][0], at, { big: true, s: 0.2 });
      ring(at, COLOR('agent'));
      await fly(a, at, { s: 1, dur: 500, arc: 0 });
      card.classList.add('ready');
      agentDrones.push(a);
      await wait(180);
    }

    // Planner, tester and exit checker
    const support = [];
    const deck = [
      ['planner', 'Planner', async () => { for (const s of sc.plan) { const li = document.createElement('li'); li.textContent = s; $('sw-plan').appendChild(li); await wait(330); } }],
      ['tester', 'Tester', async () => { for (const s of sc.tests) { const li = document.createElement('li'); li.textContent = s; $('sw-tests').appendChild(li); await wait(300); } }],
      ['exit', 'Exit Check', async () => { $('sw-exit').innerHTML = `<b>Stop when:</b> ${esc(sc.exit)}`; await wait(500); }]
    ];
    for (const [kind, label, fill] of deck) {
      const slot = $('slot-' + kind), at = center(slot);
      follow(slot);
      await fly(cmd, { x: at.x + 70, y: at.y - 24 }, { dur: 750, arc: 30 });
      const d = spawn(kind, label, { x: cmd._p.x, y: cmd._p.y }, { s: 0.3 });
      ring(cmd._p, COLOR(kind));
      await fly(d, at, { s: 1, dur: 650, arc: 20 });
      support.push(d);
      await fill();
    }

    // 3. Govern: fly in formation through the control tower
    setPhase(3, 'The swarm forms up and flies through the Control Tower.', 'Governance is built into every flight: nothing reaches a customer unchecked.');
    $('sw-col1').classList.add('dim');
    $('sw-col2').classList.add('dim');
    const squad = [cmd, ...agentDrones, ...support];
    squad.forEach(d => d.classList.add('small'));
    const formation = async (c, s = 0.5, dur = 1300) => Promise.all(squad.map((d, i) => {
      const k = Math.ceil(i / 2), side = i % 2 ? -1 : 1;
      return fly(d, { x: c.x + side * k * 22, y: c.y - 24 + k * 16 }, { s, dur, arc: 60, delay: i * 55 });
    }));

    const tower = [
      ['orchestrator', 'routing', async () => {
        for (const [i, step] of sc.plan.entries()) { line('feed-orchestrator', `<span class="k">assign</span> step ${i + 1} &rarr; <b>${esc(sc.agents[i % sc.agents.length][0])}</b> · ${esc(step)}`); await wait(420); }
        line('feed-orchestrator', `✓ ${sc.plan.length} steps scheduled on ${sc.agents.length} parallel lanes`, 'ok');
      }],
      ['auditor', 'recording', async () => {
        for (const [i, a] of sc.agents.entries()) {
          const tool = sc.pick.tool[i % sc.pick.tool.length];
          stats.tools += rand(12, 60);
          line('feed-auditor', `<span class="k">log</span> <b>${esc(a[0])}</b> used ${esc(tool)} · evidence #A-${rand(1000, 9999)}`);
          await wait(420);
        }
        line('feed-auditor', `✓ decision trail signed · hash ${Math.random().toString(16).slice(2, 10)}`, 'ok');
      }],
      ['observability', 'watching', async () => {
        const f = $('feed-observability');
        f.innerHTML = '<div class="sw-metrics"><div class="sw-metric"><span>Tokens</span><strong id="m-tok">0</strong></div><div class="sw-metric"><span>p95 latency</span><strong id="m-lat">0 ms</strong></div><div class="sw-metric"><span>Cost</span><strong id="m-cost">$0.00</strong></div></div><svg class="sw-spark" viewBox="0 0 100 26" preserveAspectRatio="none"><polyline id="m-spark" points=""/></svg>';
        const tok = rand(90000, 420000), lat = rand(380, 1400), pts = [];
        stats.tokens = tok;
        for (let i = 1; i <= 20; i++) {
          const t = i / 20;
          $('m-tok').textContent = Math.round(tok * t).toLocaleString('en-US');
          $('m-lat').textContent = Math.round(lat * (0.6 + 0.4 * t)) + ' ms';
          $('m-cost').textContent = '$' + (tok * t * 0.000006).toFixed(2);
          pts.push(`${(i - 1) * 5.2},${(22 - Math.random() * 14 - t * 4).toFixed(1)}`);
          $('m-spark').setAttribute('points', pts.join(' '));
          await wait(85);
        }
        line('feed-observability', '✓ all agents healthy · 0 retries · budget 31% used', 'ok');
      }],
      ['hitl', 'awaiting human', async () => {
        const f = $('feed-hitl'), secs = 6;
        f.innerHTML = `<div class="sw-hitl">${esc(sc.hitl)}<div class="sw-hitl-actions"><button type="button" class="yes">Approve</button><button type="button" class="no">Reject</button><small>you decide, or auto-approve</small></div><div class="sw-countdown"><span></span></div></div>`;
        const bar = f.querySelector('.sw-countdown span');
        bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: secs * 1000 / SPEED, fill: 'forwards' });
        const choice = await new Promise(res => {
          const timer = setTimeout(() => res('auto'), secs * 1000 / SPEED);
          f.querySelector('.yes').onclick = () => { clearTimeout(timer); res('yes'); };
          f.querySelector('.no').onclick = () => { clearTimeout(timer); res('no'); };
        });
        check();
        f.innerHTML = '';
        if (choice === 'no') {
          line('feed-hitl', '<span class="k">rejected</span> by reviewer &rarr; sent back to <b>Planner</b>', 'bad');
          await wait(600);
          line('feed-hitl', 'Planner revised the plan: scope reduced, risk lowered');
          await wait(600);
          line('feed-hitl', '✓ revised plan approved by reviewer', 'ok');
        } else {
          line('feed-hitl', `<span class="k">question</span> ${esc(sc.hitl)}`);
          await wait(300);
          line('feed-hitl', choice === 'yes' ? '✓ approved by you · signed into the audit trail' : '✓ auto-approved (demo) · signed into the audit trail', 'ok');
        }
      }],
      ['guardrails', 'enforcing', async () => {
        line('feed-guardrails', `<span class="k">scan</span> ${rand(120, 380)} proposed actions against policy`);
        await wait(500);
        const r = setRowState('guardrails', 'alert', 'blocked');
        const culprit = agentDrones[rand(0, agentDrones.length - 1)];
        culprit.classList.add('flash');
        line('feed-guardrails', `<span class="k">BLOCKED</span> ${esc(sc.guard)}`, 'bad');
        await wait(1100);
        culprit.classList.remove('flash');
        line('feed-guardrails', '✓ action rewritten within policy · swarm continues', 'ok');
        r.classList.remove('alert');
      }]
    ];
    for (const [name, state, script] of tower) {
      const pad = $('pad-' + name);
      follow(pad);
      await formation(center(pad));
      setRowState(name, 'live', state);
      await script();
      setRowState(name, 'ok', 'done');
      await wait(250);
    }

    // 4. Deliver: tests, exit condition, landing and results
    setPhase(4, 'Tests pass, the exit condition is met, and the swarm lands its results.', 'A finished outcome with numbers, evidence and a full audit trail.');
    $('sw-col2').classList.remove('dim');
    for (const li of $('sw-tests').children) { li.classList.add('pass'); await wait(260); }
    $('sw-exit').classList.add('met');
    $('sw-exit').innerHTML = `<b>Exit condition met:</b> ${esc(sc.exit)}`;
    await wait(400);

    const res = $('sw-results'), R = sc.result;
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    res.innerHTML = `<div class="sw-res-top"><span class="sw-res-badge">MISSION COMPLETE</span><span style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">${esc(industry.label)} · ${esc(sc.title)}</span></div>
      <div class="sw-res-head">${esc(R.headline)}</div>
      <div class="sw-landing" id="sw-landing"></div>
      <div class="sw-kpis">${R.kpis.map(([v, l], i) => `<div class="sw-kpi" style="animation-delay:${i * 0.08}s"><strong data-v="${esc(v)}">${esc(v)}</strong><span>${esc(l)}</span></div>`).join('')}</div>
      <div class="sw-res-grid">
        <div class="sw-res-box"><h4>Delivered</h4><ul>${R.deliv.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div>
        <div class="sw-res-box" style="animation-delay:.08s"><h4>Tests passed</h4><ul class="chk">${sc.tests.map(t => `<li>${esc(t)}</li>`).join('')}<li>Exit: ${esc(sc.exit)}</li></ul></div>
        <div class="sw-res-box" style="animation-delay:.16s"><h4>Mission stats</h4><div class="sw-stats">
          <div><b>${sc.agents.length + 3}</b>agents</div><div><b>${stats.tools}</b>tool calls</div><div><b>${stats.tokens.toLocaleString('en-US')}</b>tokens</div>
          <div><b>$${(stats.tokens * 0.000006).toFixed(2)}</b>model cost</div><div><b>1 + 1</b>approval + block</div><div><b>${secs}s</b>flight time</div></div></div>
      </div>`;
    res.classList.add('landed');
    follow(res);
    await wait(350);
    const land = $('sw-landing'), lr = center(land), w = land.offsetWidth;
    squad.forEach(d => d.classList.remove('small'));
    const gap = Math.min(110, (w - 60) / squad.length);
    await Promise.all(squad.map((d, i) => fly(d, { x: lr.x + (i - (squad.length - 1) / 2) * gap, y: lr.y - 8 }, { s: 0.75, dur: 1400, arc: 80, delay: i * 70 })));
    res.querySelectorAll('.sw-kpi strong').forEach(countUp);
    $('sw-col1').classList.remove('dim');
    document.querySelectorAll('#sw-stepper li').forEach(li => li.classList.add('done'));
    kick.disabled = false;
    kick.querySelector('span').textContent = 'Run again';
    running = false;
  }

  function countUp(el) {
    const text = el.dataset.v, m = text.match(/-?\d[\d,]*(\.\d+)?/);
    if (!m) return;
    const pre = text.slice(0, m.index), post = text.slice(m.index + m[0].length);
    const target = parseFloat(m[0].replace(/,/g, '')), dec = m[1] ? m[1].length - 1 : 0, comma = m[0].includes(',');
    const fmt = v => (comma ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec));
    const t0 = performance.now(), dur = 1200;
    const step = now => {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      el.textContent = pre + fmt(target * e) + post;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  async function launch() {
    try { await mission(); } catch (e) { if (e !== ABORT) { console.error(e); resetStage(); } }
  }

  function init() {
    sky = $('sw-sky');
    buildSelect();
    loadScenario();
    resetStage();
    $('sw-objective').addEventListener('change', () => { loadScenario(); resetStage(); });
    $('sw-kick').addEventListener('click', launch);
    $('sw-reset').addEventListener('click', resetStage);
    $('sw-speed').addEventListener('change', e => { SPEED = +e.target.value; });
    // Flight paths are measured from the layout, so a width change mid-flight restarts the stage.
    // Height-only resizes (mobile address bar while scrolling) are ignored.
    let rt, lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; if (running) resetStage(); } }, 300);
    });
  }
  return { init };
})();

document.addEventListener('DOMContentLoaded', Swarm.init);
