/* =============================================================================
   SPEECH MATCHING (no DOM, so it can be tested in Node)
   Turns what the recogniser heard into tokens and aligns them with the script.

   The English coach in communication-skill-prep compares Latin letters only.
   Telugu and Hindi need more, because the recogniser may return:
     - the same word in another script ("Python", "పైథాన్", "पायथन")
     - digits for a spoken number ("40,000", "₹40000", "40 हज़ार")
     - one word as two, or two as one ("Databricks" / "data bricks")
     - a spelling variant ("हज़ार" / "हजार", "కోర్సు" / "కోర్స్")
   ============================================================================= */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Glossary: every spelling of a word the recogniser may return.
  // Spoken forms with spaces ("ఏ ఐ") are joined before tokenising.
  // ---------------------------------------------------------------------------
  const TERMS = {
    ai: ['ai', 'a.i', 'a i', 'ఏఐ', 'ఏ ఐ', 'ఎఐ', 'ఎఏఐ', 'ए आई', 'एआई', 'ए.आई', 'ऐ आई'],
    aws: ['aws', 'a w s', 'ఏడబ్ల్యూఎస్', 'ఏ డబ్ల్యూ ఎస్', 'ఎడబ్ల్యూఎస్', 'एडब्ल्यूएस', 'ए डब्ल्यू एस', 'एडब्लूएस'],
    azure: ['azure', 'ajar', 'ajur', 'అజూర్', 'అజుర్', 'ఆజర్', 'అజ్యూర్', 'एज़्योर', 'एज्योर', 'अज़ूर', 'अजूर', 'ऐज़र', 'एजर'],
    bedrock: ['bedrock', 'bed rock', 'బెడ్రాక్', 'బెడ్ రాక్', 'बेडरॉक', 'बेड रॉक'],
    foundry: ['foundry', 'ఫౌండ్రీ', 'ఫౌండ్రి', 'फाउंड्री', 'फाउन्ड्री'],
    snowflake: ['snowflake', 'snow flake', 'స్నోఫ్లేక్', 'స్నో ఫ్లేక్', 'स्नोफ्लेक', 'स्नो फ्लेक'],
    databricks: ['databricks', 'data bricks', 'డేటాబ్రిక్స్', 'డేటా బ్రిక్స్', 'డాటాబ్రిక్స్', 'डेटाब्रिक्स', 'डेटा ब्रिक्स', 'डाटाब्रिक्स'],
    pyspark: ['pyspark', 'py spark', 'pi spark', 'పైస్పార్క్', 'పై స్పార్క్', 'पायस्पार्क', 'पाई स्पार्क', 'पाय स्पार्क'],
    python: ['python', 'పైథాన్', 'పైతాన్', 'పైథన్', 'पायथन', 'पाइथन', 'पाईथन'],
    fastapi: ['fastapi', 'fast api', 'ఫాస్ట్ఏపీఐ', 'ఫాస్ట్ ఏపీఐ', 'ఫాస్ట్ ఏపిఐ', 'फास्टएपीआई', 'फास्ट एपीआई', 'फ़ास्ट एपीआई', 'फास्ट ए पी आई'],
    api: ['api', 'apis', 'a p i', 'ఏపీఐ', 'ఏ పి ఐ', 'एपीआई', 'ए पी आई'],
    sql: ['sql', 's q l', 'sequel', 'ఎస్క్యూఎల్', 'ఎస్ క్యూ ఎల్', 'సీక్వెల్', 'एसक्यूएल', 'एस क्यू एल', 'सीक्वल'],
    java: ['java', 'జావా', 'जावा'],
    react: ['react', 'రియాక్ట్', 'रिएक्ट', 'रीएक्ट'],
    angular: ['angular', 'యాంగ్యులర్', 'ఆంగ్యులర్', 'అంగులర్', 'యాంగులర్', 'एंगुलर', 'अंगुलर', 'ऐंगुलर'],
    spring: ['spring', 'స్ప్రింగ్', 'स्प्रिंग'],
    boot: ['boot', 'బూట్', 'बूट'],
    power: ['power', 'పవర్', 'పవర్', 'पावर'],
    bi: ['bi', 'b i', 'బీఐ', 'బి ఐ', 'బిఐ', 'బీ ఐ', 'बीआई', 'बी आई'],
    full: ['full', 'ఫుల్', 'फुल', 'फ़ुल'],
    stack: ['stack', 'స్టాక్', 'स्टैक', 'स्टाक'],
    next: ['next', 'నెక్స్ట్', 'नेक्स्ट'],
    node: ['node', 'నోడ్', 'नोड'],
    js: ['js', 'j s', 'జేఎస్', 'జే ఎస్', 'జెఎస్', 'जेएस', 'जे एस'],
    nodejs: ['nodejs', 'node.js'],
    nextjs: ['nextjs', 'next.js'],
    c: ['c', 'సి', 'సీ', 'सी'],
    sharp: ['sharp', 'షార్ప్', 'शार्प'],
    data: ['data', 'డేటా', 'డాటా', 'డెటా', 'डेटा', 'डाटा'],
    engineer: ['engineer', 'ఇంజనీర్', 'ఇంజినీర్', 'ఇంజనీరు', 'इंजीनियर', 'इंजिनियर', 'इन्जीनियर'],
    developer: ['developer', 'డెవలపర్', 'డెవలపరు', 'डेवलपर', 'डेवेलपर'],
    deployment: ['deployment', 'డిప్లాయ్మెంట్', 'డిప్లాయ్ మెంట్', 'డిప్లాయిమెంట్', 'डिप्लॉयमेंट', 'डिप्लॉय मेंट', 'डिप्लोयमेंट'],
    forward: ['forward', 'ఫార్వర్డ్', 'ఫార్వార్డ్', 'फॉरवर्ड', 'फॉर्वर्ड', 'फारवर्ड'],
    governance: ['governance', 'గవర్నెన్స్', 'गवर्नेंस', 'गवर्नन्स'],
    agentic: ['agentic', 'ఏజెంటిక్', 'ఎజెంటిక్', 'ఏజెంటిక', 'एजेंटिक', 'एजेन्टिक'],
    purview: ['purview', 'పర్వ్యూ', 'పర్ వ్యూ', 'पर्व्यू', 'पर्व्यु', 'पर व्यू'],
    langgraph: ['langgraph', 'lang graph', 'లాంగ్గ్రాఫ్', 'లాంగ్ గ్రాఫ్', 'लैंगग्राफ', 'लैंग ग्राफ', 'लैंग ग्राफ़', 'लैंगग्राफ़'],
    crewai: ['crewai', 'crew ai', 'క్రూఏఐ', 'క్రూ ఏఐ', 'क्रूएआई', 'क्रू एआई'],
    glue: ['glue', 'గ్లూ', 'ग्लू'],
    athena: ['athena', 'ఎథీనా', 'అథీనా', 'ఏథేనా', 'एथेना', 'अथीना'],
    redshift: ['redshift', 'red shift', 'రెడ్షిఫ్ట్', 'రెడ్ షిఫ్ట్', 'रेडशिफ्ट', 'रेड शिफ्ट'],
    snowpipe: ['snowpipe', 'snow pipe', 'స్నోపైప్', 'స్నో పైప్', 'स्नोपाइप', 'स्नो पाइप'],
    snowpark: ['snowpark', 'snow park', 'స్నోపార్క్', 'స్నో పార్క్', 'स्नोपार्क', 'स्नो पार्क'],
    spark: ['spark', 'స్పార్క్', 'स्पार्क'],
    apache: ['apache', 'అపాచీ', 'అపాచి', 'अपाचे', 'अपाची'],
    delta: ['delta', 'డెల్టా', 'डेल्टा'],
    lake: ['lake', 'లేక్', 'लेक'],
    factory: ['factory', 'ఫ్యాక్టరీ', 'फैक्ट्री', 'फैक्टरी'],
    synapse: ['synapse', 'సినాప్స్', 'సైనాప్స్', 'सिनैप्स', 'साइनैप्स'],
    server: ['server', 'సర్వర్', 'सर्वर'],
    html: ['html', 'h t m l', 'హెచ్టీఎంఎల్', 'హెచ్ టీ ఎం ఎల్', 'एचटीएमएल', 'एच टी एम एल'],
    css: ['css', 'c s s', 'సీఎస్ఎస్', 'సీ ఎస్ ఎస్', 'सीएसएस', 'सी एस एस'],
    javascript: ['javascript', 'java script', 'జావాస్క్రిప్ట్', 'జావా స్క్రిప్ట్', 'जावास्क्रिप्ट', 'जावा स्क्रिप्ट'],
    excel: ['excel', 'ఎక్సెల్', 'एक्सेल'],
    dotnet: ['.net', 'dotnet', 'dot net', 'డాట్నెట్', 'డాట్ నెట్', 'डॉटनेट', 'डॉट नेट'],
    tinitiate: ['tinitiate', 't initiate', 'ti initiate', 'టినిషియేట్', 'టీ ఇనిషియేట్', 'టి ఇనిషియేట్', 'టినిటియేట్', 'टिनिशिएट', 'टी इनिशिएट', 'टिनिटिएट'],
    upi: ['upi', 'u p i', 'యూపీఐ', 'యూ పీ ఐ', 'यूपीआई', 'यू पी आई'],
    gcp: ['gcp', 'g c p', 'జీసీపీ', 'జీ సీ పీ', 'जीसीपी', 'जी सी पी'],
    prime: ['prime', 'ప్రైమ్', 'प्राइम'],
    apex: ['apex', 'ఏపెక్స్', 'अपेक्स', 'एपेक्स'],
    qr: ['qr', 'q r', 'క్యూఆర్', 'క్యూ ఆర్', 'क्यूआर', 'क्यू आर'],
    zoom: ['zoom', 'జూమ్', 'ज़ूम', 'जूम'],
    youtube: ['youtube', 'you tube', 'యూట్యూబ్', 'यूट्यूब'],
    whatsapp: ['whatsapp', 'whats app', 'వాట్సాప్', 'వాట్సప్', 'व्हाट्सएप', 'वॉट्सऐप', 'व्हाट्सऐप'],
    online: ['online', 'on line', 'ఆన్లైన్', 'ఆన్ లైన్', 'ऑनलाइन', 'ऑन लाइन'],
    demo: ['demo', 'డెమో', 'డెమొ', 'डेमो'],
    course: ['course', 'courses', 'కోర్సు', 'కోర్స్', 'కోర్సులు', 'कोर्स', 'कोर्सेज'],
    fee: ['fee', 'fees', 'ఫీజు', 'ఫీ', 'ఫీజ్', 'फीस', 'फ़ीस', 'फी'],
    class: ['class', 'classes', 'క్లాస్', 'క్లాసు', 'క్లాసులు', 'క్లాసెస్', 'क्लास', 'क्लासेस', 'क्लासेज'],
    project: ['project', 'projects', 'ప్రాజెక్ట్', 'ప్రాజెక్టు', 'ప్రాజెక్టులు', 'ప్రాజెక్ట్స్', 'प्रोजेक्ट', 'प्रोजेक्ट्स'],
    recording: ['recording', 'recordings', 'రికార్డింగ్', 'రికార్డింగులు', 'రికార్డింగ్స్', 'रिकॉर्डिंग', 'रिकॉर्डिंग्स', 'रिकार्डिंग'],
    resume: ['resume', 'రెజ్యూమె', 'రెజ్యూమ్', 'రెస్యూమ్', 'రెస్యూమె', 'रिज्यूमे', 'रेज़्यूमे', 'रिज़्यूमे', 'रेज्यूमे'],
    rupees: ['rupees', 'rupee', 'rs', 'రూపాయలు', 'రూపాయిలు', 'రూపాయల', 'రూపాయి', 'रुपये', 'रुपए', 'रूपये', 'रुपया', 'रूपए']
  };

  const VARIANT = {};              // single token -> canonical
  const JOINS = [];                // multi-token spoken form -> canonical
  Object.keys(TERMS).forEach(key => {
    TERMS[key].forEach(form => {
      const low = form.toLowerCase();
      if (low.includes(' ')) JOINS.push([low, key]);
      else VARIANT[low.replace(/\./g, '')] = key;
    });
  });
  JOINS.sort((a, b) => b[0].length - a[0].length);

  // English only: words a recogniser cannot tell apart by sound alone
  const HOMOPHONES = [['to', 'too', 'two'], ['for', 'four'], ['right', 'write'], ['hear', 'here'], ['new', 'knew'], ['by', 'buy', 'bye'],
    ['their', 'there'], ['one', 'won'], ['no', 'know'], ['week', 'weak'], ['hours', 'ours'], ['role', 'roll']];
  const CANON = {};
  HOMOPHONES.forEach(g => g.forEach(w => { CANON[w] = g[0]; }));

  const CONTRACTIONS = { "i'm": 'i am', "it's": 'it is', "that's": 'that is', "let's": 'let us', "what's": 'what is', "we've": 'we have',
    "you've": 'you have', "i'll": 'i will', "we'll": 'we will', "you'll": 'you will', "we're": 'we are', "you're": 'you are',
    "don't": 'do not', "doesn't": 'does not', "can't": 'cannot', "won't": 'will not', "isn't": 'is not', "aren't": 'are not' };

  // ---------------------------------------------------------------------------
  // Numbers: the recogniser writes "40,000"; the script says it in words
  // ---------------------------------------------------------------------------
  const NUM = {
    en: { 0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 15: 'fifteen', 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', thousand: 'thousand' },
    te: { 1: 'ఒకటి', 2: 'రెండు', 3: 'మూడు', 4: 'నాలుగు', 5: 'ఐదు', 6: 'ఆరు', 7: 'ఏడు', 8: 'ఎనిమిది', 9: 'తొమ్మిది', 10: 'పది', 15: 'పదిహేను', 20: 'ఇరవై', 30: 'ముప్పై', 40: 'నలభై', 50: 'యాభై', 60: 'అరవై', thousand: 'వేల' },
    hi: { 1: 'एक', 2: 'दो', 3: 'तीन', 4: 'चार', 5: 'पांच', 6: 'छह', 7: 'सात', 8: 'आठ', 9: 'नौ', 10: 'दस', 15: 'पंद्रह', 20: 'बीस', 30: 'तीस', 40: 'चालीस', 50: 'पचास', 60: 'साठ', thousand: 'हज़ार' }
  };
  function numberWords(n, lang) {
    const t = NUM[lang];
    if (t[n]) return [t[n]];
    if (n % 1000 === 0 && t[n / 1000]) return [t[n / 1000], t.thousand];
    return [String(n)];
  }

  // ---------------------------------------------------------------------------
  // Phonetic key: one spelling for all three scripts.
  // Devanagari and Telugu share a Unicode layout, so one table covers both,
  // indexed by offset from the block start.
  // ---------------------------------------------------------------------------
  const K = { 0x15: 'k', 0x16: 'k', 0x17: 'g', 0x18: 'g', 0x19: 'n', 0x1a: 'c', 0x1b: 'c', 0x1c: 'j', 0x1d: 'j', 0x1e: 'n',
    0x1f: 't', 0x20: 't', 0x21: 'd', 0x22: 'd', 0x23: 'n', 0x24: 't', 0x25: 't', 0x26: 'd', 0x27: 'd', 0x28: 'n',
    0x2a: 'p', 0x2b: 'f', 0x2c: 'b', 0x2d: 'b', 0x2e: 'm', 0x2f: 'y', 0x30: 'r', 0x31: 'r', 0x32: 'l', 0x33: 'l', 0x35: 'v',
    0x36: 's', 0x37: 's', 0x38: 's', 0x39: 'h' };
  const V = { 0x05: '', 0x06: '', 0x07: 'i', 0x08: 'i', 0x09: 'u', 0x0a: 'u', 0x0b: 'r', 0x0e: 'e', 0x0f: 'e', 0x10: 'e', 0x12: 'o', 0x13: 'o', 0x14: 'o',
    0x3e: '', 0x3f: 'i', 0x40: 'i', 0x41: 'u', 0x42: 'u', 0x43: 'r', 0x46: 'e', 0x47: 'e', 0x48: 'e', 0x4a: 'o', 0x4b: 'o', 0x4c: 'o',
    0x01: 'n', 0x02: 'n' };
  function phonetic(word) {
    let out = '';
    for (const ch of word.normalize('NFD')) {
      const c = ch.codePointAt(0);
      const base = c >= 0x900 && c <= 0x97f ? 0x900 : c >= 0xc00 && c <= 0xc7f ? 0xc00 : 0;
      if (base) {
        const o = c - base;
        if (K[o] !== undefined) out += K[o]; else if (V[o] !== undefined) out += V[o];
      } else if (/[a-z0-9]/.test(ch)) {
        out += ch === 'a' ? '' : ch === 'q' ? 'k' : ch === 'w' ? 'v' : ch === 'x' ? 'ks' : ch === 'z' ? 'j' : ch === 'c' ? 'k' : ch;
      }
    }
    return out;
  }

  const stripMarks = s => s.normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/[’‘]/g, "'");
  const wordChars = /[^\p{L}\p{M}\p{N}']/gu;

  // One comparable token. Glossary words collapse to their canonical key.
  function normalizeToken(raw) {
    const w = stripMarks(raw).toLowerCase().replace(wordChars, '').replace(/'/g, '');
    return VARIANT[w] || w;
  }

  // Script text -> one token per word on screen
  function tokenizeScript(words) { return words.map(normalizeToken); }

  // Recognised text -> comparable tokens
  function tokenizeSpoken(text, lang) {
    let s = ' ' + stripMarks(text).toLowerCase().replace(/(\d),(?=\d)/g, '$1').replace(/[।॥]/g, ' ') + ' ';
    JOINS.forEach(([form, key]) => {
      if (s.includes(form)) s = s.split(new RegExp('(?<![\\p{L}\\p{M}])' + form.replace(/[.]/g, '\\.') + '(?![\\p{L}\\p{M}])', 'u')).join(key);
    });
    const out = [];
    s.split(/[\s\-–—/,;:!?()]+/).forEach(raw => {
      if (!raw) return;
      const rupee = /^(₹|rs\.?|రూ\.?|रु\.?)(\d+)/.exec(raw);
      if (rupee) { out.push(...numberWords(parseInt(rupee[2], 10), lang), 'rupees'); return; }
      const bare = raw.replace(wordChars, '');
      if (!bare) return;
      if (lang === 'en' && CONTRACTIONS[bare]) { out.push(...CONTRACTIONS[bare].split(' ')); return; }
      if (/^\d+$/.test(bare)) { out.push(...numberWords(parseInt(bare, 10), lang)); return; }
      // "30వేల", "40हज़ार": digits glued to a word
      const glued = /^(\d+)(\D+)$/.exec(bare);
      if (glued) { out.push(...numberWords(parseInt(glued[1], 10), lang), normalizeToken(glued[2])); return; }
      const w = normalizeToken(bare);
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
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return 1 - prev[n] / Math.max(m, n);
  }

  // 'ok' counts as the expected word, 'near' looks like a misreading, else 'diff'
  const cache = new Map();
  function compare(expected, heard) {
    const key = expected + '|' + heard;
    let c = cache.get(key);
    if (c === undefined) { c = compareUncached(expected, heard); cache.set(key, c); }
    return c;
  }
  function compareUncached(expected, heard) {
    if (expected === heard) return 'ok';
    if ((CANON[expected] || expected) === (CANON[heard] || heard)) return 'ok';
    const pe = phonetic(expected), ph = phonetic(heard);
    if (pe && pe === ph) return 'ok';
    const s = similarity(pe, ph);
    // Small differences on longer words are the recogniser, not the reader
    if (Math.max(pe.length, ph.length) >= 5 && s >= 0.8) return 'ok';
    return s >= 0.5 ? 'near' : 'diff';
  }

  // ---------------------------------------------------------------------------
  // Alignment: edit distance between the spoken tokens and the script, with the
  // script tail free so a partial reading lines up with its prefix. Two extra
  // moves cover words the recogniser splits or merges.
  // ---------------------------------------------------------------------------
  const subCost = c => (c === 'ok' ? 0 : c === 'near' ? 0.5 : 0.8);
  const EPS = 1e-4;
  function align(passage, spoken) {
    const n = passage.length, m = spoken.length;
    const D = [new Float64Array(n + 1)];
    for (let j = 1; j <= n; j++) D[0][j] = j;
    for (let i = 1; i <= m; i++) {
      D[i] = new Float64Array(n + 1);
      D[i][0] = i;
      for (let j = 1; j <= n; j++) {
        let best = Math.min(D[i - 1][j - 1] + subCost(compare(passage[j - 1], spoken[i - 1])), D[i - 1][j] + 1, D[i][j - 1] + 1);
        if (j > 1 && compare(passage[j - 2] + passage[j - 1], spoken[i - 1]) === 'ok') best = Math.min(best, D[i - 1][j - 2]);
        if (i > 1 && compare(passage[j - 1], spoken[i - 2] + spoken[i - 1]) === 'ok') best = Math.min(best, D[i - 2][j - 1]);
        D[i][j] = best;
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
        const c = compare(passage[j - 1], spoken[i - 1]);
        if (Math.abs(D[i][j] - (D[i - 1][j - 1] + subCost(c))) < EPS) {
          status[j - 1] = c === 'ok' ? 'ok' : 'miss';
          heardAs[j - 1] = spoken[i - 1];
          i--; j--;
          continue;
        }
        if (j > 1 && compare(passage[j - 2] + passage[j - 1], spoken[i - 1]) === 'ok' && Math.abs(D[i][j] - D[i - 1][j - 2]) < EPS) {
          status[j - 1] = status[j - 2] = 'ok';
          i--; j -= 2;
          continue;
        }
        if (i > 1 && compare(passage[j - 1], spoken[i - 2] + spoken[i - 1]) === 'ok' && Math.abs(D[i][j] - D[i - 2][j - 1]) < EPS) {
          status[j - 1] = 'ok';
          i -= 2; j--;
          continue;
        }
      }
      if (j > 0 && (i === 0 || Math.abs(D[i][j] - (D[i][j - 1] + 1)) < EPS)) {
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
  // Scoring. Telugu carries more meaning per word than English, so it has fewer
  // words per minute at the same speaking speed. These ranges are generous.
  // ---------------------------------------------------------------------------
  const PACE = { en: [100, 160], hi: [90, 150], te: [70, 130] };
  function scoreAttempt(a, total, ms, lang) {
    const count = s => a.status.filter(x => x === s).length;
    const ok = count('ok'), miss = count('miss'), skip = count('skip');
    const notReached = total - a.reached;
    const attempted = ok + miss + skip;
    const minutes = ms / 60000;
    const wpm = minutes > 0 ? Math.round((ok + miss) / minutes) : 0;
    const [lo, hi] = PACE[lang];
    const accuracy = attempted ? (ok / attempted) * 100 : 0;
    const completion = (a.reached / total) * 100;
    let pace = 0;
    if (ok + miss > 0) pace = wpm < lo ? Math.max(0, 100 - (lo - wpm) * 1.5) : wpm > hi ? Math.max(0, 100 - (wpm - hi) * 1.5) : 100;
    const extraPenalty = Math.min(10, a.extras.length);
    const score = attempted ? Math.max(0, Math.round(accuracy * 0.6 + completion * 0.25 + pace * 0.15 - extraPenalty)) : 0;
    return { ok, miss, skip, notReached, attempted, wpm, accuracy, completion, pace, score };
  }

  const api = { TERMS, PACE, phonetic, normalizeToken, tokenizeScript, tokenizeSpoken, compare, align, scoreAttempt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpeechMatch = api;
})(typeof window !== 'undefined' ? window : globalThis);
