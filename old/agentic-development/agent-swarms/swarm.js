// Agent Swarm simulator: the Planner sets steps, tests and a stop rule (column B), a Kick-Off agent
// picks approved skills, tools, knowledge and memory (column A) and builds the agents, the swarm
// works a shared task board under an always-on governance layer (column C) and lands results (panel D).
const Swarm = (() => {
  // ---------- Scenario library ----------
  const INDUSTRIES = {
    retail: {
      label: 'Retail',
      pools: {
        skill: ['Demand Forecasting', 'Promo Planning', 'Price Elasticity', 'Customer Segmentation', 'Recommendation', 'Fraud Scoring'],
        tool: ['POS Data API', 'Inventory ERP', 'Supplier Portal', 'CRM', 'Email & SMS', 'Returns System'],
        knowledge: ['3-Year Sales History', 'Store Profiles', 'Customer 360', 'Fraud Patterns', 'Brand Guidelines'],
        memory: ['Last Festive Season Lessons', 'Supplier Reliability Notes', 'Campaign Results', 'Reviewer Decisions']
      },
      objectives: [
        {
          title: 'Cut festive-season stock-outs by 30%',
          prompt: 'Cut stock-outs by 30% across our 120 stores before the festive season, without raising inventory cost.',
          pick: { skill: ['Demand Forecasting', 'Promo Planning', 'Price Elasticity'], tool: ['POS Data API', 'Inventory ERP', 'Supplier Portal'], knowledge: ['3-Year Sales History', 'Store Profiles'], memory: ['Last Festive Season Lessons', 'Supplier Reliability Notes'] },
          agents: [['Forecaster', 'predicts demand per store and SKU'], ['Replenisher', 'raises purchase orders'], ['Pricer', 'tunes markdowns']],
          plan: ['Pull 3 years of POS sales for 120 stores', 'Forecast festive demand per SKU', 'Compare forecast with stock on hand', 'Draft purchase orders and markdowns'],
          tests: ['Forecast error under 12%', 'No purchase order over budget', 'Every store covered'],
          exit: 'Projected stock-outs down 30% or more, within budget',
          hitl: 'Approve ₹4.2 Cr of purchase orders across 38 suppliers?',
          guard: 'purchase order to an unapproved supplier',
          retry: { step: 1, test: 0, why: 'forecast error 17% in 9 coastal stores', fix: 'added local festival dates and re-forecast those stores' },
          lesson: 'Local festival dates',
          result: { headline: 'Stock-outs projected down 34% for the festive season', kpis: [['-34%', 'Stock-outs'], ['+1.8%', 'Inventory cost'], ['6 hrs', 'To plan (was 3 weeks)'], ['18,400', 'SKUs forecast']], deliv: ['Store-by-store replenishment plan', '38 purchase orders ready to send', 'Markdown calendar for slow movers'] }
        },
        {
          title: 'Personalise offers for 2M loyalty members',
          prompt: 'Personalise festive offers for our 2 million loyalty members and lift repeat purchases.',
          pick: { skill: ['Customer Segmentation', 'Recommendation', 'Promo Planning'], tool: ['CRM', 'Email & SMS', 'POS Data API'], knowledge: ['Customer 360', 'Brand Guidelines'], memory: ['Campaign Results', 'Reviewer Decisions'] },
          agents: [['Segmenter', 'groups members by behaviour'], ['Curator', 'picks the best offer per member'], ['Copywriter', 'writes on-brand messages']],
          plan: ['Build segments from 2M member profiles', 'Match offers to each segment', 'Write messages in the brand voice', 'Schedule sends by channel'],
          tests: ['Every offer inside margin rules', 'Messages pass the brand-tone check', 'Opt-outs respected'],
          exit: 'Every eligible member has one offer and one message',
          hitl: 'Approve 14 offer variants and the send schedule?',
          guard: 'message that used a member’s health data',
          retry: { step: 2, test: 1, why: '310 messages failed the brand-tone check', fix: 'rewrote them from the approved tone examples' },
          lesson: 'Tone examples',
          result: { headline: 'Personalised offers ready for 1.96M members', kpis: [['1.96M', 'Members reached'], ['+11%', 'Predicted repeat purchases'], ['14', 'Offer variants'], ['2 hrs', 'Campaign build time']], deliv: ['Segment map with 9 audiences', '14 offer variants with margin check', 'Channel send schedule'] }
        },
        {
          title: 'Stop return fraud without slowing honest customers',
          prompt: 'Detect and stop return fraud across all stores without slowing down honest customers.',
          pick: { skill: ['Fraud Scoring', 'Customer Segmentation'], tool: ['Returns System', 'POS Data API', 'CRM'], knowledge: ['Fraud Patterns', 'Customer 360'], memory: ['Reviewer Decisions'] },
          agents: [['Detective', 'scores each return for risk'], ['Profiler', 'checks customer history'], ['Resolver', 'approves or routes to staff']],
          plan: ['Stream today’s returns from all stores', 'Score each return against fraud patterns', 'Check the customer’s purchase history', 'Auto-approve low risk, route high risk'],
          tests: ['Honest returns approved in under 2 min', 'Known fraud cases caught in replay', 'Every decision has a reason code'],
          exit: 'Every return has a decision and a reason',
          hitl: 'Block refunds for 3 accounts linked to a wardrobing ring?',
          guard: 'decision that used the customer’s age',
          retry: { step: 1, test: 1, why: 'replay missed 6 of 40 known fraud cases', fix: 'added receipt-reuse patterns and re-scored' },
          lesson: 'Receipt reuse pattern',
          result: { headline: 'Return-fraud losses projected down 41%', kpis: [['41%', 'Fraud caught'], ['92%', 'Honest returns auto-approved'], ['48 s', 'Average decision time'], ['3', 'Fraud rings uncovered']], deliv: ['Risk score on every return', 'Case files for 3 suspected rings', 'Store-staff alert playbook'] }
        }
      ]
    },
    hr: {
      label: 'HR',
      pools: {
        skill: ['Talent Sourcing', 'Resume Screening', 'Interview Scheduling', 'Attrition Prediction', 'Skills Mapping', 'Pay Equity Analysis'],
        tool: ['Applicant Tracking', 'HRIS', 'Job Boards', 'Calendar & Video', 'Payroll', 'Learning Platform'],
        knowledge: ['Role Profiles', 'Hiring Outcomes', 'Exit Interviews', 'Pay Bands', 'Labour Law Rules'],
        memory: ['Past Hiring Drives', 'Retention Plan Outcomes', 'Manager Feedback', 'Reviewer Decisions']
      },
      objectives: [
        {
          title: 'Hire 5,000 staff for 12 new sites in 60 days',
          prompt: 'We open 12 fulfilment centres in 60 days. Hire 5,000 people fairly and have them trained by day one.',
          pick: { skill: ['Talent Sourcing', 'Resume Screening', 'Interview Scheduling'], tool: ['Job Boards', 'Applicant Tracking', 'Calendar & Video', 'Learning Platform'], knowledge: ['Role Profiles', 'Labour Law Rules'], memory: ['Past Hiring Drives'] },
          agents: [['Sourcer', 'finds candidates near each site'], ['Screener', 'shortlists against the role profile'], ['Coordinator', 'books interviews and onboarding']],
          plan: ['Post 5,000 roles across 12 sites and 40 job boards', 'Screen applicants against the role profile', 'Book interviews and shift trials', 'Issue offers and enrol hires in safety training'],
          tests: ['Shortlist rates equal across gender and age groups', 'Every offer inside the pay band', 'Minimum-wage and shift-hour laws met'],
          exit: '5,000 accepted offers with training booked',
          hitl: 'Release 5,120 offers at ₹21,500 a month base pay?',
          guard: 'screening that rejected candidates by home pin code',
          retry: { step: 1, test: 0, why: 'shortlist gap of 6% for women applicants', fix: 'dropped a “continuous experience” filter that penalised career breaks' },
          lesson: 'Career-break filter',
          result: { headline: 'On track for 5,000 hires in 41 days', kpis: [['41 days', 'Time to fill'], ['118,000', 'Applicants screened'], ['-62%', 'Cost per hire'], ['1.2%', 'Max shortlist gap across groups']], deliv: ['Offer letters for 5,120 candidates', 'Interview calendar for 12 sites', 'Day-one safety training enrolments'] }
        },
        {
          title: 'Cut regretted engineering attrition by 20%',
          prompt: 'Our best engineers are leaving. Cut regretted attrition by 20% this year without a blanket pay rise.',
          pick: { skill: ['Attrition Prediction', 'Pay Equity Analysis', 'Skills Mapping'], tool: ['HRIS', 'Payroll', 'Learning Platform'], knowledge: ['Exit Interviews', 'Pay Bands'], memory: ['Retention Plan Outcomes', 'Manager Feedback'] },
          agents: [['Predictor', 'spots flight risk early'], ['Analyst', 'finds pay and growth gaps'], ['Advisor', 'drafts retention plans for managers']],
          plan: ['Join 3 years of HR, pay and exit-interview data', 'Score flight risk for 6,800 engineers', 'Find the pay and career gaps behind it', 'Draft a retention plan for each manager'],
          tests: ['Every risk score comes with its reasons', 'No individual score visible to peers', 'Pay fixes narrow the gender gap, never widen it'],
          exit: 'Every high-risk engineer has a manager plan',
          hitl: 'Approve ₹7.8 Cr in targeted pay corrections for 410 engineers?',
          guard: 'flight-risk score that used medical leave records',
          retry: { step: 1, test: 0, why: '220 risk scores had no clear reason', fix: 'switched to an explainable model and re-scored' },
          lesson: 'Explainable scores',
          result: { headline: 'Regretted attrition projected down 23%', kpis: [['-23%', 'Regretted attrition'], ['410', 'Pay corrections'], ['₹31 Cr', 'Replacement cost avoided'], ['0.4%', 'Gender pay gap (was 3.1%)']], deliv: ['Flight-risk dashboard for managers', '410 targeted pay corrections', 'Career-path plans for 1,150 engineers'] }
        }
      ]
    },
    elections: {
      label: 'Elections (India)',
      pools: {
        skill: ['Phase Scheduling', 'Logistics Planning', 'Risk Mapping', 'Misinformation Detection', 'Multilingual Translation', 'Crowd Forecasting'],
        tool: ['Electoral Roll DB', 'EVM Tracking', 'GIS & Maps', 'Force Deployment System', 'Social Media Monitor', 'Voter Helpline'],
        knowledge: ['Polling Station Registry', 'Past Poll Incidents', 'Festival & Exam Calendar', 'Model Code of Conduct', 'Fact-Check Archive'],
        memory: ['Last Election Lessons', 'Booth Feedback', 'Correction Outcomes', 'Officer Decisions']
      },
      objectives: [
        {
          title: 'Plan a general election for 97 crore voters',
          prompt: 'Plan the general election for 97 crore voters across 10.5 lakh polling stations: phases, voting machines, staff and security.',
          pick: { skill: ['Phase Scheduling', 'Logistics Planning', 'Risk Mapping'], tool: ['GIS & Maps', 'EVM Tracking', 'Force Deployment System'], knowledge: ['Polling Station Registry', 'Past Poll Incidents', 'Festival & Exam Calendar'], memory: ['Last Election Lessons', 'Booth Feedback'] },
          agents: [['Scheduler', 'splits the country into phases'], ['Quartermaster', 'moves EVMs and polling staff'], ['Marshal', 'places security forces by risk']],
          plan: ['Map 10.5 lakh polling stations and their risk level', 'Draft phases around festivals, exams and harvest', 'Route 55 lakh EVMs and 1.5 crore staff', 'Send central forces to sensitive booths first'],
          tests: ['Every voter within 2 km of a polling station', 'Every EVM tracked from strongroom to booth', 'Every sensitive booth covered on poll day'],
          exit: 'A signed-off plan for every constituency in every phase',
          hitl: 'Approve a 7-phase schedule and 3,400 companies of central forces?',
          guard: 'booth risk score that used the area’s religion or caste',
          retry: { step: 2, test: 1, why: '1,800 EVMs had no tracked route in hill districts', fix: 'added mule and helicopter legs with GPS check-ins' },
          lesson: 'Hill-district routes',
          result: { headline: 'A 7-phase plan for 543 constituencies, built in 2 days', kpis: [['543', 'Constituencies'], ['10.5 L', 'Polling stations'], ['55 L', 'EVMs routed'], ['2 days', 'Planning time (was 6 weeks)']], deliv: ['Phase calendar for 543 constituencies', 'EVM and staff movement plan', 'Force deployment map for sensitive booths'] }
        },
        {
          title: 'Correct poll-day misinformation in 22 languages',
          prompt: 'On polling day, find false claims about voting (wrong dates, fake booth changes) in 22 languages and publish corrections within 30 minutes.',
          pick: { skill: ['Misinformation Detection', 'Multilingual Translation'], tool: ['Social Media Monitor', 'Voter Helpline', 'GIS & Maps'], knowledge: ['Fact-Check Archive', 'Model Code of Conduct'], memory: ['Correction Outcomes', 'Officer Decisions'] },
          agents: [['Monitor', 'watches posts in 22 languages'], ['Checker', 'verifies claims against official data'], ['Responder', 'publishes corrections']],
          plan: ['Stream public posts and helpline calls', 'Flag claims about dates, booths and voting rules', 'Check each claim against official records', 'Publish corrections in the same language'],
          tests: ['Only false claims about the voting process flagged', 'Every flag reviewed by a human fact-checker', 'Corrections out in under 30 minutes'],
          exit: 'Every viral false claim has a published correction',
          hitl: 'Publish a correction to a fake “booth moved” message seen by 2.1 lakh people?',
          guard: 'flag on a post for criticising a political party',
          retry: { step: 1, test: 0, why: '14% of flags were satire or opinion', fix: 'added a satire check and limited flags to voting facts' },
          lesson: 'Satire check',
          result: { headline: 'False voting claims corrected in 18 minutes on average', kpis: [['18 min', 'Time to correct'], ['1,140', 'False claims caught'], ['22', 'Languages'], ['4.6 Cr', 'People reached']], deliv: ['Live false-claim board for officials', '1,140 corrections in 22 languages', 'Post-poll report for the Commission'] }
        }
      ]
    },
    railways: {
      label: 'Railways',
      pools: {
        skill: ['Demand Forecasting', 'Timetable Optimisation', 'Rolling-Stock Planning', 'Crowd Management', 'Delay Prediction', 'Passenger Messaging'],
        tool: ['Reservation System', 'Live Train Tracking', 'Crew Rostering', 'Station CCTV', 'Signalling Status Feed', 'Weather API'],
        knowledge: ['Festival Travel History', 'Rake & Coach Inventory', 'Station Layouts', 'Track Capacity', 'Safety Rules'],
        memory: ['Last Festive Rush Lessons', 'Station Feedback', 'Fog Recovery Playbooks', 'Controller Decisions']
      },
      objectives: [
        {
          title: 'Move 200 million passengers through the festive rush',
          prompt: 'Over 3 weeks of Diwali and Chhath, 200 million people will travel. Add trains, keep stations safe and keep the network on time.',
          pick: { skill: ['Demand Forecasting', 'Rolling-Stock Planning', 'Timetable Optimisation', 'Crowd Management'], tool: ['Reservation System', 'Crew Rostering', 'Station CCTV'], knowledge: ['Festival Travel History', 'Rake & Coach Inventory', 'Station Layouts'], memory: ['Last Festive Rush Lessons', 'Station Feedback'] },
          agents: [['Forecaster', 'predicts travel per route and day'], ['Scheduler', 'fits special trains into free paths'], ['Steward', 'keeps station crowds safe']],
          plan: ['Forecast demand per route from waitlists and past festivals', 'Find spare coaches and free track paths', 'Timetable and crew the special trains', 'Set crowd limits and holding areas per station'],
          tests: ['No two trains share a track path', 'Crew duty hours within the rules', 'Platform crowding under the safe limit'],
          exit: 'Waitlists cleared on the top 200 routes, no station over safe crowding',
          hitl: 'Run 7,600 special-train trips and turn 14 platforms into holding areas?',
          guard: 'timetable that skipped a mandatory safety inspection',
          retry: { step: 2, test: 1, why: '86 special trains had crews over duty hours', fix: 'moved crew changes to 9 junctions' },
          lesson: 'Crew-change junctions',
          result: { headline: '7,600 special trips planned, waitlists down 71%', kpis: [['200 M', 'Passengers planned for'], ['7,600', 'Special trips'], ['-71%', 'Waitlist'], ['0', 'Stations over safe crowding']], deliv: ['Special-train timetable for 3 weeks', 'Coach and crew allocation', 'Crowd plan for 120 major stations'] }
        },
        {
          title: 'Recover the network after a dense-fog night',
          prompt: 'Dense fog across north India has delayed 900 trains. Re-plan the network so the morning rush runs on time.',
          pick: { skill: ['Delay Prediction', 'Timetable Optimisation', 'Passenger Messaging'], tool: ['Live Train Tracking', 'Weather API', 'Signalling Status Feed', 'Crew Rostering'], knowledge: ['Track Capacity', 'Safety Rules'], memory: ['Fog Recovery Playbooks', 'Controller Decisions'] },
          agents: [['Predictor', 'forecasts each train’s delay'], ['Replanner', 'reorders trains and swaps crews'], ['Announcer', 'updates passengers and stations']],
          plan: ['Read live positions of 900 delayed trains', 'Forecast fog clearance and new arrival times', 'Re-sequence trains and swap crews nearing duty limits', 'Send new times to passengers and stations'],
          tests: ['Fog speed limits never exceeded', 'No crew over duty hours', 'Every affected passenger notified'],
          exit: 'Morning trains back within 15 minutes of schedule',
          hitl: 'Cancel 38 near-empty trains to free paths for 210 crowded ones?',
          guard: 'plan that raised speed above the fog limit to make up time',
          retry: { step: 2, test: 1, why: '41 crews would run past duty limits', fix: 'brought in standby crews from 6 depots' },
          lesson: 'Standby crews',
          result: { headline: 'Network back on schedule 3 hours sooner than usual', kpis: [['3 hrs', 'Faster recovery'], ['900', 'Trains re-planned'], ['1.8 Cr', 'Passengers notified'], ['94%', 'Morning on-time']], deliv: ['Revised running order for 900 trains', 'Crew swap roster', 'Passenger alerts by SMS and app'] }
        }
      ]
    },
    markets: {
      label: 'Stock Market',
      pools: {
        skill: ['Market Surveillance', 'Pattern Detection', 'Entity Linking', 'Volatility Forecasting', 'Risk Modelling', 'Investor Communication'],
        tool: ['Order Book Feed', 'Trade Database', 'KYC & PAN Registry', 'Margin System', 'Circuit-Breaker Controls', 'News & Social Feed'],
        knowledge: ['Manipulation Patterns', 'Corporate Announcements', 'Past Market Crashes', 'Exchange Rulebook', 'Client Risk Profiles'],
        memory: ['Past Case Outcomes', 'False-Alert Feedback', 'Past Halt Reviews', 'Analyst Decisions']
      },
      objectives: [
        {
          title: 'Catch pump-and-dump rings among 11 crore investors',
          prompt: 'Find coordinated pump-and-dump schemes in small-cap stocks before retail investors get hurt.',
          pick: { skill: ['Market Surveillance', 'Pattern Detection', 'Entity Linking'], tool: ['Order Book Feed', 'Trade Database', 'KYC & PAN Registry', 'News & Social Feed'], knowledge: ['Manipulation Patterns', 'Corporate Announcements'], memory: ['Past Case Outcomes', 'False-Alert Feedback'] },
          agents: [['Watcher', 'scans every order in real time'], ['Linker', 'connects accounts that trade together'], ['Investigator', 'builds the case for regulators']],
          plan: ['Stream 40 crore orders a day from the order book', 'Spot unusual price and volume in small caps', 'Link the accounts and tip channels behind them', 'Build evidence packs for the surveillance team'],
          tests: ['Every alert can be replayed from raw orders', 'Known past schemes caught in replay', 'No account flagged on trade size alone'],
          exit: 'Every suspected ring has a reviewed case',
          hitl: 'Freeze 27 linked accounts and put 3 stocks under extra surveillance?',
          guard: 'agent trying to place a trade itself',
          retry: { step: 2, test: 2, why: '120 accounts flagged only for large trades', fix: 'required a second link: device, bank account or tip channel' },
          lesson: 'Two-link rule',
          result: { headline: '5 pump-and-dump rings caught before the dump', kpis: [['5', 'Rings caught'], ['₹640 Cr', 'Retail losses avoided'], ['27', 'Accounts frozen'], ['4 min', 'Alert to case']], deliv: ['Evidence packs for 5 rings', 'Watch-list for 3 small-cap stocks', 'Draft investor caution notice'] }
        },
        {
          title: 'Keep trading orderly during a flash crash',
          prompt: 'The index fell 6% in 9 minutes. Keep trading orderly, protect margin accounts and tell investors what is happening.',
          pick: { skill: ['Volatility Forecasting', 'Risk Modelling', 'Investor Communication'], tool: ['Order Book Feed', 'Margin System', 'Circuit-Breaker Controls'], knowledge: ['Past Market Crashes', 'Exchange Rulebook', 'Client Risk Profiles'], memory: ['Past Halt Reviews'] },
          agents: [['Sentinel', 'watches liquidity and price bands'], ['Risk Manager', 'recalculates margins across brokers'], ['Communicator', 'drafts public notices']],
          plan: ['Find the orders and algorithms driving the fall', 'Forecast whether the next circuit level will be hit', 'Recalculate margins for 1.4 crore open positions', 'Draft the exchange notice and broker alerts'],
          tests: ['Circuit-breaker rules followed exactly', 'No broker below required margin', 'Notice approved before publishing'],
          exit: 'Prices back inside their bands, or trading halted by rule',
          hitl: 'Trigger a 15-minute market-wide trading halt?',
          guard: 'public notice that named a client',
          retry: { step: 2, test: 1, why: '3 brokers still short of margin', fix: 'issued intraday margin calls before the next circuit check' },
          lesson: 'Early margin calls',
          result: { headline: 'Fall contained at 7.2%, market reopened smoothly', kpis: [['7.2%', 'Maximum fall'], ['15 min', 'Halt'], ['1.4 Cr', 'Positions re-margined'], ['0', 'Broker defaults']], deliv: ['Root-cause report on the trigger orders', 'Margin calls for 38 brokers', 'Public notice and investor FAQ'] }
        }
      ]
    },
    defence: {
      label: 'Defence (simulation)',
      pools: {
        skill: ['Sensor Fusion', 'Threat Assessment', 'Mission Planning', 'Electronic Warfare Planning', 'Airspace Deconfliction', 'Interceptor Allocation'],
        tool: ['Radar Network', 'Satellite Imagery', 'Signals Intelligence Feed', 'Air Defence C2', 'Datalink', 'Civil Alert System'],
        knowledge: ['Rules of Engagement', 'No-Strike List', 'Threat Library', 'Friendly Force Positions', 'Airspace Control Plan'],
        memory: ['After-Action Reviews', 'Sensor Reliability Notes', 'Previous Raid Patterns', 'Commander Decisions']
      },
      objectives: [
        {
          title: 'SEAD: open a safe air corridor',
          prompt: 'Open a safe corridor for our aircraft by suppressing the hostile air-defence network, with no civilian harm and no friendly losses.',
          pick: { skill: ['Sensor Fusion', 'Electronic Warfare Planning', 'Mission Planning', 'Airspace Deconfliction'], tool: ['Signals Intelligence Feed', 'Satellite Imagery', 'Datalink'], knowledge: ['Threat Library', 'No-Strike List', 'Rules of Engagement'], memory: ['After-Action Reviews', 'Sensor Reliability Notes'] },
          agents: [['Locator', 'fixes radar sites from signals and imagery'], ['Packager', 'builds the suppression package'], ['Deconflictor', 'keeps friendly and civil air apart']],
          plan: ['Build the air-defence picture from signals and imagery', 'Confirm each radar and launcher site with two sources', 'Plan jamming and suppression timing for the corridor', 'Deconflict routes with friendly and civil air traffic'],
          tests: ['Every target confirmed by two independent sources', 'No target inside a no-strike zone', 'Every friendly flight deconflicted'],
          exit: 'Corridor threat below the go threshold, or mission handed back to the commander',
          hitl: 'Commander: authorise engagement of 6 confirmed air-defence sites?',
          hitlMust: true,
          guard: 'target 300 m from a hospital on the no-strike list',
          retry: { step: 1, test: 0, why: '2 sites confirmed by one source only', fix: 'tasked new imagery and dropped 1 site that was a decoy' },
          lesson: 'Decoy check',
          result: { headline: 'Corridor opened in simulation with zero civilian or friendly harm', kpis: [['6', 'Sites suppressed'], ['0', 'Friendly losses'], ['0', 'No-strike violations'], ['38 min', 'Plan time (was 2 days)']], deliv: ['Corridor plan with timings', 'Target folders with two-source evidence', 'Damage assessment report'] }
        },
        {
          title: 'Defend our airbase and power grid from a drone-and-missile raid',
          prompt: 'A mixed raid of drones and missiles is heading for our airbase and the regional power grid. Defend both and warn civilians.',
          pick: { skill: ['Sensor Fusion', 'Threat Assessment', 'Interceptor Allocation'], tool: ['Radar Network', 'Air Defence C2', 'Datalink', 'Civil Alert System'], knowledge: ['Friendly Force Positions', 'Airspace Control Plan', 'Rules of Engagement'], memory: ['Previous Raid Patterns', 'Commander Decisions'] },
          agents: [['Tracker', 'fuses radar into one air picture'], ['Allocator', 'pairs each threat with an interceptor'], ['Warden', 'warns civilians and grid operators']],
          plan: ['Fuse radar tracks into one air picture', 'Classify each track as hostile, friendly or civil', 'Pair hostile tracks with interceptors by asset priority', 'Send shelter alerts and grid protection orders'],
          tests: ['Every track identified before engagement', 'No interceptor tasked on a friendly or civil track', 'Critical assets covered first'],
          exit: 'Every hostile track resolved, or handed to the commander',
          hitl: 'Commander: authorise engagement of 41 hostile tracks?',
          hitlMust: true,
          guard: 'engagement of a track identified as a civilian airliner',
          retry: { step: 1, test: 0, why: '5 tracks still unidentified', fix: 'held them and re-checked with a second radar' },
          lesson: 'Second-radar check',
          result: { headline: 'Raid defeated in simulation, base and grid stayed online', kpis: [['96%', 'Threats intercepted'], ['0', 'Civil or friendly engagements'], ['8 s', 'Track to decision'], ['3.2 L', 'Civilians alerted']], deliv: ['After-action timeline', 'Interceptor stock and resupply plan', 'Civil alert log'] }
        }
      ]
    }
  };
  const KINDS = ['skill', 'tool', 'knowledge', 'memory'];

  // ---------- State ----------
  // Run control, icons, flight and captions come from the shared kit (../shared/agentic-kit.js).
  const K = AgentKit;
  const { $, rand, esc, wait, check, makeUnit, spawn, fly, ring, beam, missile, center, COLOR, setPhase, follow, line, countUp } = K;
  let running = false;
  let industry, scenario, indKey;
  // Lessons written to memory, per industry. They survive resets for this page visit, so a re-run
  // picks the lesson up and passes the test that failed the first time.
  const LEARNED = {};

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
    indKey = k;
    industry = INDUSTRIES[k];
    scenario = industry.objectives[+i];
    $('sw-prompt').value = scenario.prompt;
  }
  function resetStage() {
    K.newRun();
    running = false;
    KINDS.forEach(kind => {
      const bay = $('bay-' + kind);
      bay.innerHTML = '';
      industry.pools[kind].forEach(name => bay.appendChild(makeUnit(kind, name)));
    });
    (LEARNED[indKey] || []).forEach(name => {
      const d = makeUnit('memory', name);
      d.classList.add('learned', 'in');
      $('bay-memory').appendChild(d);
    });
    document.querySelectorAll('.sw-row').forEach(r => r.classList.remove('scan', 'live', 'ok', 'alert'));
    document.querySelectorAll('#sw-col3 .sw-state').forEach(s => { s.textContent = 'idle'; });
    document.querySelectorAll('.sw-col').forEach(c => c.classList.remove('dim'));
    document.querySelectorAll('#sw-col3 .sw-feed').forEach(f => { f.innerHTML = ''; });
    $('sw-agents').innerHTML = '';
    rowEl('sw-col2', 'agents').classList.remove('sw-reveal');
    rowEl('sw-col2', 'agents').classList.add('sw-hide');
    $('sw-plan').innerHTML = ''; $('sw-tests').innerHTML = '';
    $('sw-exit').textContent = ''; $('sw-exit').classList.remove('met');
    $('sw-results').classList.remove('landed');
    $('sw-results').innerHTML = '<div class="sw-results-empty"><span class="sw-col-num">D</span><div><h3>Mission Results</h3><p>The swarm lands here with tested, audited results and the lesson it learned.</p></div></div>';
    document.querySelectorAll('#sw-stepper li').forEach(li => li.classList.remove('on', 'done'));
    $('sw-caption').innerHTML = '<span class="sw-caption-what">Choose an objective and press <b>Kick Off Agent</b>.</span><span class="sw-caption-why">Every agent and every piece of gear is an approved, reusable building block. Memory grows with every mission.</span>';
    const kick = $('sw-kick');
    kick.disabled = false;
    kick.querySelector('span').textContent = 'Kick Off Agent';
  }

  // ---------- The mission ----------
  // Brief -> Plan (steps, tests, stop rule) -> Assemble from the approved catalog -> Execute on the task board
  // (agents claim steps and hand off; a failed test triggers a re-plan) -> Deliver and write the lesson to memory.
  // The governance rows (auditor, observability, HITL, guardrails) stay live for the whole mission.
  const GOV = ['auditor', 'observability', 'hitl', 'guardrails'];
  const GIVE_UP = 'after 3 re-plans or 80% of budget, hand over to a person';
  const GUARD_STEP = 2;
  const hash = () => Math.random().toString(16).slice(2, 10);

  // Observability ticks in the background until the mission ends; `stats.rate` rises while agents work.
  function startMeter(stats) {
    $('feed-observability').innerHTML = '<div class="sw-metrics"><div class="sw-metric"><span>Tokens</span><strong id="m-tok">0</strong></div><div class="sw-metric"><span>p95 latency</span><strong id="m-lat">0 ms</strong></div><div class="sw-metric"><span>Cost</span><strong id="m-cost">$0.00</strong></div></div><svg class="sw-spark" viewBox="0 0 100 26" preserveAspectRatio="none"><polyline id="m-spark" points=""/></svg>';
    const vals = [];
    (async () => {
      try {
        while (!stats.done) {
          const add = Math.round(stats.rate * (0.6 + Math.random() * 0.8));
          stats.tokens += add;
          $('m-tok').textContent = stats.tokens.toLocaleString('en-US');
          $('m-lat').textContent = rand(380, 600) + Math.round(stats.rate / 10) + ' ms';
          $('m-cost').textContent = '$' + (stats.tokens * 0.000006).toFixed(2);
          vals.push(add); if (vals.length > 20) vals.shift();
          $('m-spark').setAttribute('points', vals.map((a, i) => `${i * 5.2},${(24 - Math.min(20, a / 450)).toFixed(1)}`).join(' '));
          await wait(150);
        }
      } catch (e) { /* stage was reset */ }
    })();
  }

  async function mission() {
    if (running) return;
    resetStage();
    K.start();
    running = true;
    const sc = scenario, t0 = performance.now();
    const kick = $('sw-kick');
    kick.disabled = true;
    kick.querySelector('span').textContent = 'Swarm in flight…';
    const stats = { tools: 0, tokens: 0, rate: 400, replans: 0, done: false, approval: '' };
    const lessonName = 'Lesson: ' + sc.lesson;
    const knows = (LEARNED[indKey] || []).includes(lessonName);
    const wanted = kind => kind === 'memory' && knows ? [...sc.pick.memory, lessonName] : sc.pick[kind];

    // 0. Brief: governance switches on before any agent does
    setPhase(0, `Brief received: “${esc($('sw-prompt').value.trim() || sc.prompt)}”`, 'Governance switches on first: audit, observability and guardrails watch from the first second.');
    const cmd = spawn('cmd', 'Kick-Off Agent', center(kick), { big: true });
    ring(cmd._p, COLOR('cmd'));
    GOV.forEach(n => setRowState(n, 'live', n === 'hitl' ? 'standing by' : 'on'));
    startMeter(stats);
    line('feed-auditor', `<span class="k">open</span> mission M-${rand(1000, 9999)} · brief recorded`);
    line('feed-guardrails', `<span class="k">load</span> policy pack · ${esc(industry.label)}`);
    line('feed-hitl', 'High-stakes moves will stop here for a person');
    await wait(500);
    follow($('sw-stepper'));
    await wait(450);

    // 1. Plan: the steps, the tests and the stop rule exist before any agent is built
    setPhase(1, 'The Planner breaks the goal into steps, the Tester writes the checks, the Exit Check sets the stop rule.', 'Done and give-up are defined before any agent is built, so autonomy has limits.');
    stats.rate = 1500;
    const support = {};
    const deck = [
      ['planner', 'Planner', async () => { for (const s of sc.plan) { const li = document.createElement('li'); li.textContent = s; $('sw-plan').appendChild(li); await wait(330); } }],
      ['tester', 'Tester', async () => { for (const s of sc.tests) { const li = document.createElement('li'); li.textContent = s; $('sw-tests').appendChild(li); await wait(300); } }],
      ['exit', 'Exit Check', async () => { $('sw-exit').innerHTML = `<b>Stop when:</b> ${esc(sc.exit)}<small><b>Give up:</b> ${GIVE_UP}</small>`; await wait(500); }]
    ];
    for (const [kind, label, fill] of deck) {
      const slot = $('slot-' + kind), at = center(slot);
      follow(slot);
      await fly(cmd, { x: at.x + 70, y: at.y - 24 }, { dur: 750, arc: 30 });
      const d = spawn(kind, label, { x: cmd._p.x, y: cmd._p.y }, { s: 0.3 });
      ring(cmd._p, COLOR(kind));
      await fly(d, at, { s: 1, dur: 650, arc: 20 });
      support[kind] = d;
      await fill();
    }
    line('feed-auditor', `<span class="k">log</span> plan v1 · ${sc.plan.length} steps · ${sc.tests.length} tests · stop rule set`);

    // 2. Assemble: scan the hangar rows and launch only what the plan needs
    setPhase(2, 'The Kick-Off Agent picks only what the plan needs from the approved catalog.', 'Skills = know-how · Tools = systems · Knowledge = facts and documents · Memory = lessons from past missions.');
    stats.rate = 2500;
    const picks = [];
    for (const kind of KINDS) {
      const row = rowEl('sw-col1', kind), rc = center(row);
      follow(row);
      await fly(cmd, { x: rc.x, y: rc.y - row.offsetHeight / 2 + 14 }, { dur: 950, arc: 50 });
      row.classList.add('scan');
      await wait(400);
      const docked = [...$('bay-' + kind).children];
      for (const d of docked) {
        if (wanted(kind).includes(d.dataset.name)) {
          d.classList.add('picked');
          const at = center(d.querySelector('.bob'));
          beam(cmd._p, at);
          ring(at, COLOR(kind));
          await wait(220);
        } else d.classList.add('skip');
      }
      await wait(200);
      const lifts = docked.filter(d => d.classList.contains('picked')).map(async (d, i) => {
        const f = spawn(kind, d.dataset.name, center(d.querySelector('.bob')));
        d.classList.add('launched');
        picks.push({ f, kind, name: d.dataset.name });
        await fly(f, { x: f._p.x + (i % 2 ? 10 : -10), y: f._p.y - 16 }, { dur: 420, arc: 6, delay: i * 70 });
      });
      await Promise.all(lifts);
      row.classList.remove('scan');
    }
    line('feed-guardrails', `<span class="k">check</span> ${picks.length} picks · all in the approved catalog · versions pinned`, 'ok');
    if (knows) line('feed-auditor', `<span class="k">mem</span> reusing ${esc(lessonName)} from a past mission`);

    // Build: a missile per agent creates its card, then the picks fly in and merge.
    setPhase(2, 'Build orders fire: every hit creates a specialist agent, and the picks merge into it.', 'Agents are built from approved, versioned parts, and the build manifest is signed.');
    const agentsRow = rowEl('sw-col2', 'agents');
    agentsRow.classList.remove('sw-hide');
    agentsRow.classList.add('sw-reveal');
    const agentsBox = $('sw-agents');
    agentsBox.innerHTML = '';
    // Cards are laid out hidden first so the missiles know where to land.
    const cards = sc.agents.map(([name, role]) => {
      const c = document.createElement('div');
      c.className = 'sw-agent';
      c.innerHTML = `<div class="sw-slot"></div><h5>${esc(name)}</h5><p>${esc(role)}</p><div class="sw-chips"></div>`;
      agentsBox.appendChild(c);
      return c;
    });
    follow(agentsRow);
    await fly(cmd, (() => { const c = center(agentsRow); return { x: c.x, y: c.y - 120 }; })(), { dur: 900, arc: 40 });
    await wait(250);
    await Promise.all(cards.map((card, i) => missile(cmd._p, center(card), i * 260).then(() => card.classList.add('show'))));
    await wait(350);
    const count = {};
    await Promise.all(picks.map(async (p, i) => {
      const n = count[p.kind] = (count[p.kind] ?? -1) + 1;
      const card = cards[n % cards.length];
      await fly(p.f, center(card.querySelector('.sw-slot')), { s: 0.55, dur: 1300, arc: 90, delay: i * 100 });
      p.f.classList.add('merge');
      ring(p.f._p, COLOR(p.kind));
      const chip = document.createElement('span');
      chip.className = `sw-chip c-${p.kind}`;
      chip.textContent = p.name;
      card.querySelector('.sw-chips').appendChild(chip);
      setTimeout(() => p.f.remove(), 500);
    }));
    const agentUnits = [];
    for (const [i, card] of cards.entries()) {
      const at = center(card.querySelector('.sw-slot'));
      at.y -= 10; // keeps the agent's name tag inside the slot, above the role text
      const a = spawn('agent', sc.agents[i][0], at, { big: true, s: 0.2 });
      ring(at, COLOR('agent'));
      await fly(a, at, { s: 1, dur: 500, arc: 0 });
      card.classList.add('ready');
      agentUnits.push(a);
      await wait(180);
    }
    line('feed-auditor', `<span class="k">sign</span> build manifest · ${sc.agents.length} agents · #${hash()}`);

    // 3. Execute: the swarm works the task board; governance checks every move as it happens
    setPhase(3, 'The swarm flies to the task board. Agents claim steps and hand work to each other.', 'No fixed script: agents pull work from a shared board, and every move is checked as it happens.');
    stats.rate = 6000;
    $('sw-col1').classList.add('dim');
    const squad = [cmd, ...agentUnits, support.planner, support.tester, support.exit];
    squad.forEach(d => d.classList.add('small'));
    const formation = async (c, s = 0.5, dur = 1300) => Promise.all(squad.map((d, i) => {
      const k = Math.ceil(i / 2), side = i % 2 ? -1 : 1;
      return fly(d, { x: c.x + side * k * 22, y: c.y - 24 + k * 16 }, { s, dur, arc: 60, delay: i * 55 });
    }));
    const toBoard = async () => { follow($('pad-board')); await formation(center($('pad-board')), 0.5, 1000); };
    const planLis = [...$('sw-plan').children], testLis = [...$('sw-tests').children];

    const replan = async () => {
      const r = sc.retry, t = testLis[r.test];
      setPhase(3, 'A test failed. The Planner re-plans that step and the swarm tries again.', `Self-correction within limits: ${GIVE_UP}.`);
      setRowState('board', 'alert', 're-plan');
      ring(support.tester._p, COLOR('tester'));
      support.tester.classList.add('flash');
      t.classList.add('fail');
      line('feed-board', `<span class="k">FAIL</span> ${esc(sc.tests[r.test])} · ${esc(r.why)}`, 'bad');
      await wait(1100);
      support.tester.classList.remove('flash');
      ring(support.planner._p, COLOR('planner'));
      stats.replans++;
      planLis[r.step].classList.add('revised');
      planLis[r.step].insertAdjacentHTML('beforeend', `<em>v2: ${esc(r.fix)}</em>`);
      line('feed-board', `<span class="k">re-plan</span> v2 · ${esc(r.fix)}`);
      line('feed-auditor', `<span class="k">log</span> test failed · plan v2 recorded · #${hash()}`);
      await wait(1000);
      t.classList.remove('fail');
      t.classList.add('pass');
      line('feed-board', `✓ retry passed · ${esc(sc.tests[r.test])}`, 'ok');
      setRowState('board', 'live', 'running');
      await wait(400);
    };

    const guardrail = async agent => {
      setPhase(3, 'Guardrails block an unsafe action before it happens.', 'Policy is enforced on every action as it happens, not reviewed afterwards.');
      const pad = $('pad-guardrails'), home = { x: agent._p.x, y: agent._p.y };
      follow(pad);
      line('feed-guardrails', `<span class="k">scan</span> ${rand(120, 380)} proposed actions against policy`);
      await fly(agent, center(pad), { dur: 750, arc: 40 });
      setRowState('guardrails', 'alert', 'blocked');
      agent.classList.add('flash');
      line('feed-guardrails', `<span class="k">BLOCKED</span> ${esc(sc.guard)}`, 'bad');
      await wait(1200);
      agent.classList.remove('flash');
      line('feed-guardrails', '✓ action rewritten within policy · swarm continues', 'ok');
      setRowState('guardrails', 'live', 'on');
      follow($('pad-board'));
      await fly(agent, home, { dur: 750, arc: 40 });
    };

    // Decisions marked hitlMust (e.g. use of force) never auto-approve: the swarm waits for a person.
    const approval = async () => {
      const must = !!sc.hitlMust;
      setPhase(3, must ? 'Use of force: the swarm stops and waits for a commander.' : 'A high-stakes move goes to a person before it happens.',
        must ? 'Never auto-approved. A human decides, and the decision is signed into the audit trail.' : 'Approve or reject it yourself, or let the demo auto-approve.');
      const pad = $('pad-hitl');
      follow(pad);
      await formation(center(pad), 0.5, 1000);
      setRowState('hitl', 'alert', 'awaiting human');
      const f = $('feed-hitl'), secs = 6;
      f.innerHTML = `<div class="sw-hitl">${esc(sc.hitl)}<div class="sw-hitl-actions"><button type="button" class="yes">Approve</button><button type="button" class="no">Reject</button><small>${must ? 'a human must decide: no auto-approve' : 'you decide, or auto-approve'}</small></div>${must ? '' : '<div class="sw-countdown"><span></span></div>'}</div>`;
      if (!must) f.querySelector('.sw-countdown span').animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: secs * 1000 / K.speed(), fill: 'forwards' });
      const choice = await new Promise(res => {
        const timer = must ? null : setTimeout(() => res('auto'), secs * 1000 / K.speed());
        f.querySelector('.yes').onclick = () => { clearTimeout(timer); res('yes'); };
        f.querySelector('.no').onclick = () => { clearTimeout(timer); res('no'); };
      });
      check();
      f.innerHTML = '';
      setRowState('hitl', 'live', 'standing by');
      if (choice === 'no') {
        stats.replans++;
        stats.approval = 'Rejected, then a revised plan approved';
        line('feed-hitl', '<span class="k">rejected</span> by reviewer &rarr; sent back to <b>Planner</b>', 'bad');
        await wait(600);
        line('feed-hitl', 'Planner revised the plan: scope reduced, risk lowered');
        await wait(600);
        line('feed-hitl', '✓ revised plan approved by reviewer', 'ok');
      } else {
        stats.approval = choice === 'yes' ? 'Approved by you' : 'Auto-approved (demo)';
        line('feed-hitl', `<span class="k">question</span> ${esc(sc.hitl)}`);
        await wait(300);
        line('feed-hitl', choice === 'yes' ? '✓ approved by you · signed into the audit trail' : '✓ auto-approved (demo) · signed into the audit trail', 'ok');
      }
      await wait(400);
      await toBoard();
    };

    await toBoard();
    setRowState('board', 'live', 'running');
    for (const [i, step] of sc.plan.entries()) {
      // The last step is the big move, so it waits for the human decision first.
      if (i === sc.plan.length - 1) await approval();
      const ai = i % sc.agents.length, agent = agentUnits[ai], name = sc.agents[ai][0];
      setPhase(3, `Step ${i + 1}: <b>${esc(name)}</b> claims “${esc(step)}”.`, 'Every tool call is logged with evidence by the Auditor as it happens.');
      planLis[i].classList.add('now');
      line('feed-board', `<span class="k">claim</span> step ${i + 1} · <b>${esc(name)}</b> · ${esc(step)}`);
      agent.classList.add('work');
      await fly(agent, { x: agent._p.x, y: agent._p.y - 14 }, { dur: 320, arc: 4 });
      await fly(agent, { x: agent._p.x, y: agent._p.y + 14 }, { dur: 320, arc: 4 });
      stats.tools += rand(12, 60);
      line('feed-auditor', `<span class="k">log</span> <b>${esc(name)}</b> used ${esc(sc.pick.tool[i % sc.pick.tool.length])} · evidence #A-${rand(1000, 9999)}`);
      await wait(350);
      agent.classList.remove('work');
      if (i === sc.retry.step) {
        if (!knows) await replan();
        else { testLis[sc.retry.test].classList.add('pass'); line('feed-board', `✓ ${esc(sc.tests[sc.retry.test])} · passed first time, thanks to memory`, 'ok'); await wait(500); }
      }
      if (i === GUARD_STEP) await guardrail(agent);
      planLis[i].classList.remove('now');
      planLis[i].classList.add('did');
      const next = sc.agents[(i + 1) % sc.agents.length][0];
      if (i < sc.plan.length - 1 && next !== name) line('feed-board', `<span class="k">handoff</span> ${esc(name)} &rarr; <b>${esc(next)}</b>`);
      await wait(250);
    }
    setRowState('board', 'ok', 'done');
    line('feed-board', `✓ ${sc.plan.length} steps done · ${stats.replans} re-plan${stats.replans === 1 ? '' : 's'}`, 'ok');

    // 4. Deliver: tests, exit condition, lesson written to memory, landing and results
    setPhase(4, knows ? 'Tests pass and the exit condition is met. Memory saved a re-plan this time.' : 'Tests pass, the exit condition is met, and the lesson is written to memory.',
      knows ? 'Same objective, fewer mistakes: that is what memory is for.' : 'Run this objective again and the swarm starts from this lesson.');
    stats.rate = 400;
    $('sw-col1').classList.remove('dim');
    for (const li of testLis) { li.classList.add('pass'); await wait(220); }
    $('sw-exit').classList.add('met');
    $('sw-exit').innerHTML = `<b>Exit condition met:</b> ${esc(sc.exit)}`;
    await wait(300);
    if (!knows) {
      // The lesson flies back to the hangar and docks as a new memory reel.
      const learned = makeUnit('memory', lessonName);
      learned.classList.add('learned');
      $('bay-memory').appendChild(learned);
      follow($('bay-memory'));
      const memUnit = spawn('memory', lessonName, { x: support.planner._p.x, y: support.planner._p.y }, { s: 0.4 });
      ring(memUnit._p, COLOR('memory'));
      await fly(memUnit, center(learned.querySelector('.bob')), { s: 1, dur: 1500, arc: 120 });
      memUnit.remove();
      learned.classList.add('in');
      ring(center(learned.querySelector('.bob')), COLOR('memory'));
      (LEARNED[indKey] = LEARNED[indKey] || []).push(lessonName);
      line('feed-auditor', `<span class="k">mem</span> lesson saved · ${esc(sc.lesson)}`);
    }
    line('feed-auditor', `✓ decision trail signed · #${hash()}`, 'ok');
    await wait(500);
    stats.done = true;
    line('feed-observability', `✓ all agents healthy · ${stats.replans} re-plan${stats.replans === 1 ? '' : 's'} · budget ${Math.min(79, Math.max(8, Math.round(stats.tokens / 3e6 * 100)))}% used`, 'ok');
    GOV.forEach(n => setRowState(n, 'ok', 'done'));

    const res = $('sw-results'), R = sc.result;
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    res.innerHTML = `<div class="sw-res-top"><span class="sw-res-badge">SIMULATED MISSION · COMPLETE</span><span style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">${esc(industry.label)} · ${esc(sc.title)}</span></div>
      <div class="sw-res-head">${esc(R.headline)}</div>
      <p class="sw-res-note">Projected figures from a simulated run, not live results.</p>
      <div class="sw-landing" id="sw-landing"></div>
      <div class="sw-kpis">${R.kpis.map(([v, l], i) => `<div class="sw-kpi" style="animation-delay:${i * 0.08}s"><strong data-v="${esc(v)}">${esc(v)}</strong><span>${esc(l)}</span></div>`).join('')}</div>
      <div class="sw-res-grid">
        <div class="sw-res-box"><h4>Delivered</h4><ul>${R.deliv.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div>
        <div class="sw-res-box" style="animation-delay:.08s"><h4>Checks passed</h4><ul class="chk">${sc.tests.map(t => `<li>${esc(t)}</li>`).join('')}<li>Exit: ${esc(sc.exit)}</li><li>Human decision: ${esc(stats.approval)}</li><li>Guardrails: 1 unsafe action blocked</li></ul></div>
        <div class="sw-res-box sw-res-learn" style="animation-delay:.16s"><h4>Learned for next time</h4><p><b>${esc(lessonName)}</b></p><p>${knows ? `Picked from memory at the start, so “${esc(sc.tests[sc.retry.test])}” passed first time. No re-plan needed.` : `First try failed: ${esc(sc.retry.why)}. The Planner ${esc(sc.retry.fix)}. That fix is now in memory: run this objective again to see it used.`}</p></div>
        <div class="sw-res-box" style="animation-delay:.24s"><h4>Mission stats</h4><div class="sw-stats">
          <div><b>${sc.agents.length + 3}</b>agents</div><div><b>${stats.tools}</b>tool calls</div><div><b>${stats.replans}</b>re-plan${stats.replans === 1 ? '' : 's'}</div>
          <div><b>${stats.tokens.toLocaleString('en-US')}</b>tokens</div><div><b>$${(stats.tokens * 0.000006).toFixed(2)}</b>model cost</div><div><b>${secs}s</b>flight time</div></div></div>
      </div>`;
    res.classList.add('landed');
    follow(res);
    await wait(350);
    const land = $('sw-landing'), lr = center(land), w = land.offsetWidth;
    squad.forEach(d => d.classList.remove('small'));
    const gap = Math.min(110, (w - 60) / squad.length);
    await Promise.all(squad.map((d, i) => fly(d, { x: lr.x + (i - (squad.length - 1) / 2) * gap, y: lr.y - 8 }, { s: 0.75, dur: 1400, arc: 80, delay: i * 70 })));
    res.querySelectorAll('.sw-kpi strong').forEach(countUp);
    document.querySelectorAll('#sw-stepper li').forEach(li => li.classList.add('done'));
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
    loadScenario();
    resetStage();
    $('sw-objective').addEventListener('change', () => { loadScenario(); resetStage(); });
    $('sw-kick').addEventListener('click', launch);
    $('sw-reset').addEventListener('click', resetStage);
    $('sw-speed').addEventListener('change', e => { K.setSpeed(+e.target.value); });
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
