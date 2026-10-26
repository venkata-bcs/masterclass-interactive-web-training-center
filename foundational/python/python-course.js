// Python Foundations: shared slide engine and course content.
// Slide examples follow github.com/tinitiateprime/python
// (python-core-language/python-print, python-variables, python-datatypes, python-operators, python-strings, python-lists).
// Each page sets data-py-page on <main>: "home" or a key of DECKS ("print", "variables", "datatypes", "operators", "strings", "lists").
const PyCourse = (() => {
  const py = String.raw;

  // ---------- HTML + Python literal helpers ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function lit(s, pref = "'") {
    const other = pref === "'" ? '"' : "'";
    const q = (s.includes(pref) && !s.includes(other)) ? other : pref;
    return q + s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t').split(q).join('\\' + q) + q;
  }
  const repr = s => lit(s, "'");
  // repr() of a Python float: scientific notation below 1e-4 and from 1e16, like CPython.
  function pyFloat(n) {
    if (!Number.isFinite(n)) return Number.isNaN(n) ? 'nan' : (n > 0 ? 'inf' : '-inf');
    if (Object.is(n, -0)) return '-0.0';
    const a = Math.abs(n);
    if (a !== 0 && (a >= 1e16 || a < 1e-4)) {
      const [m, e] = n.toExponential().split('e');
      return m + 'e' + (e[0] === '-' ? '-' : '+') + e.replace(/^[+-]/, '').padStart(2, '0');
    }
    return Number.isInteger(n) ? n.toFixed(1) : String(n);
  }
  const toInt = (v, d = 0) => { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : d; };
  const pyBool = b => (b ? 'True' : 'False');
  const listRepr = arr => '[' + arr.map(repr).join(', ') + ']';
  const tb = (line, msg) => `Traceback (most recent call last):\n  File "demo.py", line ${line}, in <module>\n${msg}`;

  // ---------- Python string method emulation ----------
  const WS = ' \t\n\r\x0b\x0c';
  const isCased = ch => ch.toUpperCase() !== ch.toLowerCase();
  function pyTitle(s) {
    let prev = false, out = '';
    for (const ch of s) { if (isCased(ch)) { out += prev ? ch.toLowerCase() : ch.toUpperCase(); prev = true; } else { out += ch; prev = false; } }
    return out;
  }
  const pySwap = s => [...s].map(ch => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())).join('');
  const pyCap = s => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);
  function pyIsUpper(s) { let c = false; for (const ch of s) { if (isCased(ch)) { c = true; if (ch !== ch.toUpperCase()) return false; } } return c; }
  function pyIsLower(s) { let c = false; for (const ch of s) { if (isCased(ch)) { c = true; if (ch !== ch.toLowerCase()) return false; } } return c; }
  const pyIsAlpha = s => /^\p{L}+$/u.test(s);
  const pyIsDigit = s => /^\p{Nd}+$/u.test(s);
  const pyIsNumeric = s => /^\p{N}+$/u.test(s);
  const pyIsAlnum = s => /^[\p{L}\p{N}]+$/u.test(s);
  const pyIsSpace = s => /^\s+$/.test(s);
  function pyStrip(s, chars, side) {
    const set = chars == null ? WS : chars;
    let a = 0, b = s.length;
    if (side !== 'r') while (a < b && set.includes(s[a])) a++;
    if (side !== 'l') while (b > a && set.includes(s[b - 1])) b--;
    return s.slice(a, b);
  }
  function pyCenter(s, w, f) {
    const marg = w - s.length;
    if (marg <= 0) return s;
    const left = Math.floor(marg / 2) + (marg & w & 1);
    return f.repeat(left) + s + f.repeat(marg - left);
  }
  function pySplit(s, sep) {
    if (sep == null) return s.split(/\s+/).filter(Boolean);
    return s.split(sep);
  }
  // Indices selected by s[start:stop:step], following CPython's slice rules.
  function pySliceIdx(len, start, stop, step) {
    const out = [];
    if (step > 0) {
      const a = start == null ? 0 : (start < 0 ? Math.max(start + len, 0) : Math.min(start, len));
      const b = stop == null ? len : (stop < 0 ? Math.max(stop + len, 0) : Math.min(stop, len));
      for (let i = a; i < b; i += step) out.push(i);
    } else {
      const a = start == null ? len - 1 : (start < 0 ? Math.max(start + len, -1) : Math.min(start, len - 1));
      const b = stop == null ? -1 : (stop < 0 ? Math.max(stop + len, -1) : Math.min(stop, len - 1));
      for (let i = a; i > b; i += step) out.push(i);
    }
    return out;
  }
  // Fills '{}', '{0}', '{name}' fields the way str.format() does.
  function pyFormat(tpl, args, kw = {}) {
    let auto = 0;
    return tpl.replace(/\{(\w*)\}/g, (m, k) => {
      if (k === '') return String(args[auto++]);
      if (/^\d+$/.test(k)) return String(args[+k]);
      return String(kw[k]);
    });
  }

  // ---------- Python literal parsing for the datatype slides ----------
  function parseToken(t) {
    t = t.trim();
    if (/^[+-]?\d+$/.test(t)) return { repr: String(parseInt(t, 10)), key: 'n:' + parseInt(t, 10), num: parseInt(t, 10) };
    if (/^[+-]?(\d+\.\d*|\.\d+)$/.test(t)) return { repr: pyFloat(parseFloat(t)), key: 'n:' + parseFloat(t), num: parseFloat(t) };
    if (t === 'True' || t === 'False') return { repr: t, key: 'n:' + (t === 'True' ? 1 : 0), num: t === 'True' ? 1 : 0, bool: true };
    if (t === 'None') return { repr: 'None', key: 'None' };
    const m = t.match(/^(['"])(.*)\1$/);
    const s = m ? m[2] : t;
    return { repr: repr(s), key: 's:' + s };
  }
  const parseItems = text => text.split(',').map(x => x.trim()).filter(Boolean).map(parseToken);
  function setItems(text) {
    const seen = new Map();
    parseItems(text).forEach(it => { if (!seen.has(it.key)) seen.set(it.key, it); });
    const items = [...seen.values()];
    // CPython keeps small non-negative ints in ascending order; anything else has no guaranteed order.
    if (items.every(i => Number.isInteger(i.num) && !i.bool && i.num >= 0)) items.sort((a, b) => a.num - b.num);
    return items;
  }
  function hasTopLevel(s, ch) {
    let depth = 0, q = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") q = c;
      else if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) depth--;
      else if (c === ch && depth === 0) return true;
    }
    return false;
  }
  function detectType(src) {
    const t = src.trim();
    if (!t) return { err: 'SyntaxError: invalid syntax' };
    if (/^(True|False)$/.test(t)) return 'bool';
    if (t === 'None') return 'NoneType';
    if (/^[+-]?(\d[\d_]*|0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+)$/.test(t)) return 'int';
    if (/^[+-]?((\d+\.\d*|\.\d+)([eE][+-]?\d+)?|\d+[eE][+-]?\d+)$/.test(t)) return 'float';
    if (/^[+-]?(\d+(\.\d*)?\s*[+-]\s*)?(\d+(\.\d*)?|\.\d+)[jJ]$/.test(t)) return 'complex';
    if (/^[rRuUfF]?("""[\s\S]*"""|'''[\s\S]*'''|"[^"\n]*"|'[^'\n]*')$/.test(t)) return 'str';
    if (/^[bB][rR]?("[^"\n]*"|'[^'\n]*')$/.test(t)) return 'bytes';
    const call = t.match(/^(int|float|complex|str|list|tuple|dict|set|frozenset|bool|bytes|range)\([\s\S]*\)$/);
    if (call) return call[1];
    if (/^\[[\s\S]*\]$/.test(t)) return 'list';
    if (/^\([\s\S]*\)$/.test(t)) { const inner = t.slice(1, -1).trim(); return (!inner || hasTopLevel(inner, ',')) ? 'tuple' : detectType(inner); }
    if (/^\{[\s\S]*\}$/.test(t)) { const inner = t.slice(1, -1).trim(); return (!inner || hasTopLevel(inner, ':')) ? 'dict' : 'set'; }
    if (/^[A-Za-z_]\w*$/.test(t)) return { err: `NameError: name '${t}' is not defined` };
    return { note: 'Type just ONE value. Examples: 42, 3.14, \'hi\', [1, 2], (1, 2), {\'a\': 1}, {1, 2}, True, None' };
  }
  const TYPE_PLAIN = {
    int: 'a whole number', float: 'a number with a decimal point', complex: 'a complex number (used in advanced maths)', str: 'text', list: 'a list you can change',
    tuple: 'a list that cannot change', dict: 'a look-up table of key: value pairs', set: 'a bag of unique items', frozenset: 'a bag of unique items that cannot change',
    bool: 'a yes/no value', NoneType: '"nothing here"', bytes: 'raw bytes (for files and networks)', range: 'a sequence of numbers'
  };

  // ---------- Visual builders ----------
  function cellsHTML(s, on = [], showNeg = true) {
    const onSet = new Set(on);
    return '<div class="py-cells">' + [...s].map((ch, i) =>
      `<div class="py-cell${onSet.has(i) ? ' on' : ''}"><span class="ix">${i}</span><span class="ch">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>${showNeg ? `<span class="ix">${i - s.length}</span>` : ''}</div>`).join('') + '</div>';
  }
  const showWs = s => esc(s).replace(/ /g, '&#9251;').replace(/\n/g, '\\n') || '&empty;';
  function tokensHTML(parts, sep) {
    return '<div class="py-tokens">' + parts.map((p, i) => (i ? `<span class="py-token sep" title="separator">${showWs(sep)}</span>` : '') + `<span class="py-token">${esc(p)}</span>`).join('') + '</div>';
  }
  const badges = list => '<div class="py-badges">' + list.map(([label, yes]) => `<span class="py-badge ${yes ? 'yes' : 'no'}">${yes ? '&#10003;' : '&#10007;'} ${label}</span>`).join('') + '</div>';
  const propBadges = (ordered, mutable, dupes) => badges([['Keeps order', ordered], ['Can be changed', mutable], ['Repeats allowed', dupes]]);
  const anatomy = parts => '<div class="py-anatomy">' + parts.map(([code, label, color], i) => `<div style="--part:${color};animation-delay:${i * 0.1}s"><code>${esc(code)}</code><span>${label}</span></div>`).join('') + '</div>';
  const varBox = (label, value, note) => `<div class="py-varbox"><span class="lid">${esc(label)}</span><span class="body">${esc(value)}</span>${note ? `<small>${esc(note)}</small>` : ''}</div>`;
  const C = { cmd: '#38bdf8', brk: '#a78bfa', txt: '#34d399', op: '#facc15', red: '#f87171' };
  const boxRow = parts => '<div class="py-varrow">' + parts.join('') + '</div>';
  const arrow = '<span class="py-arrow" aria-hidden="true">&rarr;</span>';
  const goneBox = (label, value, note) => varBox(label, value, note).replace('py-varbox', 'py-varbox gone');
  const resultTable = (head, rows) => `<table class="py-table"><thead><tr><th>${head[0]}</th><th>${head[1]}</th></tr></thead><tbody>` +
    rows.map(r => `<tr${r[2] ? ' class="on"' : ''}><td>${esc(r[0])}</td><td style="font-family:var(--font-mono);color:#fff;">${esc(r[1])}</td></tr>`).join('') + '</tbody></table>';
  const recapTable = rows => '<table class="py-table"><thead><tr><th>You want to…</th><th>Write</th></tr></thead><tbody>' +
    rows.map(r => `<tr><td style="font-family:inherit;color:#e2e8f0;font-weight:600;">${r[0]}</td><td style="font-family:var(--font-mono);color:#fde68a;">${esc(r[1])}</td></tr>`).join('') + '</tbody></table>';

  // ---------- Helpers for the variables, operators and lists slides ----------
  const PY_KEYWORDS = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
    'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']);
  const isStrItem = it => it.key.startsWith('s:');
  const shown = it => (isStrItem(it) ? it.key.slice(2) : it.repr); // what print() shows for one item
  const itemsRepr = items => '[' + items.map(i => i.repr).join(', ') + ']';
  const pyTypeName = it => (it.bool ? 'bool' : it.key === 'None' ? 'NoneType' : isStrItem(it) ? 'str' : /[.e]/.test(it.repr) ? 'float' : 'int');
  const comparable = (a, b) => (a.num != null && b.num != null) || (isStrItem(a) && isStrItem(b));
  const pyLess = (a, b) => (a.num != null ? a.num < b.num : a.key.slice(2) < b.key.slice(2));
  const notSupported = (op, a, b) => `TypeError: '${op}' not supported between instances of '${pyTypeName(a)}' and '${pyTypeName(b)}'`;
  const intsFrom = text => text.split(',').map(x => x.trim()).filter(x => /^[+-]?\d+$/.test(x)).map(x => parseInt(x, 10));
  const sameItems = (a, b) => a.length === b.length && a.every((it, i) => it.key === b[i].key);
  function listCellsHTML(items, on = [], showNeg = true, cls = 'on') {
    if (!items.length) return '<div class="py-cells"><div class="py-cell"><span class="ix">&nbsp;</span><span class="ch wide">[ ] empty</span></div></div>';
    const onSet = new Set(on), n = items.length;
    return '<div class="py-cells">' + items.map((it, i) => `<div class="py-cell${onSet.has(i) ? ' ' + cls : ''}"><span class="ix">${i}</span><span class="ch wide">${esc(it.repr)}</span>${showNeg ? `<span class="ix">${i - n}</span>` : ''}</div>`).join('') + '</div>';
  }
  // Python arithmetic on ints (BigInt) and floats (Number), with CPython's floor-division rules and error messages.
  function pyArith(a, op, b) {
    const isF = typeof a === 'number' || typeof b === 'number';
    if (op === '/') {
      if (Number(b) === 0) return { err: `ZeroDivisionError: ${isF ? 'float ' : ''}division by zero` };
      return { v: Number(a) / Number(b) };
    }
    if (op === '**') {
      if (!isF && b >= 0n) return { v: a ** b };
      if (Number(a) === 0 && Number(b) < 0) return { err: 'ZeroDivisionError: 0.0 cannot be raised to a negative power' };
      return { v: Math.pow(Number(a), Number(b)) };
    }
    if (!isF) {
      if (op === '+') return { v: a + b };
      if (op === '-') return { v: a - b };
      if (op === '*') return { v: a * b };
      if (b === 0n) return { err: 'ZeroDivisionError: integer division or modulo by zero' };
      let q = a / b;
      if (a % b !== 0n && (a < 0n) !== (b < 0n)) q -= 1n;
      return { v: op === '//' ? q : a - b * q };
    }
    const x = Number(a), y = Number(b);
    if (op === '+') return { v: x + y };
    if (op === '-') return { v: x - y };
    if (op === '*') return { v: x * y };
    if (y === 0) return { err: op === '//' ? 'ZeroDivisionError: float floor division by zero' : 'ZeroDivisionError: float modulo' };
    let mod = x % y, div = (x - mod) / y;
    if (mod) { if ((y < 0) !== (mod < 0)) { mod += y; div -= 1; } } else mod = y < 0 ? -0 : 0;
    if (op === '%') return { v: mod };
    let fd = Math.floor(div);
    if (div) { if (div - fd > 0.5) fd += 1; } else fd = x / y < 0 ? -0 : 0;
    return { v: fd };
  }
  const fmtNum = v => (typeof v === 'bigint' ? String(v) : pyFloat(v));
  // sum() of parsed items: exact for ints, compensated (Neumaier) for floats like CPython 3.12+.
  function pySum(items) {
    let s = 0, c = 0, isF = false;
    for (const it of items) {
      const x = it.num;
      if (pyTypeName(it) === 'float') isF = true;
      const t = s + x;
      c += Math.abs(s) >= Math.abs(x) ? (s - t) + x : (x - t) + s;
      s = t;
    }
    return isF ? pyFloat(s + c) : String(s);
  }
  const bitsHTML = rows => '<div class="py-bits">' + rows.map(([label, n, res]) =>
    `<div class="row${res ? ' res' : ''}"><code class="lbl">${esc(label)}</code>` + [...(n >>> 0).toString(2).padStart(8, '0').slice(-8)].map(b => `<span class="b${b === '1' ? ' on' : ''}">${b}</span>`).join('') + `<span class="dec">= ${n}</span></div>`).join('') + '</div>';

  // ---------- Course content ----------
  const DECKS = {
    print: {
      name: 'Python Print', short: 'print()', icon: '&gt;_', accent: '#38bdf8', page: 'print.html', folder: 'python-core-language/python-print',
      blurb: 'Make Python show messages on the screen: join words, add new lines and fill in blanks.',
      glossary: [
        ['print()', 'The command that shows something on the screen.'],
        ['string', 'Text inside quotes, like "hello". Python calls it str.'],
        ['argument', 'Anything you put inside the brackets ( ) of a command.'],
        ['output', 'What appears on the screen when the code runs.'],
        ['\\n', 'A special code that means "start a new line", like pressing Enter.'],
        ['variable', 'A name that holds a value, like a labelled box.']
      ],
      slides: [
        {
          title: 'What does print() do?', file: '01_print_basic_variations.py',
          idea: '<code>print()</code> shows a message on the screen.',
          analogy: 'Think of <code>print()</code> as Python\'s <strong>mouth</strong>. Whatever you put inside the brackets, Python "says" on the screen.',
          explain: `<ul><li><code>print</code> is the command</li><li>the brackets <code>( )</code> hold what you want to show</li><li>the quotes <code>" "</code> tell Python "this is text"</li></ul>`,
          visual: anatomy([['print', 'the command', C.cmd], ['(', 'open bracket', C.brk], ['"Hello, World!"', 'your text, inside quotes', C.txt], [')', 'close bracket', C.brk]]),
          code: `# Show a message on the screen\nprint("Hello, World!")`,
          out: 'Hello, World!',
          tip: 'Press the green <strong>Run</strong> button to run the code again.'
        },
        {
          title: 'Print your own message', file: '01_print_basic_variations.py',
          idea: 'Change the words between the quotes, and the screen shows your new words.',
          explain: `<p>Type anything into the yellow box below. The code and the screen update straight away.</p><p>Single quotes <code>'hi'</code> and double quotes <code>"hi"</code> do exactly the same thing. Just use the same kind at the start and the end.</p>`,
          controls: [{ key: 'msg', label: 'your message', type: 'text', value: 'Welcome to tinitiate.com python tutorials' }],
          render: v => ({ code: `# Show my message on the screen\nprint(${lit(v.msg, '"')})`, out: v.msg }),
          tip: 'Forgetting the quotes is the most common beginner mistake. <code>print(Hello)</code> fails because Python thinks <code>Hello</code> is a variable name.'
        },
        {
          title: 'Print several things with a comma', file: '01_print_basic_variations.py',
          idea: 'Separate things with a <strong>comma</strong>, and Python prints them all with a <strong>space</strong> between them.',
          analogy: 'Like saying a list of words out loud: Python pauses (adds a space) at every comma.',
          controls: [{ key: 'a', label: 'first part', type: 'text', value: 'Welcome to tinitiate.com' }, { key: 'b', label: 'second part', type: 'text', value: 'python tutorials' }],
          render: v => ({ code: `# A comma prints both parts, with a space between them\nprint(${lit(v.a, '"')}, ${lit(v.b)})`, out: v.a + ' ' + v.b, visual: tokensHTML([v.a, v.b], ' ') }),
          tip: 'The yellow ␣ box in the picture is the space Python adds for you.'
        },
        {
          title: 'Glue text together with +', file: '01_print_basic_variations.py',
          idea: '<code>+</code> glues two pieces of text into one, with <strong>no space</strong> between them.',
          analogy: 'Like taping two pieces of paper edge to edge: nothing goes in between unless you add it.',
          explain: `<p>Want a space? Put it inside the quotes yourself: <code>"Hello " + "World"</code>.</p>`,
          controls: [{ key: 'a', label: 'first part', type: 'text', value: 'Welcome to tinitiate.com' }, { key: 'b', label: 'second part', type: 'text', value: 'python tutorials' }],
          render: v => ({ code: `# + glues the text together (no space added)\nprint(${lit(v.a)} + ${lit(v.b)})`, out: v.a + v.b, visual: '<div class="py-tokens"><span class="py-token">' + esc(v.a) + '</span><span style="color:#fde68a;font-weight:800;">+</span><span class="py-token">' + esc(v.b) + '</span></div>' }),
          tip: '<code>+</code> only glues text to text. <code>"Age: " + 7</code> gives an error because <code>7</code> is a number, not text. Write <code>"Age: " + "7"</code> instead.'
        },
        {
          title: 'Choose the separator with sep=', file: '01_print_basic_variations.py',
          idea: '<code>sep=</code> decides what goes <strong>between</strong> the items. If you leave it out, Python uses a space.',
          analogy: 'Like choosing what goes between beads on a necklace: a space, a comma, a dash, or nothing at all.',
          controls: [{ key: 'sep', label: 'separator (sep)', type: 'text', value: ', ' }],
          render: v => ({
            code: `# Normally Python puts a SPACE between items\nprint("apple", "banana", "orange")\n\n# sep= lets you choose what goes between them\nprint("apple", "banana", "orange", sep=${lit(v.sep, '"')})`,
            out: 'apple banana orange\n' + ['apple', 'banana', 'orange'].join(v.sep),
            visual: tokensHTML(['apple', 'banana', 'orange'], v.sep)
          }),
          tip: 'Try typing <code>-</code>, <code> | </code>, or clear the box for no separator at all.'
        },
        {
          title: 'Printing quotes and other special characters', file: '01_print_basic_variations.py',
          idea: 'A backslash <code>\\</code> tells Python: "the next character is special, treat it differently".',
          analogy: 'The quote marks are the <strong>walls</strong> around your text. To print a quote mark itself, put a <code>\\</code> in front so Python knows it is not a wall.',
          explain: `<ul><li><code>\\'</code> prints <code>'</code></li><li><code>\\"</code> prints <code>"</code></li><li><code>\\\\</code> prints one <code>\\</code></li><li><code>\\t</code> prints a tab (a big space)</li></ul>`,
          controls: [{ key: 'kind', label: 'pick one', type: 'select', value: 0, options: [{ label: "\\' a single quote", value: 'sq' }, { label: '\\" a double quote', value: 'dq' }, { label: '\\\\ a backslash', value: 'bs' }, { label: '\\t a tab', value: 'tab' }] }],
          render: v => ({
            sq: { code: py`# \' prints a single quote inside '...'` + '\n' + py`print('Printing a single quote \'')`, out: "Printing a single quote '" },
            dq: { code: py`# \" prints a double quote inside "..."` + '\n' + py`print("Printing a double quote \"")`, out: 'Printing a double quote "' },
            bs: { code: py`# \\ prints one backslash` + '\n' + py`print("Printing a backslash \\")`, out: 'Printing a backslash \\' },
            tab: { code: py`# \t adds a tab (a wide space)` + '\n' + py`print("Name:\tPython")`, out: 'Name:\tPython' }
          }[v.kind]),
          tip: 'An easier trick: put the text in the <em>other</em> kind of quotes. <code>"It\'s easy"</code> needs no backslash.'
        },
        {
          title: 'Start a new line with \\n', file: '01_print_basic_variations.py',
          idea: '<code>\\n</code> means "go to a new line", just like pressing <strong>Enter</strong>.',
          explain: `<p>It is written as two characters, but Python treats <code>\\n</code> as one invisible "Enter" key.</p>`,
          controls: [{ key: 'a', label: 'line 1', type: 'text', value: 'line1' }, { key: 'b', label: 'line 2', type: 'text', value: 'line2' }],
          render: v => ({ code: `# \\n moves the rest of the text to a new line\nprint(${lit(v.a, '"')} + '\\n' + ${lit(v.b, '"')})`, out: v.a + '\n' + v.b })
        },
        {
          title: 'Choose the ending with end=', file: '01_print_basic_variations.py',
          idea: '<code>end=</code> decides what <code>print()</code> adds at the very end. Normally that is a new line.',
          analogy: 'Every <code>print()</code> normally presses <strong>Enter</strong> when it finishes. <code>end=</code> lets you press something else instead.',
          explain: `<p>That is why two <code>print()</code> calls usually appear on two lines. Change <code>end</code>, and the next print continues on the same line.</p>`,
          controls: [{ key: 'end', label: 'end', type: 'select', value: 0, options: [{ label: '"." a dot', value: '.' }, { label: '"" nothing', value: '' }, { label: '" " a space', value: ' ' }, { label: '" | "', value: ' | ' }, { label: '"\\n" new line (normal)', value: '\n' }] }],
          render: v => ({ code: `# Normally each print starts a new line\nprint('First Line')\nprint('Second Line')\n\n# end= changes what comes after "tinitiate"\nprint("tinitiate", end=${lit(v.end, '"')})\nprint("com")`, out: 'First Line\nSecond Line\ntinitiate' + v.end + 'com' })
        },
        {
          title: 'Repeat text with *', file: '01_print_basic_variations.py',
          idea: '<code>text * number</code> repeats the text that many times.',
          analogy: 'Like a photocopier: <code>"hello " * 3</code> makes 3 copies, side by side.',
          controls: [{ key: 't', label: 'text', type: 'text', value: 'hello ' }, { key: 'n', label: 'how many times', type: 'range', value: 3, min: 0, max: 10 }],
          render: v => ({ code: `# Repeat the text with *\nprint(${lit(v.t, '"')} * ${v.n})`, out: v.t.repeat(v.n) }),
          tip: 'Handy for drawing lines: <code>print("-" * 20)</code>.'
        },
        {
          title: 'Fill in the blanks with % (old style)', file: '02_print_c_language_style.py',
          idea: 'Put <strong>blanks</strong> like <code>%s</code> in your text, then fill them in after the <code>%</code> sign.',
          analogy: 'Like a paper form: "Name: ____ Age: ____". You write the form once, then fill in the blanks.',
          explain: `<ul><li><code>%s</code> = a blank for text</li><li><code>%i</code> or <code>%d</code> = a blank for a whole number</li><li><code>%.3f</code> = a blank for a decimal number, showing 3 digits after the dot</li></ul><p>This is an older style. You will see it in old code, but slides 11 to 13 show easier ways.</p>`,
          controls: [{ key: 'num', label: 'number', type: 'text', value: '1000.23232' }, { key: 'w', label: 'min width', type: 'range', value: 5, min: 0, max: 14 }, { key: 'p', label: 'digits after the dot', type: 'range', value: 3, min: 0, max: 6 }],
          render: v => {
            const spec = '%' + (v.w ? v.w : '') + '.' + v.p + 'f';
            const n = Number(v.num.trim());
            const isNum = v.num.trim() !== '' && Number.isFinite(n);
            const code = `# ${spec} = a decimal number with ${v.p} digit(s) after the dot\nprint('print a double ${spec}' % (${isNum ? v.num.trim() : lit(v.num)}))\n\n# %s = text blank, %i = whole number blank\nstrVal = 'tinitiate.com'\nintval = 100\nprint("String = %s Integer = %i" % (strVal, intval))`;
            if (!isNum) return { code, out: '', err: tb(2, 'TypeError: must be real number, not str') };
            return { code, out: 'print a double ' + n.toFixed(v.p).padStart(v.w) + '\nString = tinitiate.com Integer = 100' };
          },
          tip: 'Move the "digits after the dot" slider and watch the number get rounded.'
        },
        {
          title: 'Fill in the blanks with .format()', file: '03_print_string_format.py',
          idea: '<code>{}</code> are empty slots. <code>.format()</code> fills them in, in order.',
          analogy: 'Like empty seats in a row. The values in <code>.format(...)</code> sit down in the seats from left to right.',
          explain: `<p>Put a number in the slot to choose which value goes there: <code>{0}</code> is the first value, <code>{1}</code> is the second. Python counts from 0.</p>`,
          controls: [{ key: 'tpl', label: 'template', type: 'select', value: 0, options: ['{} and {}', '{0} and {1}', '{1} and {0}', '{0}, {1} and {0} again'] }, { key: 'a', label: 'value 0', type: 'text', value: 'tinitiate.com' }, { key: 'b', label: 'value 1', type: 'text', value: 'python' }],
          render: v => ({ code: `print('Welcome to {} training of {} language'.format('tinitiate.com', 'python'))\n\n# Your template\nprint(${lit(v.tpl)}.format(${lit(v.a)}, ${lit(v.b)}))`, out: 'Welcome to tinitiate.com training of python language\n' + pyFormat(v.tpl, [v.a, v.b]) }),
          tip: 'Pick <code>{1} and {0}</code> to swap the two values around.'
        },
        {
          title: 'Name your slots', file: '03_print_string_format.py',
          idea: 'Give each slot a <strong>name</strong>, then fill it by name: <code>{site}</code> is filled by <code>site=...</code>.',
          explain: `<p>Names make long messages easier to read, because you can see what goes where.</p>`,
          controls: [{ key: 'site', label: 'siteName', type: 'text', value: 'tinitiate.com' }, { key: 'lang', label: 'LanguageName', type: 'text', value: 'python' }],
          render: v => ({
            code: `# Fill the slots by name\nprint('{siteName} teaches {LanguageName}.'.format(\n    siteName=${lit(v.site)}, LanguageName=${lit(v.lang)}))\n\n# Mix numbered and named slots (numbered values go first)\nprint('The site {0} teaches {LanguageName}'.format(\n    ${lit(v.site)}, LanguageName=${lit(v.lang)}))`,
            out: `${v.site} teaches ${v.lang}.\nThe site ${v.site} teaches ${v.lang}`
          })
        },
        {
          title: 'f-strings: the easiest way', file: '03_print_string_format.py',
          idea: 'Put an <code>f</code> before the quotes, then write variable names inside <code>{ }</code>. Python fills in their values.',
          analogy: 'It is like writing a sentence with sticky notes on it: each <code>{name}</code> is replaced by what is stored in <code>name</code>.',
          explain: `<p>This is the way you will use most often. You can even do maths inside the braces: <code>{2 + 3}</code> shows <code>5</code>.</p>`,
          controls: [{ key: 'site', label: 'l_site', type: 'text', value: 'tinitiate.com' }, { key: 'lang', label: 'l_language_name', type: 'text', value: 'Python' }],
          render: v => ({
            code: `l_site = ${lit(v.site)}\nl_language_name = ${lit(v.lang)}\n\n# f before the quotes, variable names inside { }\nl_str = f"The site {l_site} teaches {l_language_name}"\nprint(l_str)\n\n# len() counts the characters\nprint(f"{l_site} has {len(l_site)} characters")`,
            out: `The site ${v.site} teaches ${v.lang}\n${v.site} has ${[...v.site].length} characters`
          }),
          tip: 'Forget the <code>f</code> and Python prints the braces as they are: <code>The site {l_site} ...</code>'
        },
        {
          title: 'Quotes or no quotes?', file: '04_print_variables_and_numerics.py',
          idea: '<strong>No quotes</strong>: Python uses the value. <strong>With quotes</strong>: Python just shows the text as it is.',
          analogy: 'Saying <em>your name</em> vs. saying the words <em>"your name"</em>. Without quotes Python looks inside the box; with quotes it reads the label.',
          explain: `<p>Numbers and text also behave differently:</p><ul><li><code>7 + 7</code> is maths, so it gives <code>14</code></li><li><code>'7' + '7'</code> is gluing text, so it gives <code>77</code></li></ul>`,
          controls: [{ key: 'a', label: 'a', type: 'number', value: 7 }, { key: 'b', label: 'b', type: 'number', value: 7 }],
          render: v => ({
            code: `var_integer = 1                # a whole number\nvar_float   = 10.44            # a decimal number\nvar_string  = "tinitiate.com"  # text\n\nprint(var_integer, var_float, var_string)     # values\nprint('var_integer', 'var_float', 'var_string')  # just text\n\nprint(${v.a} + ${v.b})      # numbers: maths\nprint('${v.a}' + '${v.b}')  # text: glued together`,
            out: `1 10.44 tinitiate.com\nvar_integer var_float var_string\n${v.a + v.b}\n${v.a}${v.b}`
          })
        },
        {
          title: 'Raw strings: r"..."', file: '05_print_ascii_and_unicode.py',
          idea: 'An <code>r</code> before the quotes means "print every character <strong>exactly</strong> as typed". Backslashes stop being special.',
          explain: `<p>Without <code>r</code>, <code>\\n</code> makes a new line. With <code>r</code>, it prints a backslash and an <code>n</code>.</p><p>Useful for Windows folder paths like <code>r"C:\\new\\files"</code>.</p>`,
          controls: [{ key: 'raw', label: 'prefix', type: 'select', value: 0, options: [{ label: 'r  (raw: print exactly)', value: 'r' }, { label: '(none: \\n is a new line)', value: '' }] }],
          render: v => ({
            code: `print(r'This is a ASCII string, Has no special characters')\n\nprint(${v.raw}"First line\\nSecond line")`,
            out: 'This is a ASCII string, Has no special characters\n' + (v.raw ? 'First line\\nSecond line' : 'First line\nSecond line')
          })
        },
        {
          title: 'Print any symbol with \\u', file: '05_print_ascii_and_unicode.py',
          idea: 'Every symbol in the world has a code number. <code>\\u</code> followed by that 4-character code prints the symbol.',
          analogy: 'Like a giant catalogue: <code>00DF</code> is the item number for ß, <code>20B9</code> for ₹.',
          controls: [{ key: 'hex', label: 'symbol code (4 characters)', type: 'text', value: '00DF' }],
          render: v => {
            const h = v.hex.trim();
            const code = `print(u'This is a UNICODE string (\\u${h}), and Has special characters')`;
            if (!/^[0-9a-fA-F]{4}$/.test(h)) return { code, out: '', err: "  File \"demo.py\", line 1\nSyntaxError: (unicode error) 'unicodeescape' codec can't decode bytes: truncated \\uXXXX escape" };
            return { code, out: `This is a UNICODE string (${String.fromCharCode(parseInt(h, 16))}), and Has special characters` };
          },
          tip: 'Try <code>20B9</code> (&#x20B9;), <code>03C0</code> (&#x03C0;), <code>2764</code> (&#x2764;) or <code>00E9</code> (&#x00E9;). The code needs exactly 4 characters.'
        },
        {
          title: 'Cheat sheet: print()', file: 'recap',
          idea: 'You now know every way to use <code>print()</code> from this module. Keep this page as a reminder.',
          visual: '<table class="py-table"><thead><tr><th>You want to…</th><th>Write</th></tr></thead><tbody>' + [
            ['show text', 'print("hi")'], ['show several things', 'print("a", "b")'], ['glue text', 'print("a" + "b")'], ['choose the separator', 'print("a", "b", sep="-")'],
            ['stay on the same line', 'print("a", end="")'], ['start a new line', 'print("a\\nb")'], ['repeat text', 'print("ha" * 3)'], ['fill in values', 'print(f"Hi {name}")']
          ].map(r => `<tr><td style="font-family:inherit;color:#e2e8f0;font-weight:600;">${r[0]}</td><td style="font-family:var(--font-mono);color:#fde68a;">${esc(r[1])}</td></tr>`).join('') + '</tbody></table>',
          code: `name = "Sam"\n\nprint("hi")\nprint("a", "b")\nprint("a" + "b")\nprint("a", "b", sep="-")\nprint("a", end="")\nprint("a\\nb")\nprint("ha" * 3)\nprint(f"Hi {name}")`,
          out: 'hi\na b\nab\na-b\naa\nb\nhahaha\nHi Sam',
          tip: 'Notice line 5 of the output: <code>end=""</code> kept the next print on the same line, so it shows <code>aa</code>.'
        }
      ]
    },

    datatypes: {
      name: 'Python Datatypes', short: 'Datatypes', icon: '{ }', accent: '#a78bfa', page: 'datatypes.html', folder: 'python-core-language/python-datatypes',
      blurb: 'Learn the different kinds of values Python can store: numbers, text, lists, yes/no and more.',
      glossary: [
        ['variable', 'A labelled box that stores a value. age = 25 puts 25 in a box called age.'],
        ['datatype', 'The kind of value: a whole number, text, a list, a yes/no…'],
        ['type()', 'A command that tells you the datatype of any value.'],
        ['mutable', 'Can be changed after it is made. A list is mutable.'],
        ['immutable', 'Cannot be changed after it is made. A tuple is immutable.'],
        ['index', 'The position number of an item. Python starts counting at 0.']
      ],
      slides: [
        {
          title: 'What is a variable?', file: 'datatypes.py',
          idea: 'A variable is a <strong>labelled box</strong> that stores a value.',
          analogy: '<code>age = 25</code> means: take a box, write <strong>age</strong> on the label, and put <strong>25</strong> inside. Later, <code>print(age)</code> looks inside the box.',
          explain: `<p>The <code>=</code> sign means <strong>"store"</strong>, not "equals". Read <code>age = 25</code> as "age stores 25".</p>`,
          controls: [{ key: 'age', label: 'value to store in age', type: 'number', value: 25 }],
          render: v => ({ code: `# Put a value in a box called age\nage = ${v.age}\n\n# Look inside the box\nprint(age)\nprint(age + 1)`, out: `${v.age}\n${v.age + 1}`, visual: varBox('age', String(v.age), 'a box called age') }),
          tip: 'Variable names cannot have spaces or start with a number. Use <code>my_age</code>, not <code>my age</code> or <code>1age</code>.'
        },
        {
          title: 'What is a datatype?', file: 'python_datatypes.md',
          idea: 'Every value has a <strong>type</strong>: is it a number, text, a list, a yes/no…?',
          analogy: 'In a kitchen, milk goes in a bottle, eggs in a carton and sugar in a jar. Python also stores each kind of data in its own kind of "container".',
          explain: `<p>You never have to tell Python the type. It works it out from the value. <code>type(value)</code> tells you what Python decided.</p>`,
          visual: '<div class="py-typegrid">' + [['Numbers', 'int · float · complex'], ['Text', 'str'], ['Lists of things', 'list · tuple'], ['Look-up tables', 'dict'], ['Unique bags', 'set · frozenset'], ['Yes / No', 'bool'], ['Nothing', 'None']].map((t, i) => `<div class="py-typebox" style="animation-delay:${i * 0.07}s"><b>${t[0]}</b><span>${t[1]}</span></div>`).join('') + '</div>',
          code: `values = [5, 3.14, 2 + 3j, 'Alice', [1, 2, 3], (10, 20),\n          {'name': 'Bob'}, {1, 2, 3}, frozenset({4, 5, 6}), True, None]\n\n# Ask Python the type of each value\nfor v in values:\n    print(type(v).__name__)`,
          out: 'int\nfloat\ncomplex\nstr\nlist\ntuple\ndict\nset\nfrozenset\nbool\nNoneType',
          tip: 'Do not worry about the <code>for</code> loop yet. It just repeats the print for each value.'
        },
        {
          title: 'Numbers: int and float', file: 'datatypes.py',
          idea: 'Whole numbers are <code>int</code>. Numbers with a decimal point are <code>float</code>.',
          analogy: '<strong>int</strong> is for counting things: 3 apples, 25 years. <strong>float</strong> is for measuring things: 3.5 kg, 98.6 degrees.',
          explain: `<ul><li><code>5</code> is an int, <code>5.0</code> is a float</li><li>int + float gives a float</li><li><code>complex</code> numbers like <code>2 + 3j</code> are used in engineering maths. You can skip them for now.</li></ul>`,
          controls: [{ key: 'x', label: 'x (whole number)', type: 'number', value: 5 }, { key: 'y', label: 'y (decimal number)', type: 'text', value: '3.14' }, { key: 're', label: 'z: real part', type: 'number', value: 2 }, { key: 'im', label: 'z: imaginary part', type: 'number', value: 3 }],
          render: v => {
            const yv = Number(v.y.trim());
            const yOk = v.y.trim() !== '' && Number.isFinite(yv);
            const zc = v.im < 0 ? `${v.re} - ${-v.im}j` : `${v.re} + ${v.im}j`;
            const zr = v.re === 0 ? `${v.im}j` : `(${v.re}${v.im < 0 ? '-' : '+'}${Math.abs(v.im)}j)`;
            const code = `x = ${v.x}            # int: a whole number\ny = ${yOk ? (v.y.includes('.') ? v.y.trim() : v.y.trim() + '.0') : v.y}         # float: has a decimal point\nz = ${zc}       # complex (advanced, skip for now)\n\nprint("x:", x)\nprint("y:", y)\nprint("z:", z)\nprint("x + y =", x + y)\nprint(type(x + y))`;
            if (!yOk) return { code, out: '', err: tb(2, `NameError: name '${v.y}' is not defined`) };
            return { code, out: `x: ${v.x}\ny: ${pyFloat(yv)}\nz: ${zr}\nx + y = ${pyFloat(v.x + yv)}\n<class 'float'>` };
          }
        },
        {
          title: 'Text: str', file: 'datatypes.py',
          idea: 'Text is called a <code>str</code> (short for "string"). It always goes inside quotes.',
          analogy: 'A string is like letters on a scrabble rack: each letter sits in its own numbered spot, starting from 0.',
          explain: `<p><code>len(name)</code> counts the letters. <code>name[0]</code> gets the first letter.</p>`,
          controls: [{ key: 'name', label: 'name', type: 'text', value: 'Alice' }],
          render: v => {
            const code = `name = ${lit(v.name)}         # str: text in quotes\nprint("name:", name)\nprint(type(name))\nprint(len(name), "characters")\nprint(name[0], "is the first character")`;
            const out = `name: ${v.name}\n<class 'str'>\n${[...v.name].length} characters`;
            const r = { code, out, visual: cellsHTML(v.name, [0], false) + '<div style="margin-top:10px;">' + propBadges(true, false, true) + '</div>' };
            if (!v.name) r.err = tb(5, 'IndexError: string index out of range');
            else r.out += `\n${v.name[0]} is the first character`;
            return r;
          },
          tip: 'Clear the box: an empty string has no first letter, so Python gives an error.'
        },
        {
          title: 'list: a shopping list', file: 'datatypes.py',
          idea: 'A <code>list</code> holds many values in order, inside square brackets <code>[ ]</code>. You can add, remove or change items.',
          analogy: 'Just like a shopping list: items stay in the order you wrote them, and you can add to the end or cross things out.',
          explain: `<p><code>numbers.append(4)</code> adds <code>4</code> to the end. <code>len(numbers)</code> counts the items.</p>`,
          controls: [{ key: 'items', label: 'items (separate with commas)', type: 'text', value: '1, 2, 3' }, { key: 'add', label: 'add to the end', type: 'text', value: '4' }],
          render: v => {
            const items = parseItems(v.items);
            const all = v.add.trim() ? items.concat(parseToken(v.add)) : items;
            const r1 = '[' + items.map(i => i.repr).join(', ') + ']';
            const r2 = '[' + all.map(i => i.repr).join(', ') + ']';
            return {
              code: `numbers = ${r1}    # list\nprint("numbers:", numbers)\n${v.add.trim() ? `\nnumbers.append(${parseToken(v.add).repr})    # add to the end\n` : '\n'}print("after:", numbers)\nprint("length:", len(numbers))`,
              out: `numbers: ${r1}\nafter: ${r2}\nlength: ${all.length}`,
              visual: '<div class="py-cells">' + all.map((it, i) => `<div class="py-cell${i >= items.length ? ' on' : ''}"><span class="ix">${i}</span><span class="ch" style="width:auto;min-width:34px;padding:0 8px;">${esc(it.repr)}</span></div>`).join('') + '</div><div style="margin-top:10px;">' + propBadges(true, true, true) + '</div>'
            };
          },
          tip: 'Words get quotes automatically. Try <code>milk, eggs, bread</code>.'
        },
        {
          title: 'tuple: a sealed list', file: 'datatypes.py',
          idea: 'A <code>tuple</code> is like a list that is <strong>sealed shut</strong>. You can look at the items, but you cannot change them.',
          analogy: 'Like a date of birth or map coordinates: once written, they should never change. Tuples protect values from accidental changes.',
          explain: `<p>Tuples use round brackets <code>( )</code>. A tuple with one item needs a comma: <code>(5,)</code>.</p><p>Line 8 tries to change a tuple, so Python stops with an error. That is expected!</p>`,
          controls: [{ key: 'x', label: 'x', type: 'number', value: 10 }, { key: 'y', label: 'y', type: 'number', value: 20 }],
          render: v => ({
            code: `coordinates = (${v.x}, ${v.y})    # tuple\nprint("coordinates:", coordinates)\nprint(coordinates[0])\n\nsingle = (5,)                # one item: needs the comma\nprint(type(single))\n\ncoordinates[0] = 99          # not allowed: tuples are sealed`,
            out: `coordinates: (${v.x}, ${v.y})\n${v.x}\n<class 'tuple'>`,
            err: tb(8, "TypeError: 'tuple' object does not support item assignment"),
            visual: propBadges(true, false, true)
          })
        },
        {
          title: 'dict: a look-up table', file: 'datatypes.py',
          idea: 'A <code>dict</code> (dictionary) stores pairs: a <strong>key</strong> and its <strong>value</strong>. You find a value by its key.',
          analogy: 'Like a real dictionary: look up a <strong>word</strong> (the key) to find its <strong>meaning</strong> (the value). Or a phone book: name → number.',
          explain: `<ul><li><code>person['name']</code> gets the value for the key <code>'name'</code></li><li>If the key does not exist, you get a <code>KeyError</code></li><li><code>person.get('email', 'not set')</code> is the safe way: it gives a default instead of an error</li></ul>`,
          controls: [{ key: 'name', label: "value for 'name'", type: 'text', value: 'Bob' }, { key: 'age', label: "value for 'age'", type: 'number', value: 25 }, { key: 'k', label: 'look up the key', type: 'select', value: 0, options: ['name', 'age', 'email'] }],
          render: v => {
            const d = `{'name': ${repr(v.name)}, 'age': ${v.age}}`;
            const code = `person = ${d}    # dict\nprint("person:", person)\nprint(person.get('email', 'not set'))   # safe look-up\nprint(person['${v.k}'])`;
            const base = `person: ${d}\nnot set`;
            if (v.k === 'email') return { code, out: base, err: tb(4, "KeyError: 'email'") };
            return { code, out: base + '\n' + (v.k === 'name' ? v.name : v.age), visual: badges([['Each key only once', true], ['Can be changed', true], ['Keeps order', true]]) };
          },
          tip: 'Choose <code>email</code> in the look-up box to see the KeyError.'
        },
        {
          title: 'set: a bag of unique items', file: 'datatypes.py',
          idea: 'A <code>set</code> keeps only <strong>one copy</strong> of each item. Duplicates are thrown away automatically.',
          analogy: 'Like a sticker collection: if you already have a sticker, a second copy does not count. A set also has no fixed order.',
          explain: `<p>Sets are great for removing duplicates or checking "is this item in the bag?" with <code>in</code>.</p><p>Watch out: <code>{}</code> makes an empty <em>dict</em>. Use <code>set()</code> for an empty set.</p>`,
          controls: [{ key: 'items', label: 'items (try repeats!)', type: 'text', value: '1, 2, 2, 3, 3, 3' }, { key: 'probe', label: 'is this in the set?', type: 'text', value: '2' }],
          render: v => {
            const raw = parseItems(v.items);
            const items = setItems(v.items);
            const lit_ = raw.length ? '{' + raw.map(i => i.repr).join(', ') + '}' : 'set()';
            const shown = items.length ? '{' + items.map(i => i.repr).join(', ') + '}' : 'set()';
            const probe = parseToken(v.probe || "''");
            return {
              code: `unique_numbers = ${lit_}    # set\nprint("unique_numbers:", unique_numbers)\nprint(len(unique_numbers), "unique items")\nprint(${probe.repr} in unique_numbers)`,
              out: `unique_numbers: ${shown}\n${items.length} unique items\n${pyBool(items.some(i => i.key === probe.key))}`,
              visual: '<div class="py-tokens">' + items.map(i => `<span class="py-token">${esc(i.repr)}</span>`).join('') + `</div><div style="margin-top:10px;">${badges([['Keeps order', false], ['Can be changed', true], ['Repeats allowed', false]])}</div>`
            };
          }
        },
        {
          title: 'frozenset: a frozen set', file: 'datatypes.py',
          idea: 'A <code>frozenset</code> is a set that is <strong>frozen</strong>: once made, nothing can be added or removed.',
          analogy: 'Like a set of ice cubes frozen in a block: you can see them, but you cannot take one out or add one.',
          explain: `<p>Because it never changes, a frozenset can be used as a key in a dict. Line 7 tries to add an item, so Python gives an error. That is expected!</p>`,
          controls: [{ key: 'items', label: 'items', type: 'text', value: '4, 5, 6' }],
          render: v => {
            const items = setItems(v.items);
            const inner = items.map(i => i.repr).join(', ');
            const shown = items.length ? `frozenset({${inner}})` : 'frozenset()';
            return {
              code: `frozen_set = ${items.length ? `frozenset({${inner}})` : 'frozenset()'}    # frozenset\nprint("frozen_set:", frozen_set)\n\nlookup = {frozen_set: 'works as a dict key'}\nprint(lookup[frozen_set])\n\nfrozen_set.add(7)    # not allowed: it is frozen`,
              out: `frozen_set: ${shown}\nworks as a dict key`,
              err: tb(7, "AttributeError: 'frozenset' object has no attribute 'add'"),
              visual: badges([['Keeps order', false], ['Can be changed', false], ['Repeats allowed', false], ['Can be a dict key', true]])
            };
          }
        },
        {
          title: 'bool: yes or no', file: 'datatypes.py',
          idea: 'A <code>bool</code> has only two values: <code>True</code> (yes) or <code>False</code> (no).',
          analogy: 'Like a light switch: on or off. Questions like "is 5 bigger than 3?" always answer with a bool.',
          explain: `<p><code>bool(x)</code> asks "does x count as yes?". Zero, empty text <code>''</code>, an empty list <code>[]</code> and <code>None</code> count as <strong>no</strong>. Almost everything else counts as <strong>yes</strong>.</p>`,
          controls: [{ key: 'e', label: 'question to ask', type: 'select', value: 0, options: [{ label: '5 > 3', value: '5 > 3|True' }, { label: '5 == 3', value: '5 == 3|False' }, { label: 'bool(0)', value: 'bool(0)|False' }, { label: 'bool(42)', value: 'bool(42)|True' }, { label: "bool('')", value: "bool('')|False" }, { label: "bool('hi')", value: "bool('hi')|True" }, { label: 'bool([])', value: 'bool([])|False' }, { label: 'bool(None)', value: 'bool(None)|False' }, { label: 'True + True', value: 'True + True|2' }] }],
          render: v => {
            const [expr, res] = v.e.split('|');
            return { code: `is_active = True    # bool\nprint("is_active:", is_active)\nprint(type(is_active))\n\nresult = ${expr}\nprint(result)`, out: `is_active: True\n<class 'bool'>\n${res}` };
          },
          tip: '<code>True</code> and <code>False</code> must start with a capital letter. <code>true</code> is an error.'
        },
        {
          title: 'None: nothing here', file: 'datatypes.py',
          idea: '<code>None</code> means <strong>"nothing here yet"</strong>: no value at all.',
          analogy: 'Like an empty box with a label on it. The box exists, but there is nothing inside.',
          explain: `<p>Check for it with <code>is None</code>. A function that does not give back a value gives back <code>None</code>, as lines 6 to 10 show.</p>`,
          code: `result = None    # None: empty for now\nprint("result:", result)\nprint(type(result))\nprint(result is None)\n\ndef greet():\n    print("hello")    # shows hello, but gives nothing back\n\nvalue = greet()\nprint(value)`,
          out: "result: None\n<class 'NoneType'>\nTrue\nhello\nNone",
          tip: 'Do not worry about <code>def</code> yet. It creates a function, which you will learn later.'
        },
        {
          title: 'All the types together', file: 'datatypes.py',
          idea: 'This is the complete example from the course: one variable of every type, then each one printed.',
          explain: `<p>Look at how each type looks on screen: text has no quotes, the list keeps <code>[ ]</code>, the tuple keeps <code>( )</code>, and the dict shows <code>key: value</code> pairs.</p>`,
          code: `# Numbers\nx = 5                  # int\ny = 3.14               # float\nz = 2 + 3j             # complex\n\n# Text and lists of things\nname = 'Alice'         # str\nnumbers = [1, 2, 3]    # list\ncoordinates = (10, 20) # tuple\n\n# Look-up table\nperson = {'name': 'Bob', 'age': 25}  # dict\n\n# Unique bags\nunique_numbers = {1, 2, 3}           # set\nfrozen_set = frozenset({4, 5, 6})    # frozenset\n\n# Yes / no, and nothing\nis_active = True                      # bool\nresult = None                         # None\n\nprint("x:", x)\nprint("y:", y)\nprint("z:", z)\nprint("name:", name)\nprint("numbers:", numbers)\nprint("coordinates:", coordinates)\nprint("person:", person)\nprint("unique_numbers:", unique_numbers)\nprint("frozen_set:", frozen_set)\nprint("is_active:", is_active)\nprint("result:", result)`,
          out: "x: 5\ny: 3.14\nz: (2+3j)\nname: Alice\nnumbers: [1, 2, 3]\ncoordinates: (10, 20)\nperson: {'name': 'Bob', 'age': 25}\nunique_numbers: {1, 2, 3}\nfrozen_set: frozenset({4, 5, 6})\nis_active: True\nresult: None"
        },
        {
          title: 'Which one should I use?', file: 'python_datatypes.md',
          idea: 'Pick a container by asking: does the <strong>order</strong> matter, will it <strong>change</strong>, and can items <strong>repeat</strong>?',
          visual: '<table class="py-table"><thead><tr><th>Type</th><th>Use it for</th><th>Keeps order</th><th>Can change</th><th>Repeats</th></tr></thead><tbody>' +
            [['str', 'text', 1, 0, 1], ['list', 'a to-do list', 1, 1, 1], ['tuple', 'a date, a location', 1, 0, 1], ['dict', 'a phone book', 1, 1, 0], ['set', 'unique tags', 0, 1, 0], ['frozenset', 'fixed unique tags', 0, 0, 0]]
              .map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td>${r.slice(2).map(b => `<td style="color:${b ? '#86efac' : '#fca5a5'};font-weight:700;">${b ? 'Yes' : 'No'}</td>`).join('')}</tr>`).join('') + '</tbody></table>',
          code: `nums = [1, 2, 3]\nnums[0] = 9           # fine: a list can change\nprint(nums)\n\nname = 'Alice'\nprint(name.upper())   # makes a NEW string\nprint(name)           # the original is unchanged`,
          out: '[9, 2, 3]\nALICE\nAlice',
          tip: 'For a dict, "Repeats: No" is about the keys. Two people can have the same age (value), but each name (key) appears once.'
        },
        {
          title: 'Game: guess the type', file: 'practice',
          idea: 'Type any value in the yellow box. Guess its type first, then check the answer on screen.',
          explain: `<p>Try these: <code>42</code>, <code>4.0</code>, <code>"hi"</code>, <code>[1, 2]</code>, <code>(1,)</code>, <code>(1)</code>, <code>{}</code>, <code>{1, 2}</code>, <code>{'a': 1}</code>, <code>True</code>, <code>None</code>.</p>`,
          controls: [{ key: 'v', label: 'a value', type: 'text', value: '(1)' }],
          render: v => {
            const t = detectType(v.v);
            const code = `print(type(${v.v.trim()}))`;
            if (typeof t !== 'string') return t.err ? { code, out: '', err: tb(1, t.err) } : { code, out: t.note };
            return { code, out: `<class '${t}'>`, visual: `<div class="py-typebox" style="display:inline-block;min-width:220px;"><b>${t}</b><span>${esc(TYPE_PLAIN[t] || 'a built-in type')}</span></div>` };
          },
          tip: 'Surprised by <code>(1)</code>? Round brackets alone are just grouping, like in maths. The <strong>comma</strong> makes a tuple: <code>(1,)</code>.'
        }
      ]
    },

    strings: {
      name: 'Python Strings', short: 'Strings', icon: '"s"', accent: '#34d399', page: 'strings.html', folder: 'python-core-language/python-strings',
      blurb: 'Work with text: pick out letters, cut pieces, change case, search, trim and format.',
      glossary: [
        ['string (str)', 'Text inside quotes: letters, digits, spaces and symbols.'],
        ['character', 'One single letter, digit, space or symbol.'],
        ['index', 'The position number of a character. Counting starts at 0.'],
        ['slice', 'A piece cut out of a string, like s[0:3].'],
        ['method', 'A command attached to a value with a dot, like name.upper().'],
        ['immutable', 'Strings never change. Methods give you a NEW string instead.']
      ],
      slides: [
        {
          title: 'What is a string?', file: '01_strings_creation.py',
          idea: 'A string is <strong>text</strong>: letters, numbers, spaces and symbols, inside quotes.',
          analogy: 'Like beads on a string: each character is one bead, and the beads stay in order.',
          explain: `<p>Every character gets a <strong>position number</strong>, starting at <code>0</code>. Spaces count as characters too!</p>`,
          visual: cellsHTML('Hello!', [], false),
          code: `greeting = "Hello!"\nprint(greeting)\nprint(type(greeting))\nprint(len(greeting))    # how many characters`,
          out: "Hello!\n<class 'str'>\n6"
        },
        {
          title: 'Four ways to write a string', file: '01_strings_creation.py',
          idea: 'Use <code>"..."</code> or <code>\'...\'</code> for one line. Use three quotes <code>"""..."""</code> for text with several lines.',
          explain: `<p>Single and double quotes work the same. Triple quotes let you press Enter inside the text, which is handy for paragraphs.</p>`,
          controls: [{ key: 'q', label: 'quotes', type: 'select', value: 0, options: [{ label: '" double', value: '"' }, { label: "' single", value: "'" }, { label: '""" triple double', value: '"""' }, { label: "''' triple single", value: "'''" }] }, { key: 't', label: 'text (one-line quotes)', type: 'text', value: 'Python tutorials by tinitiate.com' }],
          render: v => {
            if (v.q.length === 3) {
              const body = `Welcome to python\ntutorials by tinitiate.com, This is a multi line string\nas you can see using ${v.q === '"""' ? 'double' : 'single'} quotes`;
              return { code: `# THREE quotes: the text can have several lines\nvar_string = ${v.q}${body}${v.q}\n\nprint(var_string)`, out: body };
            }
            const s = v.t.replace(/\\/g, '\\\\').split(v.q).join('\\' + v.q);
            return { code: `# ${v.q === '"' ? 'DOUBLE' : 'SINGLE'} quotes: one line of text\nvar_string = ${v.q}${s}${v.q}\n\nprint(var_string)`, out: v.t };
          }
        },
        {
          title: 'Get one character: s[i]', file: '02_strings_indexing.py',
          idea: '<code>s[0]</code> gets the 1st character, <code>s[1]</code> the 2nd… Python <strong>starts counting at 0</strong>.',
          analogy: 'Like floors in some buildings: the ground floor is 0, then 1, 2, 3. Negative numbers count from the end: <code>-1</code> is the last character.',
          explain: `<p>Move the slider and watch the green box. Go too far and Python says <code>IndexError</code> (no character there).</p>`,
          controls: [{ key: 's', label: 'var_test_string', type: 'text', value: 'Python is cool' }, { key: 'i', label: 'position', type: 'range', value: 0, min: -16, max: 16 }],
          render: v => {
            const n = v.s.length, i = v.i;
            const ok = i >= -n && i < n;
            const code = `var_test_string = ${lit(v.s, '"')}\nprint(len(var_test_string))      # how many characters\nprint(var_test_string[${i}])        # the character at position ${i}`;
            const vis = cellsHTML(v.s, ok ? [i < 0 ? i + n : i] : []);
            return ok ? { code, out: `${n}\n${v.s[i < 0 ? i + n : i]}`, visual: vis } : { code, out: String(n), err: tb(3, 'IndexError: string index out of range'), visual: vis };
          },
          tip: 'Top numbers count from the start. Bottom numbers count from the end.'
        },
        {
          title: 'Cut out a piece: s[start:stop]', file: '03_strings_slicing.py',
          idea: '<code>s[start:stop]</code> cuts out the characters from <code>start</code> up to, but <strong>not including</strong>, <code>stop</code>.',
          analogy: 'Like cutting a slice of bread: you say where the cut starts and where it ends. The character at <code>stop</code> stays on the loaf.',
          explain: `<ul><li>Leave <code>start</code> empty to begin at the start</li><li>Leave <code>stop</code> empty to go to the end</li><li>A step of <code>-1</code> walks backwards, so <code>s[::-1]</code> reverses the text</li><li>Slicing never gives an error, even with big numbers</li></ul>`,
          controls: [{ key: 's', label: 'var_test_string', type: 'text', value: 'Python is cool' }, { key: 'a', label: 'start (empty = beginning)', type: 'text', value: '6' }, { key: 'b', label: 'stop (empty = end)', type: 'text', value: '' }, { key: 'st', label: 'step', type: 'select', value: 0, options: ['1', '2', '-1', '-2'] }],
          render: v => {
            const parse = x => (x.trim() === '' ? null : (/^[+-]?\d+$/.test(x.trim()) ? parseInt(x, 10) : NaN));
            const a = parse(v.a), b = parse(v.b), st = parseInt(v.st, 10);
            const expr = `var_test_string[${v.a.trim()}:${v.b.trim()}${st !== 1 ? ':' + st : ''}]`;
            const code = `var_test_string = ${lit(v.s, '"')}\nprint(${expr})`;
            if (Number.isNaN(a) || Number.isNaN(b)) return { code, out: '', err: tb(2, `NameError: name '${Number.isNaN(a) ? v.a.trim() : v.b.trim()}' is not defined`), visual: cellsHTML(v.s) };
            const idx = pySliceIdx(v.s.length, a, b, st);
            return { code, out: idx.map(i => v.s[i]).join(''), visual: cellsHTML(v.s, idx) };
          },
          tip: 'Try start <code>0</code> and stop <code>6</code> to get <code>Python</code>. Then clear both and pick step <code>-1</code>.'
        },
        {
          title: 'Join strings with +', file: '04_strings_concatenation.py',
          idea: '<code>+</code> joins strings end to end. This is called <strong>concatenation</strong> (a long word for "joining").',
          analogy: 'Like linking train carriages: <code>"John" + " " + "Doe"</code> links three carriages into one train.',
          controls: [{ key: 'f', label: 'first_name', type: 'text', value: 'John' }, { key: 'l', label: 'last_name', type: 'text', value: 'Doe' }, { key: 'sep', label: 'put between them', type: 'select', value: 0, options: [{ label: '" " a space', value: ' ' }, { label: '"" nothing', value: '' }, { label: '"-"', value: '-' }, { label: '", "', value: ', ' }] }],
          render: v => {
            const full = v.f + v.sep + v.l;
            return { code: `first_name = ${lit(v.f, '"')}\nlast_name = ${lit(v.l, '"')}\n\n# Join the strings together\nfull_name = first_name + ${lit(v.sep, '"')} + last_name\nprint(full_name)\nprint(len(full_name))`, out: `${full}\n${[...full].length}`, visual: tokensHTML([v.f, v.l], v.sep) };
          }
        },
        {
          title: 'Change UPPER and lower case', file: '05_strings_case_conversion_methods.py',
          idea: 'Methods like <code>.upper()</code> give you a new copy of the text in a different case.',
          explain: `<ul><li><code>upper()</code> → ALL CAPITALS</li><li><code>lower()</code> → all small letters</li><li><code>title()</code> → Every Word Capitalised</li><li><code>swapcase()</code> → flips each letter</li><li><code>capitalize()</code> → only the first letter capital</li></ul>`,
          analogy: 'A <strong>method</strong> is an action you ask the text to do. You write it after a dot: <code>text.upper()</code> means "text, please make an uppercase copy of yourself".',
          controls: [{ key: 's', label: 'var_string_case_test', type: 'text', value: 'learn PYTHON' }],
          render: v => ({
            code: `var_string_case_test = ${lit(v.s, '"')}\n\nprint(var_string_case_test.upper())\nprint(var_string_case_test.lower())\nprint(var_string_case_test.title())\nprint(var_string_case_test.swapcase())\nprint(var_string_case_test.capitalize())`,
            out: [v.s.toUpperCase(), v.s.toLowerCase(), pyTitle(v.s), pySwap(v.s), pyCap(v.s)].join('\n')
          }),
          tip: 'Handy for comparing answers: <code>answer.lower() == "yes"</code> accepts YES, Yes and yes.'
        },
        {
          title: 'Check what is inside: is...()', file: '06_strings_checking_methods.py',
          idea: 'Methods starting with <code>is</code> answer a yes/no question about the text: <code>True</code> or <code>False</code>.',
          explain: `<ul><li><code>isupper()</code> are all letters capitals?</li><li><code>islower()</code> are all letters small?</li><li><code>isalpha()</code> only letters?</li><li><code>isdigit()</code> / <code>isnumeric()</code> only digits?</li><li><code>isalnum()</code> only letters and digits?</li><li><code>isspace()</code> only spaces?</li></ul>`,
          controls: [{ key: 's', label: 'text to check', type: 'text', value: 'PYTHON01' }],
          render: v => {
            const r = [['isupper', pyIsUpper(v.s)], ['islower', pyIsLower(v.s)], ['isalpha', pyIsAlpha(v.s)], ['isdigit', pyIsDigit(v.s)], ['isnumeric', pyIsNumeric(v.s)], ['isalnum', pyIsAlnum(v.s)], ['isspace', pyIsSpace(v.s)]];
            return { code: `s = ${lit(v.s)}\n\n` + r.map(([m]) => `print(s.${m}())`).join('\n'), out: r.map(([, b]) => pyBool(b)).join('\n'), visual: badges(r.map(([m, b]) => [m + '()', b])) };
          },
          tip: 'Useful for checking user input, such as "did they type only digits for their age?". Try <code>1000</code>, <code>python</code> or <code>hi there</code>.'
        },
        {
          title: 'Starts with… ends with…', file: '06_strings_checking_methods.py',
          idea: '<code>startswith()</code> and <code>endswith()</code> check the beginning or the end of the text.',
          analogy: 'Like checking if a file name ends with <code>.pdf</code>, or a phone number starts with <code>+91</code>.',
          controls: [{ key: 's', label: 'text', type: 'text', value: 'Hello, world!' }, { key: 'p', label: 'starts with?', type: 'text', value: 'Hello' }, { key: 'x', label: 'ends with?', type: 'text', value: 'world!' }],
          render: v => ({
            code: `text = ${lit(v.s, '"')}\n\nprint(text.startswith(${lit(v.p, '"')}))\nprint(text.endswith(${lit(v.x, '"')}))\n\n# Optional: only check part of the text\nprint(text.startswith("world", 7))     # start looking at position 7\nprint(text.endswith("lo,", 0, 6))      # only look at positions 0 to 5`,
            out: [v.s.startsWith(v.p), v.s.endsWith(v.x), v.s.slice(7).startsWith('world'), v.s.slice(0, 6).endsWith('lo,')].map(pyBool).join('\n')
          }),
          tip: 'Capitals matter: <code>"Hello".startswith("hello")</code> is <code>False</code>.'
        },
        {
          title: 'Trim the edges: strip()', file: '07_strings_stripping_methods.py',
          idea: '<code>strip()</code> removes unwanted characters from the <strong>edges</strong> of the text. The middle is never touched.',
          analogy: 'Like trimming the crust off a sandwich: <code>strip()</code> cuts both sides, <code>lstrip()</code> only the left, <code>rstrip()</code> only the right.',
          explain: `<p>With empty brackets it removes spaces. Put characters inside, like <code>strip('*')</code>, to remove those instead. The <code>[ ]</code> brackets in the output just show where the text starts and ends.</p>`,
          controls: [{ key: 's', label: 'text', type: 'text', value: '   ***Hello, world!***   ' }, { key: 'c', label: 'characters to remove (empty = spaces)', type: 'text', value: '' }],
          render: v => {
            const arg = v.c === '' ? '' : lit(v.c);
            const chars = v.c === '' ? null : v.c;
            return {
              code: `text = ${lit(v.s, '"')}\n\n# The [ ] show where the text starts and ends\nprint(f"[{text.strip(${arg})}]")\nprint(f"[{text.lstrip(${arg})}]")\nprint(f"[{text.rstrip(${arg})}]")`,
              out: `[${pyStrip(v.s, chars)}]\n[${pyStrip(v.s, chars, 'l')}]\n[${pyStrip(v.s, chars, 'r')}]`
            };
          },
          tip: 'Type <code>&nbsp;*</code> (a space then a star) to remove both spaces and stars.'
        },
        {
          title: 'Line up text: ljust, center, rjust', file: '08_strings_justify_and_padding_methods.py',
          idea: 'Make text a fixed <strong>width</strong> by filling the empty space with a character.',
          analogy: 'Like aligning text in Word: left, centre or right. The fill character fills the gaps.',
          explain: `<ul><li><code>ljust</code>: text on the left</li><li><code>center</code>: text in the middle</li><li><code>rjust</code>: text on the right</li></ul>`,
          controls: [{ key: 's', label: 'text', type: 'text', value: 'Hello' }, { key: 'w', label: 'total width', type: 'range', value: 11, min: 0, max: 30 }, { key: 'f', label: 'fill character', type: 'text', value: '*' }],
          render: v => {
            const code = `text = ${lit(v.s, '"')}\n\nprint(text.ljust(${v.w}, ${lit(v.f)}))\nprint(text.center(${v.w}, ${lit(v.f)}))\nprint(text.rjust(${v.w}, ${lit(v.f)}))`;
            if ([...v.f].length !== 1) return { code, out: '', err: tb(3, 'TypeError: The fill character must be exactly one character long') };
            const pad = Math.max(0, v.w - v.s.length);
            return { code, out: `${v.s + v.f.repeat(pad)}\n${pyCenter(v.s, v.w, v.f)}\n${v.f.repeat(pad) + v.s}` };
          },
          tip: 'The fill must be exactly one character. If the width is smaller than the text, nothing changes.'
        },
        {
          title: 'Search inside text: find()', file: '09_strings_searching_methods.py',
          idea: '<code>find()</code> tells you the <strong>position</strong> where a word starts. If it is not there, you get <code>-1</code>.',
          analogy: 'Like Ctrl+F in a document: it jumps to the first match and tells you where it is.',
          explain: `<ul><li><code>find()</code> gives <code>-1</code> if nothing is found</li><li><code>index()</code> does the same, but gives an <strong>error</strong> if nothing is found</li><li><code>rfind()</code> and <code>rindex()</code> search from the right, so they find the last match</li></ul>`,
          controls: [{ key: 's', label: 'sentence', type: 'text', value: 'This is a sample sentence.' }, { key: 'q', label: 'search for', type: 'text', value: 'is' }, { key: 'm', label: 'method', type: 'select', value: 0, options: ['find', 'rfind', 'index', 'rindex'] }],
          render: v => {
            const pos = v.m.startsWith('r') ? v.s.lastIndexOf(v.q) : v.s.indexOf(v.q);
            const code = `sentence = ${lit(v.s, '"')}\n\nprint(sentence.${v.m}(${lit(v.q, '"')}))`;
            const vis = cellsHTML(v.s, pos >= 0 ? Array.from({ length: v.q.length }, (_, k) => pos + k) : [], false);
            if (pos < 0 && v.m.includes('index')) return { code, out: '', err: tb(3, 'ValueError: substring not found'), visual: vis };
            return { code, out: String(pos), visual: vis };
          },
          tip: 'Notice that "is" is found inside "<strong>Th<u>is</u></strong>" at position 2, before the word "is" at position 5.'
        },
        {
          title: 'Count, split and replace', file: '10_strings_miscellaneous_methods.py',
          idea: 'Three everyday tools: <code>len()</code> counts, <code>split()</code> breaks text into a list, <code>replace()</code> swaps words.',
          explain: `<ul><li><code>len(s)</code>: how many characters (spaces count!)</li><li><code>s.split(",")</code>: cut the text at every comma and give back a list of pieces</li><li><code>s.replace("Hello", "Hi")</code>: a new text with every "Hello" changed to "Hi"</li></ul>`,
          analogy: '<code>split()</code> is like cutting a paper strip at every comma. <code>replace()</code> is like "Find and Replace" in Word.',
          controls: [{ key: 's', label: 'my_string', type: 'text', value: 'Hello, World!' }, { key: 'sep', label: 'split at (empty = spaces)', type: 'text', value: ',' }, { key: 'o', label: 'replace this', type: 'text', value: 'Hello' }, { key: 'n', label: 'with this', type: 'text', value: 'Hi' }],
          render: v => ({
            code: `my_string = ${lit(v.s, '"')}\n\nprint(len(my_string))\nprint(my_string.split(${v.sep === '' ? '' : lit(v.sep)}))\nprint(my_string.replace(${lit(v.o)}, ${lit(v.n)}))`,
            out: `${[...v.s].length}\n${listRepr(pySplit(v.s, v.sep === '' ? null : v.sep))}\n${v.s.replaceAll(v.o, v.n)}`
          })
        },
        {
          title: 'Build sentences: 3 ways', file: '11_strings_formatting.py',
          idea: 'Three ways to put values into a sentence. They all give the same result; <strong>f-strings</strong> are the easiest.',
          explain: `<ul><li><strong>f-string</strong>: <code>f"Hi {name}"</code> (use this one)</li><li><code>.format()</code>: <code>"Hi {}".format(name)</code></li><li><code>%</code>: <code>"Hi %s" % name</code> (old style)</li></ul>`,
          controls: [{ key: 'n', label: 'name', type: 'text', value: 'Alice' }, { key: 'a', label: 'age', type: 'number', value: 30 }],
          render: v => {
            const line = `My name is ${v.n} and I am ${v.a} years old.`;
            return { code: `name = ${lit(v.n, '"')}\nage = ${v.a}\n\n# 1. f-string (easiest)\nprint(f"My name is {name} and I am {age} years old.")\n\n# 2. .format()\nprint("My name is {} and I am {} years old.".format(name, age))\n\n# 3. % (old style)\nprint("My name is %s and I am %d years old." % (name, age))`, out: [line, line, line].join('\n') };
          }
        },
        {
          title: 'Quick string tricks', file: '12_strings_operations.py',
          idea: 'Four small operators that do a lot: <code>in</code>, <code>+</code>, <code>*</code> and <code>==</code>.',
          explain: `<ul><li><code>"P" in s</code>: is "P" somewhere inside s? (True/False)</li><li><code>s + " 3.8"</code>: join</li><li><code>s * 3</code>: repeat</li><li><code>s == "Python"</code>: exactly the same? Capitals matter!</li></ul>`,
          controls: [{ key: 's', label: 'my_string', type: 'text', value: 'Python' }, { key: 'c', label: 'is this inside?', type: 'text', value: 'P' }, { key: 'n', label: 'repeat', type: 'range', value: 3, min: 0, max: 6 }],
          render: v => ({
            code: `my_string = ${lit(v.s, '"')}\n\nprint(${lit(v.c, '"')} in my_string)    # is it inside?\nprint(my_string + " 3.8")   # join\nprint(my_string * ${v.n})        # repeat\nprint(my_string == "Python") # exactly the same?`,
            out: `${pyBool(v.s.includes(v.c))}\n${v.s} 3.8\n${v.s.repeat(v.n)}\n${pyBool(v.s === 'Python')}`
          }),
          tip: 'Type <code>python</code> (small p) in the first box and watch the last line become <code>False</code>.'
        },
        {
          title: 'Cheat sheet: strings', file: 'recap',
          idea: 'Everything from this module on one page. Come back here whenever you forget something.',
          visual: '<table class="py-table"><thead><tr><th>You want to…</th><th>Write</th></tr></thead><tbody>' + [
            ['count characters', 'len(s)'], ['get the first character', 's[0]'], ['get the last character', 's[-1]'], ['cut a piece', 's[0:3]'], ['reverse', 's[::-1]'],
            ['CAPITALS / small', 's.upper() / s.lower()'], ['trim spaces', 's.strip()'], ['find a word', 's.find("x")'], ['swap words', 's.replace("a", "b")'], ['cut into a list', 's.split(",")']
          ].map(r => `<tr><td style="font-family:inherit;color:#e2e8f0;font-weight:600;">${r[0]}</td><td style="font-family:var(--font-mono);color:#fde68a;">${esc(r[1])}</td></tr>`).join('') + '</tbody></table>',
          code: `s = "  Hello, Python  "\nclean = s.strip()\n\nprint(len(clean))\nprint(clean[0], clean[-1])\nprint(clean[0:5])\nprint(clean[::-1])\nprint(clean.upper())\nprint(clean.find("Python"))\nprint(clean.replace("Hello", "Hi"))\nprint(clean.split(", "))`,
          out: "13\nH n\nHello\nnohtyP ,olleH\nHELLO, PYTHON\n7\nHi, Python\n['Hello', 'Python']"
        }
      ]
    }
  };
  DECKS.variables = {
    name: 'Python Variables', short: 'Variables', icon: 'x=', accent: '#f472b6', page: 'variables.html', folder: 'python-core-language/python-variables',
    blurb: 'Give a value a name so you can store it, change it and use it again later.',
    glossary: [
      ['variable', 'A name that holds a value, like the label on a jar.'],
      ['=', 'The assignment sign. It means "store", not "equals".'],
      ['assign', 'To put a value into a variable: age = 25.'],
      ['reassign', 'To put a new value into a variable that already exists. The old value is thrown away.'],
      ['del', 'A command that deletes a variable, so its name stops working.'],
      ['keyword', 'A word Python keeps for itself, like if, for or class. It cannot be a variable name.']
    ],
    slides: [
      {
        title: 'What is a variable?', file: '01_variables_simple_creation.py',
        idea: 'A variable is a <strong>name</strong> that holds a value, so you can use that value again later.',
        analogy: 'Think of labelled jars in a kitchen. The <strong>label</strong> is the variable name, and what is <strong>inside the jar</strong> is the value. Ask for a jar by its label and you get what is inside.',
        explain: `<p>Python has no separate "create" step. The moment you write <code>name = value</code>, the variable exists.</p><p>The <code>=</code> sign means <strong>"store"</strong>, not "equals". Read <code>variable1 = 1</code> as "variable1 stores 1".</p>`,
        visual: anatomy([['variable1', 'the name (label)', C.cmd], ['=', 'means "store"', C.op], ['1', 'the value', C.txt]]) +
          '<div style="margin-top:16px;">' + boxRow([varBox('variable1', '1', 'int'), varBox('variable2', 'test', 'str'), varBox('variable3', '100.4', 'float')]) + '</div>',
        code: `variable1 = 1        # a whole number (int)\nvariable2 = "test"   # text (str)\nvariable3 = 100.4    # a decimal number (float)\n\n# Print all three variables\nprint("variable1 : ", variable1)\nprint("variable2 : ", variable2)\nprint("variable3 : ", variable3)`,
        out: 'variable1 :  1\nvariable2 :  test\nvariable3 :  100.4',
        tip: 'The GitHub example ends each line with <code>;</code>. Python allows it, but you never need it.'
      },
      {
        title: 'Make your own variables', file: '01_variables_simple_creation.py',
        idea: 'Put any value in a variable. Python works out its type from the value you give.',
        explain: `<p>Text needs quotes. Numbers do not. A number with a dot, like <code>100.4</code>, is a float. A number without a dot is an int.</p>`,
        controls: [{ key: 'a', label: 'variable1 (whole number)', type: 'number', value: 1 }, { key: 'b', label: 'variable2 (text)', type: 'text', value: 'test' }, { key: 'c', label: 'variable3 (decimal number)', type: 'text', value: '100.4' }],
        render: v => {
          const t = v.c.trim();
          const code = `variable1 = ${v.a}\nvariable2 = ${lit(v.b, '"')}\nvariable3 = ${t}\n\nprint("variable1 : ", variable1)\nprint("variable2 : ", variable2)\nprint("variable3 : ", variable3)`;
          if (!/^[+-]?((0|[1-9]\d*)(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(t)) {
            if (/^[A-Za-z_]\w*$/.test(t) && !PY_KEYWORDS.has(t)) return { code, out: '', err: tb(3, `NameError: name '${t}' is not defined`) };
            return { code, out: '', err: '  File "demo.py", line 3\nSyntaxError: invalid syntax' };
          }
          const isF = /[.eE]/.test(t);
          const c = isF ? pyFloat(Number(t)) : String(parseInt(t, 10));
          return {
            code, out: `variable1 :  ${v.a}\nvariable2 :  ${v.b}\nvariable3 :  ${c}`,
            visual: boxRow([varBox('variable1', String(v.a), 'int'), varBox('variable2', v.b, 'str'), varBox('variable3', c, isF ? 'float' : 'int')])
          };
        },
        tip: 'Type <code>abc</code> as the decimal number. Without quotes Python thinks it is a variable name and gives a <code>NameError</code>.'
      },
      {
        title: 'Change a variable (reassign)', file: '02_variables_reassign_and_delete.py',
        idea: 'Give a variable a new value with <code>=</code> again. The old value is <strong>replaced</strong>.',
        analogy: 'Like a whiteboard with a name written at the top: rub out the old number, write a new one. The board only ever shows one value.',
        controls: [{ key: 'a', label: 'first value', type: 'number', value: 1 }, { key: 'b', label: 'new value', type: 'number', value: 4 }],
        render: v => ({
          code: `variable1 = ${v.a}\nprint("variable1 first value: ", variable1)\n\n# Reassign: put a new value in the same variable\nvariable1 = ${v.b}\nprint("variable1 reassigned value: ", variable1)`,
          out: `variable1 first value:  ${v.a}\nvariable1 reassigned value:  ${v.b}`,
          visual: boxRow([goneBox('variable1', String(v.a), 'before'), arrow, varBox('variable1', String(v.b), 'after')])
        }),
        tip: 'Python runs from top to bottom, so line 2 still prints the first value. Only the lines after the change see the new one.'
      },
      {
        title: 'Copy one variable into another', file: '02_variables_reassign_and_delete.py',
        idea: '<code>variable1 = variable2</code> means: "take the value in variable2 and store it in variable1 too".',
        explain: `<ul><li>Python reads the <strong>right side</strong> first, then stores the result in the name on the left</li><li><code>variable2</code> keeps its value. It is copied, not moved</li><li>A variable can switch type: <code>variable1</code> held a number, now it holds text</li></ul>`,
        controls: [{ key: 'b', label: 'variable2', type: 'text', value: 'test' }],
        render: v => ({
          code: `variable1 = 4\nvariable2 = ${lit(v.b, '"')}\n\n# variable1 gets the value stored in variable2\nvariable1 = variable2\nprint("variable1 again reassigned value: ", variable1)\nprint("variable2 still has: ", variable2)\nprint(type(variable1))`,
          out: `variable1 again reassigned value:  ${v.b}\nvariable2 still has:  ${v.b}\n<class 'str'>`,
          visual: boxRow([varBox('variable2', v.b, 'str'), arrow, varBox('variable1', v.b, 'was 4, now a str')])
        })
      },
      {
        title: 'Delete a variable with del', file: '02_variables_reassign_and_delete.py',
        idea: '<code>del name</code> removes the variable. After that, using the name gives an <strong>error</strong>.',
        analogy: 'Like throwing a jar away: the label is gone too, so asking for that jar fails.',
        explain: `<p>Delete several at once with commas: <code>del variable1, variable2</code>.</p>`,
        controls: [{ key: 'm', label: 'what to try', type: 'select', value: 0, options: [{ label: 'del variable1, then print variable1', value: 0 }, { label: 'del variable1, then print variable2', value: 1 }, { label: 'del variable1, variable2, then print variable2', value: 2 }] }],
        render: v => {
          const del = v.m === 2 ? 'del variable1, variable2' : 'del variable1';
          const who = v.m === 0 ? 'variable1' : 'variable2';
          const code = `variable1 = 4\nvariable2 = "test"\nprint("variable1 : ", variable1)\n\n# del removes the variable completely\n${del}\nprint("${who} : ", ${who})`;
          const visual = boxRow([goneBox('variable1', '4', 'deleted'), v.m === 2 ? goneBox('variable2', 'test', 'deleted') : varBox('variable2', 'test', 'still here')]);
          if (v.m === 1) return { code, out: 'variable1 :  4\nvariable2 :  test', visual };
          const hint = v.m === 0 ? ". Did you mean: 'variable2'?" : '';
          return { code, out: 'variable1 :  4', err: tb(7, `NameError: name '${who}' is not defined${hint}`), visual };
        },
        tip: 'The <code>NameError</code> is expected here: the name no longer exists. Python even guesses which name you meant.'
      },
      {
        title: 'One value, many names', file: '03_variables_syntax_variations.py',
        idea: '<code>var1 = var2 = 100</code> stores the same value in both variables in one line.',
        controls: [{ key: 'n', label: 'value', type: 'number', value: 100 }],
        render: v => ({
          code: `# The same value for two variables, in one line\nvar1 = var2 = ${v.n}\n\nprint("var1 : ", var1)\nprint("var2 : ", var2)`,
          out: `var1 :  ${v.n}\nvar2 :  ${v.n}`,
          visual: boxRow([varBox('var1', String(v.n)), varBox('var2', String(v.n))])
        }),
        tip: 'Handy for starting several counters at zero: <code>wins = losses = 0</code>.'
      },
      {
        title: 'Many values in one line', file: '03_variables_syntax_variations.py',
        idea: '<code>var100, var200 = 100, 200</code> gives each name on the left the value in the same position on the right.',
        analogy: 'Like handing out name tags in a queue: the first name gets the first value, the second name gets the second value.',
        explain: `<p>The number of names and values must match. A neat trick: <code>a, b = b, a</code> swaps two variables.</p>`,
        controls: [{ key: 'a', label: 'first value', type: 'number', value: 100 }, { key: 'b', label: 'second value', type: 'number', value: 200 }, { key: 'm', label: 'what to try', type: 'select', value: 0, options: [{ label: 'print them', value: 0 }, { label: 'swap them', value: 1 }, { label: 'give 3 values to 2 names', value: 2 }] }],
        render: v => {
          const vals = v.m === 2 ? `${v.a}, ${v.b}, ${v.b + 100}` : `${v.a}, ${v.b}`;
          const swap = v.m === 1 ? '\n# Swap: each one gets the other\'s value\nvar100, var200 = var200, var100\n' : '';
          const code = `# Two names, two values, in one line\nvar100, var200 = ${vals}\n${swap}\nprint("var100 : ", var100)\nprint("var200 : ", var200)`;
          if (v.m === 2) return { code, out: '', err: tb(2, 'ValueError: too many values to unpack (expected 2)') };
          const [x, y] = v.m === 1 ? [v.b, v.a] : [v.a, v.b];
          return { code, out: `var100 :  ${x}\nvar200 :  ${y}`, visual: boxRow([varBox('var100', String(x)), varBox('var200', String(y))]) };
        }
      },
      {
        title: 'Rules for variable names', file: 'python_variables.md',
        idea: 'A name may use <strong>letters, digits and _</strong>, must <strong>not start with a digit</strong>, and must <strong>not be a Python keyword</strong>.',
        explain: `<ul><li>Good: <code>age</code>, <code>my_age</code>, <code>age2</code>, <code>_total</code></li><li>Bad: <code>2age</code> (starts with a digit), <code>my age</code> (has a space), <code>class</code> (a keyword)</li></ul>`,
        controls: [{ key: 'name', label: 'try a variable name', type: 'text', value: 'my_age' }],
        render: v => {
          const n = v.name.trim();
          const r1 = /^[\p{L}\p{N}_]+$/u.test(n), r2 = n !== '' && !/^\p{N}/u.test(n), r3 = !PY_KEYWORDS.has(n);
          const code = `# Try your own variable name\n${n} = 25\nprint(${n})`;
          const visual = badges([['Only letters, digits and _', r1], ['Does not start with a digit', r2], ['Not a Python keyword', r3]]);
          if (r1 && r2 && r3) return { code, out: '25', visual };
          let msg = 'invalid syntax';
          if (/^\d[\d_]*$/.test(n)) msg = "cannot assign to literal here. Maybe you meant '==' instead of '='?";
          else if (r1 && !r2) msg = 'invalid decimal literal';
          else if (['True', 'False', 'None'].includes(n)) msg = `cannot assign to ${n}`;
          return { code, out: '', err: `  File "demo.py", line 2\n    ${n} = 25\nSyntaxError: ${msg}`, visual };
        },
        tip: 'Try <code>2age</code>, <code>my age</code>, <code>class</code> and <code>first_name</code>. Watch the green and red rule badges.'
      },
      {
        title: 'Capital letters matter', file: 'python_variables.md',
        idea: 'Names are <strong>case-sensitive</strong>: <code>age</code>, <code>Age</code> and <code>AGE</code> are three different variables.',
        analogy: 'Like passwords: one capital letter makes it a different word.',
        explain: `<p>Most Python code uses small letters with underscores between words: <code>first_name</code>, <code>total_price</code>.</p>`,
        controls: [{ key: 'pick', label: 'print which one?', type: 'select', value: 0, options: ['age', 'Age', 'AGE'] }],
        render: v => {
          const vals = { age: 25, Age: 30, AGE: 35 };
          return {
            code: `age = 25\nAge = 30\nAGE = 35\n\nprint(${v.pick})`,
            out: String(vals[v.pick]),
            visual: boxRow(Object.keys(vals).map(k => (k === v.pick ? varBox(k, String(vals[k]), 'printed') : varBox(k, String(vals[k])))))
          };
        }
      },
      {
        title: 'Cheat sheet: variables', file: 'recap',
        idea: 'Everything from this module on one page.',
        visual: recapTable([['create a variable', 'age = 25'], ['change its value', 'age = 26'], ['copy another variable', 'a = b'], ['delete it', 'del age'],
          ['same value, two names', 'x = y = 0'], ['two values, one line', 'x, y = 1, 2'], ['swap two variables', 'x, y = y, x']]),
        code: `age = 25\nage = 26\nx = y = 0\nx, y = 1, 2\nx, y = y, x\nprint(age, x, y)\n\ndel age`,
        out: '26 2 1'
      }
    ]
  };

  DECKS.operators = {
    name: 'Python Operators', short: 'Operators', icon: '+&minus;', accent: '#fb923c', page: 'operators.html', folder: 'python-core-language/python-operators',
    blurb: 'Do maths, compare values, combine yes/no answers and check what is inside a list.',
    glossary: [
      ['operator', 'A symbol that does an action, like + or ==.'],
      ['operand', 'A value the operator works on. In 10 + 3, the operands are 10 and 3.'],
      ['//', 'Floor division: divide, then throw away the decimal part.'],
      ['%', 'Modulus: the remainder left over after dividing.'],
      ['bool', 'A True or False answer. Comparisons always give a bool.'],
      ['object', 'A value stored in memory. "is" checks whether two names point to the same one.']
    ],
    slides: [
      {
        title: 'What is an operator?', file: 'python_operators.md',
        idea: 'An <strong>operator</strong> is a symbol that does something with values. The values are called <strong>operands</strong>.',
        analogy: 'In a recipe, "mix flour and sugar": flour and sugar are the operands, "mix" is the operator.',
        visual: anatomy([['a', 'operand (a value)', C.txt], ['+', 'operator (the action)', C.op], ['b', 'operand', C.txt]]) +
          '<div class="py-typegrid" style="margin-top:16px;">' + [['Arithmetic', '+ - * / // % **'], ['Comparison', '== != > < >= <='], ['Assignment', '= += -= *= /='], ['Logical', 'and or not'], ['Bitwise', '& | ^ ~ << >>'], ['Identity', 'is · is not'], ['Membership', 'in · not in']]
            .map((t, i) => `<div class="py-typebox" style="animation-delay:${i * 0.07}s"><b>${t[0]}</b><span>${esc(t[1])}</span></div>`).join('') + '</div>',
        code: `a = 10\nb = 3\n\n# + is the operator, a and b are the operands\nprint(a + b)`,
        out: '13',
        tip: 'The next slides go through each family from the list, one at a time.'
      },
      {
        title: 'Maths: + - * /', file: '01_arithmetic_operators.py',
        idea: 'The everyday maths signs. <code>*</code> means times and <code>/</code> means divide.',
        explain: `<p><code>/</code> always gives a decimal number (a float), even when the answer is whole: <code>10 / 2</code> gives <code>5.0</code>.</p>`,
        controls: [{ key: 'a', label: 'a', type: 'number', value: 10 }, { key: 'b', label: 'b', type: 'number', value: 3 }],
        render: v => {
          const A = BigInt(v.a), B = BigInt(v.b);
          const code = `a = ${v.a}\nb = ${v.b}\n\nprint(a + b)   # add\nprint(a - b)   # subtract\nprint(a * b)   # multiply\nprint(a / b)   # divide (always a decimal)`;
          const rows = ['+', '-', '*'].map(op => [`a ${op} b`, fmtNum(pyArith(A, op, B).v)]);
          const d = pyArith(A, '/', B);
          const out = rows.map(r => r[1]).join('\n');
          if (d.err) return { code, out, err: tb(7, d.err), visual: resultTable(['Code', 'Result'], rows.concat([['a / b', 'error']])) };
          rows.push(['a / b', fmtNum(d.v)]);
          return { code, out: out + '\n' + fmtNum(d.v), visual: resultTable(['Code', 'Result'], rows) };
        },
        tip: 'Set <code>b</code> to <code>0</code>. Dividing by zero is not allowed, so Python stops with a <code>ZeroDivisionError</code>.'
      },
      {
        title: '// and %: share out, count the leftovers', file: '01_arithmetic_operators.py',
        idea: '<code>//</code> divides and drops the decimal part. <code>%</code> gives the <strong>remainder</strong>.',
        analogy: 'Share 10 sweets between 3 children. Each child gets <code>10 // 3</code> = 3 sweets, and <code>10 % 3</code> = 1 sweet is left over.',
        controls: [{ key: 's', label: 'sweets', type: 'range', value: 10, min: 0, max: 30 }, { key: 'k', label: 'children', type: 'range', value: 3, min: 1, max: 8 }],
        render: v => {
          const q = Math.floor(v.s / v.k), r = v.s % v.k;
          const dots = n => '<i></i>'.repeat(n) || '<small>none</small>';
          return {
            code: `sweets = ${v.s}\nchildren = ${v.k}\n\nprint(sweets // children)   # sweets for each child\nprint(sweets % children)    # sweets left over`,
            out: `${q}\n${r}`,
            visual: '<div class="py-groups">' + Array.from({ length: v.k }, (_, i) => `<div class="py-group" style="animation-delay:${i * 0.05}s"><b>child ${i + 1}</b><div class="py-sweets">${dots(q)}</div></div>`).join('') +
              `<div class="py-group left"><b>left over</b><div class="py-sweets">${dots(r)}</div></div></div>`
          };
        },
        tip: '<code>% 2</code> tells you if a number is even: <code>8 % 2</code> is <code>0</code> (even), <code>7 % 2</code> is <code>1</code> (odd).'
      },
      {
        title: 'Powers with **', file: '01_arithmetic_operators.py',
        idea: '<code>a ** b</code> multiplies <code>a</code> by itself <code>b</code> times.',
        analogy: '<code>10 ** 3</code> is 10 &times; 10 &times; 10. It is the "squared" and "cubed" from school maths.',
        controls: [{ key: 'a', label: 'a (the number)', type: 'number', value: 10 }, { key: 'b', label: 'b (how many times)', type: 'range', value: 3, min: 0, max: 10 }],
        render: v => {
          const res = String(BigInt(v.a) ** BigInt(v.b));
          const steps = v.b === 0 ? 'any number to the power 0 is 1' : Array(v.b).fill(v.a < 0 ? `(${v.a})` : String(v.a)).join(' × ');
          return {
            code: `a = ${v.a}\nb = ${v.b}\n\nprint(a ** b)   # a multiplied by itself b times`,
            out: res,
            visual: `<div class="py-tokens"><span class="py-token">${esc(steps)}</span><span style="color:#fde68a;font-weight:800;">=</span><span class="py-token sep">${res}</span></div>`
          };
        },
        tip: 'Python numbers have no size limit. Try <code>2</code> to the power <code>10</code>, then type <code>99</code> for a.'
      },
      {
        title: 'Comparisons: ask a yes/no question', file: '02_comparison_operators.py',
        idea: 'Comparison operators compare two values and answer <code>True</code> or <code>False</code>.',
        analogy: 'Like a quiz question: "is 10 bigger than 5?" The answer is always yes (True) or no (False).',
        explain: `<p>Careful: <code>=</code> <strong>stores</strong> a value, <code>==</code> <strong>compares</strong> two values.</p>`,
        controls: [{ key: 'x', label: 'x', type: 'number', value: 10 }, { key: 'y', label: 'y', type: 'number', value: 5 }],
        render: v => {
          const rows = [['x == y', 'equal to', v.x === v.y], ['x != y', 'not equal to', v.x !== v.y], ['x > y', 'greater than', v.x > v.y],
            ['x < y', 'less than', v.x < v.y], ['x >= y', 'greater than or equal to', v.x >= v.y], ['x <= y', 'less than or equal to', v.x <= v.y]];
          return {
            code: `x = ${v.x}\ny = ${v.y}\n\n` + rows.map(r => `print(${r[0]})`.padEnd(15) + `# ${r[1]}`).join('\n'),
            out: rows.map(r => pyBool(r[2])).join('\n'),
            visual: resultTable(['Question', 'Answer'], rows.map(r => [r[0], pyBool(r[2]), r[2]]))
          };
        },
        tip: 'Make <code>x</code> and <code>y</code> the same number and see which answers turn <code>True</code>.'
      },
      {
        title: 'Shortcuts: += -= *= and friends', file: '03_assignment_operators.py',
        idea: '<code>a += 5</code> is short for <code>a = a + 5</code>: take the current value, change it, store it back.',
        analogy: 'Like a scoreboard: "+= 5" adds 5 points to whatever the score already is.',
        controls: [{ key: 'a', label: 'starting value of a', type: 'number', value: 10 }, { key: 'op', label: 'operator', type: 'select', value: 0, options: ['+=', '-=', '*=', '/=', '%=', '//=', '**='] }, { key: 'n', label: 'number', type: 'number', value: 5 }],
        render: v => {
          const op = v.op.slice(0, -1);
          const code = `a = ${v.a}\nprint(a)\n\na ${v.op} ${v.n}    # same as: a = a ${op} ${v.n}\nprint(a)`;
          if (op === '**' && Math.abs(v.n) > 2000) return { code, out: `${v.a}\n(the answer is too long to show here: press Run to see it)` };
          const r = pyArith(BigInt(v.a), op, BigInt(v.n));
          if (r.err) return { code, out: String(v.a), err: tb(4, r.err) };
          const res = fmtNum(r.v);
          return { code, out: `${v.a}\n${res}`, visual: boxRow([goneBox('a', String(v.a), 'before'), arrow, varBox('a', res.length > 24 ? res.slice(0, 22) + '…' : res, `after a ${v.op} ${v.n}`)]) };
        },
        tip: 'Pick <code>/=</code>: the result becomes a decimal number (a float), because <code>/</code> always gives a float.'
      },
      {
        title: 'A chain of updates', file: '03_assignment_operators.py',
        idea: 'Each shortcut changes <code>a</code> and the next line starts from the <strong>new</strong> value.',
        explain: `<p>Follow the value step by step. After <code>/=</code> the value is a float (<code>6.0</code>) and it stays a float afterwards.</p>`,
        visual: '<div class="py-tokens">' + [['a = 10', '10'], ['+= 5', '15'], ['-= 3', '12'], ['*= 2', '24'], ['/= 4', '6.0'], ['%= 5', '1.0'], ['//= 2', '0.0'], ['**= 3', '0.0']]
          .map(([c, val], i) => `${i ? '<span style="color:#fde68a;font-weight:800;">&rarr;</span>' : ''}<span class="py-token" title="${esc(c)}" style="animation-delay:${i * 0.08}s">${esc(c)} <b style="color:#fff;">${val}</b></span>`).join('') + '</div>',
        code: `a = 10\nprint(a)\n\na += 5     # a = a + 5\nprint(a)\n\na -= 3     # a = a - 3\nprint(a)\n\na *= 2     # a = a * 2\nprint(a)\n\na /= 4     # a = a / 4\nprint(a)\n\na %= 5     # a = a % 5\nprint(a)\n\na //= 2    # a = a // 2\nprint(a)\n\na **= 3    # a = a ** 3\nprint(a)`,
        out: '10\n15\n12\n24\n6.0\n1.0\n0.0\n0.0',
        tip: 'Change the first line to <code>a = 7</code> and press Run to follow a different chain.'
      },
      {
        title: 'Logic: and, or, not', file: '04_logical_operators.py',
        idea: '<code>and</code> needs <strong>both</strong> sides True. <code>or</code> needs <strong>at least one</strong>. <code>not</code> flips the answer.',
        analogy: '"You can play if your homework is done <strong>and</strong> your room is tidy" is strict: both must be true. With <strong>or</strong>, either one is enough.',
        controls: [{ key: 'x', label: 'x', type: 'number', value: 5 }, { key: 'y', label: 'y', type: 'number', value: 10 }, { key: 'z', label: 'z', type: 'number', value: 15 }],
        render: v => {
          const p = v.x < v.y, q = v.y < v.z, r = v.y > v.z;
          return {
            code: `x = ${v.x}\ny = ${v.y}\nz = ${v.z}\n\nprint(x < y and y < z)   # both must be True\nprint(x < y or y > z)    # one is enough\nprint(not(x < y))        # flips the answer`,
            out: `${pyBool(p && q)}\n${pyBool(p || r)}\n${pyBool(!p)}`,
            visual: resultTable(['Part', 'Answer'], [['x < y', pyBool(p)], ['y < z', pyBool(q)], ['y > z', pyBool(r)], ['x < y and y < z', pyBool(p && q), true], ['x < y or y > z', pyBool(p || r), true], ['not(x < y)', pyBool(!p), true]])
          };
        }
      },
      {
        title: 'The truth table', file: '04_logical_operators.py',
        idea: 'Only four combinations exist. Pick values for <code>A</code> and <code>B</code> and find your row in the table.',
        controls: [{ key: 'a', label: 'A', type: 'select', value: 0, options: ['True', 'False'] }, { key: 'b', label: 'B', type: 'select', value: 1, options: ['True', 'False'] }],
        render: v => {
          const A = v.a === 'True', B = v.b === 'True';
          const row = (a, b) => `<tr${a === A && b === B ? ' class="on"' : ''}><td>${pyBool(a)}</td><td>${pyBool(b)}</td><td>${pyBool(a && b)}</td><td>${pyBool(a || b)}</td><td>${pyBool(!a)}</td></tr>`;
          return {
            code: `A = ${v.a}\nB = ${v.b}\n\nprint(A and B)\nprint(A or B)\nprint(not A)`,
            out: `${pyBool(A && B)}\n${pyBool(A || B)}\n${pyBool(!A)}`,
            visual: '<table class="py-table"><thead><tr><th>A</th><th>B</th><th>A and B</th><th>A or B</th><th>not A</th></tr></thead><tbody>' + row(true, true) + row(true, false) + row(false, true) + row(false, false) + '</tbody></table>'
          };
        },
        tip: '<code>A and B</code> is True in only one row. <code>A or B</code> is False in only one row.'
      },
      {
        title: 'Bitwise: working with 0s and 1s', file: '05_bitwise_operators.py',
        idea: 'Computers store numbers as 0s and 1s (binary). Bitwise operators compare those digits one column at a time.',
        explain: `<ul><li><code>&amp;</code> 1 where <strong>both</strong> have 1</li><li><code>|</code> 1 where <strong>either</strong> has 1</li><li><code>^</code> 1 where they are <strong>different</strong></li><li><code>~a</code> gives <code>-(a + 1)</code></li><li><code>&lt;&lt; 1</code> doubles, <code>&gt;&gt; 1</code> halves (rounding down)</li></ul><p>This is an advanced topic. You can skip it for now and come back later.</p>`,
        controls: [{ key: 'a', label: 'a', type: 'range', value: 10, min: 0, max: 63 }, { key: 'b', label: 'b', type: 'range', value: 4, min: 0, max: 63 }],
        render: v => ({
          code: `a = ${v.a}\nb = ${v.b}\n\nprint(a & b)    # AND\nprint(a | b)    # OR\nprint(a ^ b)    # XOR\nprint(~a)       # NOT\nprint(a << 1)   # shift left\nprint(a >> 1)   # shift right`,
          out: [v.a & v.b, v.a | v.b, v.a ^ v.b, ~v.a, v.a << 1, v.a >> 1].join('\n'),
          visual: bitsHTML([['a', v.a], ['b', v.b], ['a & b', v.a & v.b, true], ['a | b', v.a | v.b, true], ['a ^ b', v.a ^ v.b, true]])
        }),
        tip: 'Highlighted squares are 1s. Compare the columns of <code>a</code> and <code>b</code> with each result row.'
      },
      {
        title: 'Identity: is and is not', file: '06_identity_operators.py',
        idea: '<code>==</code> asks "same values?". <code>is</code> asks "the very <strong>same object</strong> in memory?".',
        analogy: 'Identical twins look the same (<code>==</code> is True) but are two different people (<code>is</code> is False). A nickname is just another name for the same person (<code>is</code> is True).',
        controls: [{ key: 'm', label: 'what is z?', type: 'select', value: 0, options: [{ label: 'z = x  (another name for x)', value: 0 }, { label: 'z = a brand-new list', value: 1 }] }],
        render: v => {
          const same = v.m === 0;
          const obj = (names, label) => `<div class="py-obj"><div class="py-names">${names.map(n => `<span>${n}</span>`).join('')}</div><div class="py-objbox"><small>${label}</small><code>['apple', 'banana']</code></div></div>`;
          return {
            code: `x = ["apple", "banana"]\ny = ["apple", "banana"]\nz = ${same ? 'x' : '["apple", "banana"]'}\n\nprint(x == y)       # same values?\nprint(x is y)       # same object?\nprint(x is z)\nprint(x is not y)`,
            out: `True\nFalse\n${pyBool(same)}\nTrue`,
            visual: '<div class="py-objs">' + (same ? obj(['x', 'z'], 'list #1') + obj(['y'], 'list #2') : obj(['x'], 'list #1') + obj(['y'], 'list #2') + obj(['z'], 'list #3')) + '</div>'
          };
        },
        tip: 'Use <code>==</code> to compare values. Keep <code>is</code> for checking <code>None</code>: <code>if result is None:</code>'
      },
      {
        title: 'Membership: in and not in', file: '07_membership_operators.py',
        idea: '<code>in</code> asks "is this value inside?". <code>not in</code> asks the opposite.',
        analogy: 'Like checking a guest list at a party door: is this name on the list?',
        controls: [{ key: 'items', label: 'my_list items (separate with commas)', type: 'text', value: '1, 2, 3, 4, 5' }, { key: 'x', label: 'look for', type: 'text', value: '3' }],
        render: v => {
          const items = parseItems(v.items), x = parseToken(v.x || "''");
          const hits = items.map((it, i) => (it.key === x.key ? i : -1)).filter(i => i >= 0);
          return {
            code: `my_list = ${itemsRepr(items)}\n\nprint(${x.repr} in my_list)\nprint(${x.repr} not in my_list)\n\n# in also works with text\nprint("py" in "python")`,
            out: `${pyBool(hits.length > 0)}\n${pyBool(!hits.length)}\nTrue`,
            visual: listCellsHTML(items, hits, false)
          };
        },
        tip: 'Words get quotes automatically. Try the list <code>apple, banana</code> and look for <code>banana</code>, then <code>Banana</code>.'
      },
      {
        title: 'Cheat sheet: operators', file: 'recap',
        idea: 'All seven operator families on one page.',
        visual: recapTable([['do maths', '+  -  *  /  //  %  **'], ['compare two values', '==  !=  >  <  >=  <='], ['update a variable', 'a += 1'], ['combine yes/no answers', 'and  or  not'],
          ['work with binary digits', '&  |  ^  ~  <<  >>'], ['check the same object', 'is  is not'], ['check if something is inside', 'in  not in']]),
        code: `a = 10\nprint(a // 3, a % 3, a ** 2)\nprint(a > 5 and a < 20)\na += 1\nprint(a)\nprint(3 in [1, 2, 3])`,
        out: '3 1 100\nTrue\n11\nTrue'
      }
    ]
  };

  DECKS.lists = {
    name: 'Python Lists', short: 'Lists', icon: '[ ]', accent: '#a3e635', page: 'lists.html', folder: 'python-core-language/python-lists',
    blurb: 'Keep many values in one place: add, remove, sort, slice and transform them.',
    glossary: [
      ['list', 'An ordered collection of values inside [ ], like [1, 2, 3].'],
      ['element', 'One item in a list.'],
      ['index', 'The position number of an item. The first item is at index 0.'],
      ['slice', 'A part of a list, cut out with [start:stop].'],
      ['method', 'A command that belongs to a value, written after a dot: my_list.append(5).'],
      ['mutable', 'Can be changed after it is made. Lists are mutable.']
    ],
    slides: [
      {
        title: 'What is a list?', file: '01_lists_creation.py',
        idea: 'A list keeps many values <strong>in order</strong>, inside square brackets <code>[ ]</code>, separated by commas.',
        analogy: 'Like a train: each carriage holds one item, and the carriages stay in the same order. You can add or remove carriages whenever you like.',
        explain: `<p>A list can hold numbers, text, a mix of types, or even other lists (a <strong>nested</strong> list).</p>`,
        visual: listCellsHTML(parseItems('apple, banana, orange'), [], false) + '<div style="margin-top:10px;">' + propBadges(true, true, true) + '</div>',
        code: `MyNumbersList = [1, 100, 9, 99]\nMyStringList  = ["A", 'b', 'Hello', "This"]\nfruits = ["apple", "banana", "orange"]\n\n# Nested list: lists inside a list\nnested_list = [[1, 2], [3, 4], [5, 6]]\n\n# Compound list: items of different types\nCompoundList = [1, "two", 3.0, True]\n\nprint(MyNumbersList)\nprint(MyStringList)\nprint(fruits)\nprint(nested_list)\nprint(CompoundList)`,
        out: "[1, 100, 9, 99]\n['A', 'b', 'Hello', 'This']\n['apple', 'banana', 'orange']\n[[1, 2], [3, 4], [5, 6]]\n[1, 'two', 3.0, True]",
        tip: 'Python always shows text items with single quotes, whichever quotes you typed.'
      },
      {
        title: 'Build your own list', file: '01_lists_creation.py',
        idea: 'Type the items with commas between them. <code>len()</code> counts how many there are.',
        controls: [{ key: 'items', label: 'items (separate with commas)', type: 'text', value: 'apple, banana, orange' }],
        render: v => {
          const items = parseItems(v.items);
          return {
            code: `my_list = ${itemsRepr(items)}\n\nprint(my_list)\nprint(len(my_list), "items")\nprint(type(my_list))`,
            out: `${itemsRepr(items)}\n${items.length} items\n<class 'list'>`,
            visual: listCellsHTML(items, [], false)
          };
        },
        tip: 'Mix types: <code>1, two, 3.0, True</code>. Words get quotes automatically; numbers and True/False do not.'
      },
      {
        title: 'Get one item by its position', file: '02_lists_accessing_elements.py',
        idea: '<code>my_list[0]</code> is the first item. Python counts positions (the <strong>index</strong>) from <strong>0</strong>.',
        analogy: 'Like floors in many lifts: the ground floor is 0, so the first floor up is 1.',
        explain: `<p>Negative numbers count from the end: <code>-1</code> is the last item, <code>-2</code> the one before it.</p>`,
        controls: [{ key: 'items', label: 'items', type: 'text', value: 'apple, banana, cherry, date' }, { key: 'i', label: 'index', type: 'number', value: 0 }],
        render: v => {
          const items = parseItems(v.items), n = items.length;
          const code = `my_list = ${itemsRepr(items)}\n\nprint(my_list[${v.i}])`;
          if (v.i >= n || v.i < -n) return { code, out: '', err: tb(3, 'IndexError: list index out of range'), visual: listCellsHTML(items) };
          const k = v.i < 0 ? v.i + n : v.i;
          return { code, out: shown(items[k]), visual: listCellsHTML(items, [k]) };
        },
        tip: 'Each box shows its index on top and its negative index below. Try <code>-1</code>, then <code>4</code> (too far: <code>IndexError</code>).'
      },
      {
        title: 'Lists inside lists', file: '03_lists_accessing_nested_list_elements.py',
        idea: 'For a list of lists, use two indexes: <code>[row][item]</code>. The first picks the inner list, the second picks inside it.',
        analogy: 'Like a flat number in a building: first the floor, then the door on that floor.',
        controls: [{ key: 'r', label: 'first index (which inner list)', type: 'range', value: 1, min: 0, max: 2 }, { key: 'c', label: 'second index (which item)', type: 'range', value: 0, min: 0, max: 1 }],
        render: v => {
          const grid = [[1, 2], [3, 4], [5, 6]];
          return {
            code: `nested_list = [[1, 2], [3, 4], [5, 6]]\n\nprint(nested_list[${v.r}])       # one inner list\nprint(nested_list[${v.r}][${v.c}])    # one item inside it`,
            out: `[${grid[v.r].join(', ')}]\n${grid[v.r][v.c]}`,
            visual: '<div class="py-grid2d">' + grid.map((row, r) => `<div class="row${r === v.r ? ' pick' : ''}"><code class="lbl">[${r}]</code>` +
              row.map((x, c) => `<div class="py-cell${r === v.r && c === v.c ? ' on' : ''}"><span class="ix">[${r}][${c}]</span><span class="ch wide">${x}</span></div>`).join('') + '</div>').join('') + '</div>'
          };
        }
      },
      {
        title: 'Slicing: cut out a part', file: '04_lists_slicing.py',
        idea: '<code>my_list[start:stop]</code> gives a new list from <code>start</code> up to, but <strong>not including</strong>, <code>stop</code>.',
        analogy: 'Like cutting a slice of bread: you say where the knife goes in and where it stops.',
        explain: `<ul><li>Leave <code>start</code> empty to begin at the first item: <code>[:2]</code></li><li>Leave <code>stop</code> empty to go to the end: <code>[2:]</code></li><li>A <code>step</code> skips items: <code>[::2]</code> takes every second item, <code>[::-1]</code> reverses</li></ul>`,
        controls: [{ key: 'items', label: 'items', type: 'text', value: 'apple, banana, cherry, date' }, { key: 'a', label: 'start (blank = beginning)', type: 'text', value: '1' }, { key: 'b', label: 'stop (blank = end)', type: 'text', value: '3' }, { key: 's', label: 'step (blank = 1)', type: 'text', value: '' }],
        render: v => {
          const items = parseItems(v.items);
          const num = t => (/^[+-]?\d+$/.test(t.trim()) ? parseInt(t, 10) : null);
          const a = num(v.a), b = num(v.b), s = num(v.s);
          const expr = `${a ?? ''}:${b ?? ''}${s != null ? ':' + s : ''}`;
          const code = `my_list = ${itemsRepr(items)}\n\nprint(my_list[${expr}])`;
          if (s === 0) return { code, out: '', err: tb(3, 'ValueError: slice step cannot be zero'), visual: listCellsHTML(items) };
          const idx = pySliceIdx(items.length, a, b, s ?? 1);
          return { code, out: itemsRepr(idx.map(i => items[i])), visual: listCellsHTML(items, idx) };
        },
        tip: 'Clear start and stop and set the step to <code>-1</code> to get the list backwards.'
      },
      {
        title: 'Join, repeat, check, compare', file: '05_lists_operations.py',
        idea: '<code>+</code> joins two lists, <code>*</code> repeats a list, <code>in</code> checks for an item, <code>==</code> compares two lists.',
        explain: `<p>Two lists are equal only when they have the same items <strong>in the same order</strong>.</p>`,
        controls: [{ key: 'l1', label: 'list1', type: 'text', value: '1, 2, 3' }, { key: 'l2', label: 'list2', type: 'text', value: '4, 5, 6' }, { key: 'n', label: 'repeat list1', type: 'range', value: 3, min: 0, max: 4 }, { key: 'x', label: 'look for in list1', type: 'text', value: '2' }],
        render: v => {
          const l1 = parseItems(v.l1), l2 = parseItems(v.l2), x = parseToken(v.x || "''");
          const rep = Array.from({ length: v.n }, () => l1).flat();
          return {
            code: `list1 = ${itemsRepr(l1)}\nlist2 = ${itemsRepr(l2)}\n\nprint(list1 + list2)    # join\nprint(list1 * ${v.n})        # repeat\nprint(${x.repr} in list1)       # is it inside?\nprint(list1 == list2)   # same items, same order?`,
            out: `${itemsRepr(l1.concat(l2))}\n${itemsRepr(rep)}\n${pyBool(l1.some(it => it.key === x.key))}\n${pyBool(sameItems(l1, l2))}`,
            visual: listCellsHTML(l1.concat(l2), l1.map((_, i) => i), false)
          };
        },
        tip: 'Type <code>1, 2, 3</code> in both boxes to make <code>list1 == list2</code> True. Then try <code>3, 2, 1</code>.'
      },
      {
        title: 'Count, smallest, biggest, total', file: '06_lists_methods.py',
        idea: '<code>len()</code> counts the items, <code>min()</code> finds the smallest, <code>max()</code> the biggest, <code>sum()</code> adds them all up.',
        explain: `<p>With text, <code>min()</code> and <code>max()</code> go by alphabetical order (capital letters come before small ones). <code>sum()</code> only works with numbers.</p>`,
        controls: [{ key: 'items', label: 'items', type: 'text', value: '1, 2, 3, 4' }],
        render: v => {
          const items = parseItems(v.items);
          const code = `my_list = ${itemsRepr(items)}\n\nprint(len(my_list))   # how many\nprint(min(my_list))   # smallest\nprint(max(my_list))   # biggest\nprint(sum(my_list))   # total`;
          const visual = listCellsHTML(items, [], false);
          if (!items.length) return { code, out: '0', err: tb(4, 'ValueError: min() iterable argument is empty'), visual };
          let lo = items[0], hi = items[0];
          for (const it of items.slice(1)) {
            if (!comparable(it, lo)) return { code, out: String(items.length), err: tb(4, notSupported('<', it, lo)), visual };
            if (pyLess(it, lo)) lo = it;
            if (pyLess(hi, it)) hi = it;
          }
          const base = `${items.length}\n${shown(lo)}\n${shown(hi)}`;
          if (lo.num == null) return { code, out: base, err: tb(6, `TypeError: unsupported operand type(s) for +: 'int' and '${pyTypeName(items[0])}'`), visual };
          const marks = [items.indexOf(lo), items.indexOf(hi)];
          return { code, out: base + '\n' + pySum(items), visual: listCellsHTML(items, marks, false) };
        },
        tip: 'Try words: <code>pear, apple, fig</code>. <code>min</code> and <code>max</code> work, but <code>sum</code> gives a <code>TypeError</code>.'
      },
      {
        title: 'Add items: append, extend, insert', file: '06_lists_methods.py',
        idea: '<code>append(x)</code> adds one item at the end. <code>extend([...])</code> adds several. <code>insert(i, x)</code> puts an item at position <code>i</code>.',
        analogy: 'append: join the back of the queue. extend: a whole group joins the back. insert: someone is let in at a chosen place in the queue.',
        controls: [{ key: 'items', label: 'my_list', type: 'text', value: '1, 2, 3, 4' }, { key: 'm', label: 'method', type: 'select', value: 0, options: ['append', 'extend', 'insert'] }, { key: 'x', label: 'value(s) to add', type: 'text', value: '5' }, { key: 'i', label: 'position (insert only)', type: 'number', value: 3 }],
        render: v => {
          const items = parseItems(v.items), n = items.length;
          let call, after, added;
          if (v.m === 'extend') {
            const more = parseItems(v.x);
            call = `my_list.extend(${itemsRepr(more)})`; after = items.concat(more); added = more.map((_, k) => n + k);
          } else {
            const x = parseToken(v.x || "''");
            if (v.m === 'append') { call = `my_list.append(${x.repr})`; after = items.concat([x]); added = [n]; }
            else {
              const at = v.i < 0 ? Math.max(0, n + v.i) : Math.min(v.i, n);
              call = `my_list.insert(${v.i}, ${x.repr})`; after = items.slice(0, at).concat([x], items.slice(at)); added = [at];
            }
          }
          return {
            code: `my_list = ${itemsRepr(items)}\nprint("Before:", my_list)\n\n${call}\nprint("After:", my_list)`,
            out: `Before: ${itemsRepr(items)}\nAfter: ${itemsRepr(after)}`,
            visual: listCellsHTML(after, added, false)
          };
        },
        tip: 'Choose <code>extend</code> and type <code>6, 7, 8, 9</code>. Then choose <code>append</code> with the same text and compare.'
      },
      {
        title: 'Remove items: remove, pop, del, clear', file: '07_lists_modification.py',
        idea: '<code>remove(x)</code> removes by <strong>value</strong>. <code>pop()</code> and <code>del</code> remove by <strong>position</strong>. <code>clear()</code> empties the list.',
        explain: `<ul><li><code>remove</code> only removes the <strong>first</strong> match</li><li><code>pop()</code> takes out the last item and hands it back to you; <code>pop(1)</code> takes out the item at index 1</li><li><code>del my_list[0]</code> deletes the item at index 0</li></ul>`,
        controls: [{ key: 'items', label: 'my_list', type: 'text', value: 'apple, banana, cherry, date' }, { key: 'm', label: 'how to remove', type: 'select', value: 0, options: [{ label: 'remove(value)', value: 'remove' }, { label: 'pop()', value: 'pop' }, { label: 'pop(position)', value: 'popi' }, { label: 'del my_list[position]', value: 'del' }, { label: 'clear()', value: 'clear' }] }, { key: 'x', label: 'value (for remove)', type: 'text', value: 'banana' }, { key: 'i', label: 'position (for pop / del)', type: 'number', value: 1 }],
        render: v => {
          const items = parseItems(v.items), n = items.length, x = parseToken(v.x || "''");
          const k = v.i < 0 ? v.i + n : v.i, inRange = v.i < n && v.i >= -n;
          const head = `my_list = ${itemsRepr(items)}\n\n`;
          let line, gone = [], popped = null, err = '';
          if (v.m === 'remove') {
            line = `my_list.remove(${x.repr})`;
            const at = items.findIndex(it => it.key === x.key);
            if (at < 0) err = 'ValueError: list.remove(x): x not in list'; else gone = [at];
          } else if (v.m === 'pop') {
            line = 'item = my_list.pop()';
            if (!n) err = 'IndexError: pop from empty list'; else { gone = [n - 1]; popped = items[n - 1]; }
          } else if (v.m === 'popi') {
            line = `item = my_list.pop(${v.i})`;
            if (!n) err = 'IndexError: pop from empty list'; else if (!inRange) err = 'IndexError: pop index out of range'; else { gone = [k]; popped = items[k]; }
          } else if (v.m === 'del') {
            line = `del my_list[${v.i}]`;
            if (!inRange) err = 'IndexError: list assignment index out of range'; else gone = [k];
          } else { line = 'my_list.clear()'; gone = items.map((_, j) => j); }
          const code = head + line + (v.m === 'pop' || v.m === 'popi' ? '\nprint("Popped:", item)' : '') + '\nprint(my_list)';
          if (err) return { code, out: '', err: tb(3, err), visual: listCellsHTML(items, [], false) };
          const after = items.filter((_, j) => !gone.includes(j));
          return {
            code, out: (popped ? `Popped: ${shown(popped)}\n` : '') + itemsRepr(after),
            visual: listCellsHTML(items, gone, false, 'gone') + '<div style="margin-top:10px;">' + listCellsHTML(after, [], false) + '</div>'
          };
        },
        tip: 'Ask <code>remove</code> for a value that is not in the list, like <code>kiwi</code>, to see the <code>ValueError</code>.'
      },
      {
        title: 'Sort, reverse, find and count', file: '06_lists_methods.py',
        idea: '<code>sort()</code> puts items in order, <code>reverse()</code> flips the order, <code>index(x)</code> finds where <code>x</code> is, <code>count(x)</code> counts how often it appears.',
        explain: `<p><code>sort()</code> and <code>reverse()</code> change the list itself and give back nothing, so print the list afterwards.</p>`,
        controls: [{ key: 'items', label: 'my_list', type: 'text', value: '3, 1, 4, 1, 5, 9, 2' }, { key: 'm', label: 'method', type: 'select', value: 0, options: ['sort()', 'sort(reverse=True)', 'reverse()', 'index(value)', 'count(value)'] }, { key: 'x', label: 'value (for index / count)', type: 'text', value: '1' }],
        render: v => {
          const items = parseItems(v.items), x = parseToken(v.x || "''");
          const head = `my_list = ${itemsRepr(items)}\n\n`;
          if (v.m.startsWith('sort')) {
            const rev = v.m !== 'sort()';
            const code = head + `my_list.${v.m}\nprint(my_list)`;
            // sort(reverse=True) flips the list before sorting, so Python compares the items in that order.
            const seq = rev ? items.slice().reverse() : items;
            for (let k = 0; k + 1 < seq.length; k++) if (!comparable(seq[k + 1], seq[k])) return { code, out: '', err: tb(3, notSupported('<', seq[k + 1], seq[k])), visual: listCellsHTML(items, [], false) };
            const sorted = items.slice().sort((a, b) => (pyLess(a, b) ? -1 : pyLess(b, a) ? 1 : 0) * (rev ? -1 : 1));
            return { code, out: itemsRepr(sorted), visual: listCellsHTML(sorted, [], false) };
          }
          if (v.m === 'reverse()') {
            const r = items.slice().reverse();
            return { code: head + 'my_list.reverse()\nprint(my_list)', out: itemsRepr(r), visual: listCellsHTML(r, [], false) };
          }
          const hits = items.map((it, i) => (it.key === x.key ? i : -1)).filter(i => i >= 0);
          if (v.m === 'count(value)') return { code: head + `print(my_list.count(${x.repr}))`, out: String(hits.length), visual: listCellsHTML(items, hits, false) };
          const code = head + `print(my_list.index(${x.repr}))`;
          if (!hits.length) return { code, out: '', err: tb(3, `ValueError: ${x.repr} is not in list`), visual: listCellsHTML(items, [], false) };
          return { code, out: String(hits[0]), visual: listCellsHTML(items, [hits[0]], true) };
        },
        tip: '<code>index</code> gives the <strong>first</strong> match only. Look for <code>1</code>: it appears twice, but you get <code>1</code>, not <code>3</code>.'
      },
      {
        title: 'Change an item', file: '07_lists_modification.py',
        idea: '<code>my_list[1] = "blueberry"</code> replaces the item at index 1. Lists can be changed: they are <strong>mutable</strong>.',
        explain: `<p>You can replace a whole part at once with a slice: <code>my_list[1:] = ['New1', 'New2']</code> replaces everything from index 1 onwards.</p>`,
        controls: [{ key: 'items', label: 'my_list', type: 'text', value: 'apple, banana, cherry, date' }, { key: 'i', label: 'position', type: 'number', value: 1 }, { key: 'x', label: 'new value', type: 'text', value: 'blueberry' }],
        render: v => {
          const items = parseItems(v.items), n = items.length, x = parseToken(v.x || "''");
          const code = `my_list = ${itemsRepr(items)}\n\nmy_list[${v.i}] = ${x.repr}\nprint(my_list)`;
          if (v.i >= n || v.i < -n) return { code, out: '', err: tb(3, 'IndexError: list assignment index out of range'), visual: listCellsHTML(items) };
          const k = v.i < 0 ? v.i + n : v.i;
          const after = items.slice();
          after[k] = x;
          return { code, out: itemsRepr(after), visual: listCellsHTML(items, [k], false, 'gone') + '<div style="margin-top:10px;">' + listCellsHTML(after, [k], false) + '</div>' };
        }
      },
      {
        title: 'Putting it all together', file: '07_lists_modification.py',
        idea: 'One list, changed step by step. Follow each <code>print</code> to see what every line did.',
        code: `my_list = ["apple", "banana", "cherry", "date"]\n\nmy_list[1] = "blueberry"\nprint(my_list)\n\nmy_list.append("elderberry")\nprint(my_list)\n\nmy_list.insert(2, "cranberry")\nprint(my_list)\n\nmy_list.remove("cherry")\nprint(my_list)\n\ndel my_list[0]\nprint(my_list)\n\npopped_item = my_list.pop()\nprint(popped_item)\nprint(my_list)\n\n# Replace everything from index 1 onwards\nmy_list[1:] = ['New1', 'New2']\nprint('Updated my_list: ', my_list)\n\n# An empty list [ ] clears it\nmy_list = []\nprint("Cleared list:", my_list)`,
        out: "['apple', 'blueberry', 'cherry', 'date']\n['apple', 'blueberry', 'cherry', 'date', 'elderberry']\n['apple', 'blueberry', 'cranberry', 'cherry', 'date', 'elderberry']\n['apple', 'blueberry', 'cranberry', 'date', 'elderberry']\n['blueberry', 'cranberry', 'date', 'elderberry']\nelderberry\n['blueberry', 'cranberry', 'date']\nUpdated my_list:  ['blueberry', 'New1', 'New2']\nCleared list: []",
        tip: 'Delete a line from the code (for example the <code>del</code> line) and press Run to see how the rest changes.'
      },
      {
        title: 'List comprehensions', file: '08_lists_comprehensions.py',
        idea: 'Build a new list from an old one in <strong>one line</strong>: <code>[x ** 2 for x in numbers]</code>.',
        analogy: 'Like a factory belt: every item from the old list goes through the same machine, and the results come out as a new list.',
        explain: `<p>Read it as "<strong>x squared, for each x in numbers</strong>". Add <code>if ...</code> at the end to keep only some items.</p>`,
        controls: [{ key: 'items', label: 'numbers (whole numbers)', type: 'text', value: '1, 2, 3, 4, 5' }, { key: 'e', label: 'what to do with each x', type: 'select', value: 0, options: ['x ** 2', 'x * 10', 'x + 100', '-x'] }, { key: 'f', label: 'which ones to keep', type: 'select', value: 0, options: ['all of them', 'if x % 2 == 0', 'if x > 2'] }],
        render: v => {
          const nums = intsFrom(v.items);
          const fn = { 'x ** 2': x => x * x, 'x * 10': x => x * 10, 'x + 100': x => x + 100, '-x': x => -x }[v.e];
          const keep = { 'all of them': () => true, 'if x % 2 == 0': x => x % 2 === 0, 'if x > 2': x => x > 2 }[v.f];
          const cond = v.f === 'all of them' ? '' : ' ' + v.f;
          const res = nums.filter(keep).map(fn);
          return {
            code: `numbers = [${nums.join(', ')}]\nnew_list = [${v.e} for x in numbers${cond}]\nprint(new_list)`,
            out: `[${res.join(', ')}]`,
            visual: '<div class="py-map">' + nums.map((x, i) => `<div class="${keep(x) ? '' : 'skip'}" style="animation-delay:${i * 0.06}s"><code>${x}</code><span>&rarr;</span><code>${keep(x) ? fn(x) : 'skipped'}</code></div>`).join('') + '</div>'
          };
        },
        tip: 'The same thing with a loop takes four lines: <code>new_list = []</code>, <code>for x in numbers:</code>, <code>new_list.append(x ** 2)</code>.'
      },
      {
        title: 'Cheat sheet: lists', file: 'recap',
        idea: 'The list tools from this module on one page.',
        visual: recapTable([['make a list', 'a = [1, 2, 3]'], ['first / last item', 'a[0]   a[-1]'], ['a part of the list', 'a[1:3]'], ['add to the end', 'a.append(4)'], ['add at a position', 'a.insert(0, 9)'],
          ['remove by value / position', 'a.remove(9)   a.pop(0)'], ['sort it', 'a.sort()'], ['count / total', 'len(a)   sum(a)'], ['transform every item', '[x * 2 for x in a]']]),
        code: `a = [3, 1, 2]\na.append(4)\na.insert(0, 9)\nprint(a)\nprint(a[0], a[-1], a[1:3])\na.remove(9)\na.sort()\nprint(a, len(a), sum(a))\nprint([x * 2 for x in a])`,
        out: '[9, 3, 1, 2, 4]\n9 4 [3, 1]\n[1, 2, 3, 4] 4 10\n[2, 4, 6, 8]'
      }
    ]
  };

  const ORDER = ['print', 'variables', 'datatypes', 'operators', 'strings', 'lists'];

  // ---------- State + persistence ----------
  const STORE_KEY = 'tinitiate.python.core.progress.v2';
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { seen = {}; }
  ORDER.forEach(k => { seen[k] = Array.isArray(seen[k]) ? seen[k].filter(i => i < DECKS[k].slides.length) : []; });
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(seen)); } catch (e) { /* storage unavailable */ } };

  const values = {};
  let deck = null, idx = 0, ready = false, playing = false, speed = 12000, autoStart = 0, autoRaf = null, typeRaf = null;
  const $ = id => document.getElementById(id);

  function valuesFor(i) {
    if (!values[i]) {
      values[i] = {};
      (DECKS[deck].slides[i].controls || []).forEach(c => { values[i][c.key] = c.value; });
    }
    return values[i];
  }
  function resolved(i) {
    const vals = valuesFor(i), out = {};
    (DECKS[deck].slides[i].controls || []).forEach(c => {
      const v = vals[c.key];
      out[c.key] = c.type === 'select' ? (typeof c.options[v] === 'string' ? c.options[v] : c.options[v].value) : v;
    });
    return out;
  }
  function compute(i) {
    const s = DECKS[deck].slides[i];
    const r = s.render ? s.render(resolved(i)) : { code: s.code, out: s.out, err: s.err };
    return { code: r.code || '', out: r.out == null ? '' : r.out, err: r.err || '', visual: r.visual != null ? r.visual : (s.visual || '') };
  }

  // ---------- Real Python: Pyodide (CPython on WebAssembly) in a Web Worker ----------
  const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/';
  // Runs the student's code as "demo.py" with fresh globals; input() reads from the answers box.
  const RUNNER = py`
import sys, builtins, linecache, traceback

def __tinitiate_run(src, answers):
    answers = list(answers)

    def _input(prompt=""):
        sys.stdout.write(str(prompt))
        if not answers:
            sys.stdout.write("\n")
            raise EOFError("input() has no answer left. Type your answers in the box under the code, one per line.")
        a = answers.pop(0)
        sys.stdout.write(a + "\n")
        return a

    linecache.cache["demo.py"] = (len(src), None, src.splitlines(True), "demo.py")
    old_input = builtins.input
    builtins.input = _input
    try:
        exec(compile(src, "demo.py", "exec"), {"__name__": "__main__"})
    except SystemExit:
        pass
    except BaseException:
        et, ev, tb = sys.exc_info()
        traceback.print_exception(et, ev, tb.tb_next)
    finally:
        builtins.input = old_input
        sys.stdout.flush()
        sys.stderr.flush()
`;
  const WORKER_SRC = `
importScripts('${PYODIDE_URL}pyodide.js');
let py = null;
const boot = loadPyodide({ indexURL: '${PYODIDE_URL}' }).then(p => {
  py = p;
  py.setStdout({ batched: s => postMessage({ t: 'out', s: s + '\\n' }) });
  py.setStderr({ batched: s => postMessage({ t: 'err', s: s + '\\n' }) });
  py.runPython(${JSON.stringify(RUNNER)});
  postMessage({ t: 'ready', v: py.runPython('import sys; sys.version.split()[0]') });
}, e => postMessage({ t: 'fail', s: String(e) }));
onmessage = async ({ data }) => {
  await boot;
  if (py) {
    try { py.globals.get('__tinitiate_run')(data.code, py.toPy(data.answers)); }
    catch (e) { postMessage({ t: 'err', s: String(e.message || e) + '\\n' }); }
  }
  postMessage({ t: 'done' });
};`;

  const engine = { worker: null, state: 'idle', label: 'Python: not started', running: false, pending: null };
  function engineStatus(state, label) {
    engine.state = state; engine.label = label;
    const el = $('py-engine');
    if (el) { el.dataset.state = state; el.textContent = label; }
  }
  function startEngine() {
    if (engine.worker) return;
    engineStatus('loading', 'Python: starting…');
    try {
      engine.worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
    } catch (e) { engineFailed(); return; }
    engine.worker.onmessage = ({ data }) => {
      if (data.t === 'ready') {
        engineStatus('ready', 'Python ' + data.v + ' ready');
        if (engine.pending) { const go = engine.pending; engine.pending = null; go(); }
      } else if (data.t === 'out' || data.t === 'err') {
        termAppend(data.t, data.s);
      } else if (data.t === 'done') {
        finishRun();
      } else if (data.t === 'fail') {
        engineFailed();
      }
    };
    engine.worker.onerror = engineFailed;
  }
  function engineFailed() {
    if (engine.worker) engine.worker.terminate();
    engine.worker = null;
    engineStatus('fail', 'Python: could not load');
    if (engine.pending || engine.running) {
      engine.pending = null;
      termClear();
      termAppend('err', 'Could not start Python in this browser. Check your internet connection, then press Run again.\n');
      finishRun();
    }
  }

  // ---------- Output terminal ----------
  function termClear() {
    cancelAnimationFrame(typeRaf);
    const term = $('py-term');
    if (term) term.innerHTML = '<span class="prompt">$ python demo.py</span>\n';
  }
  function termAppend(kind, text) {
    const term = $('py-term');
    if (!term) return;
    const note = term.querySelector('.note');
    if (note) note.remove();
    const span = document.createElement('span');
    span.className = kind === 'err' ? 'err' : (kind === 'note' ? 'note' : 'o');
    span.textContent = text;
    term.appendChild(span);
    term.scrollTop = term.scrollHeight;
  }
  function writeOut(r, animate) {
    const term = $('py-term');
    if (!term) return;
    termClear();
    term.insertAdjacentHTML('beforeend', '<span class="o"></span><span class="err"></span>');
    const o = term.querySelector('.o'), e = term.querySelector('.err');
    const errText = r.err ? (r.out ? '\n' : '') + r.err : '';
    if (!animate) { o.textContent = r.out; e.textContent = errText; return; }
    const full = r.out + errText, total = full.length;
    const caret = document.createElement('span');
    caret.className = 'py-caret';
    term.appendChild(caret);
    const perFrame = Math.max(1, Math.ceil(total / 70));
    let n = 0;
    const step = () => {
      n = Math.min(total, n + perFrame);
      o.textContent = full.slice(0, Math.min(n, r.out.length));
      e.textContent = n > r.out.length ? full.slice(r.out.length, n) : '';
      if (n < total) typeRaf = requestAnimationFrame(step); else caret.remove();
    };
    typeRaf = requestAnimationFrame(step);
  }

  // ---------- Run / stop ----------
  function setRunButton(running) {
    const b = $('py-run');
    if (!b) return;
    b.innerHTML = running ? '&#9632; Stop' : '&#9654; Run';
    b.classList.toggle('stop', running);
    b.title = running ? 'Stop the program' : 'Run the code (Ctrl+Enter)';
  }
  function runCode() {
    if (engine.running || engine.pending) return stopRun();
    const code = editorGet();
    const box = $('py-stdin-text');
    const answers = box && box.value !== '' ? box.value.replace(/\r/g, '').split('\n') : [];
    termClear();
    setRunButton(true);
    const go = () => { engine.running = true; engine.worker.postMessage({ code, answers }); };
    if (engine.state === 'ready' && engine.worker) go();
    else {
      termAppend('note', 'Starting Python in your browser… The first time takes a few seconds.\n');
      engine.pending = go;
      startEngine();
    }
  }
  function finishRun() {
    engine.running = false;
    setRunButton(false);
    const term = $('py-term');
    if (term && !term.querySelector('.o, .err')) termAppend('note', '(nothing was printed)\n');
  }
  function stopRun() {
    if (engine.worker) engine.worker.terminate();
    engine.worker = null;
    engine.pending = null;
    engine.running = false;
    engineStatus('idle', 'Python: restarting…');
    termAppend('err', '\nStopped.\n');
    setRunButton(false);
    startEngine();
  }

  // ---------- Code editor (CodeMirror 5, falls back to a plain textarea) ----------
  let cm = null, edited = false;
  function mountEditor(code) {
    const host = $('py-editor');
    edited = false;
    if (window.CodeMirror) {
      cm = window.CodeMirror(host, {
        value: code, mode: 'python', theme: 'tinitiate', lineNumbers: true, indentUnit: 4, tabSize: 4,
        matchBrackets: true, viewportMargin: Infinity, spellcheck: false, autocorrect: false, autocapitalize: false,
        extraKeys: {
          'Ctrl-Enter': runCode, 'Cmd-Enter': runCode,
          Tab: c => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ', 'end')),
          'Shift-Tab': c => c.indentSelection('subtract')
        }
      });
      cm.on('change', (_, ch) => { if (ch.origin !== 'setValue') markEdited(); updateStdinBox(); });
    } else {
      cm = null;
      host.innerHTML = '<textarea class="py-code-fallback" spellcheck="false" aria-label="Python code"></textarea>';
      const ta = host.querySelector('textarea');
      ta.value = code;
      ta.rows = Math.max(4, code.split('\n').length + 1);
      ta.addEventListener('input', () => { markEdited(); updateStdinBox(); });
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runCode(); } });
    }
    updateStdinBox();
  }
  const editorGet = () => (cm ? cm.getValue() : ($('py-editor')?.querySelector('textarea')?.value || ''));
  function editorSet(code) {
    if (cm) cm.setValue(code);
    else { const ta = $('py-editor')?.querySelector('textarea'); if (ta) ta.value = code; }
    edited = false;
    $('py-edited').hidden = true;
    updateStdinBox();
  }
  function markEdited() {
    if (edited) return;
    edited = true;
    $('py-edited').hidden = false;
    if (!engine.running && !engine.pending) {
      termClear();
      termAppend('note', 'You changed the code. Press ▶ Run (or Ctrl+Enter) to see the new result.\n');
    }
  }
  function updateStdinBox() {
    const box = $('py-stdin');
    if (box) box.hidden = !/\binput\s*\(/.test(editorGet());
  }

  // ---------- Slide rendering ----------
  function controlHTML(c, v, i) {
    const id = 'pyc-' + i;
    let input;
    if (c.type === 'select') {
      input = `<select id="${id}">` + c.options.map((o, k) => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(typeof o === 'string' ? o : o.label)}</option>`).join('') + '</select>';
    } else if (c.type === 'range') {
      input = `<input type="range" id="${id}" min="${c.min}" max="${c.max}" step="1" value="${v}">`;
    } else if (c.type === 'number') {
      input = `<input type="number" id="${id}" step="1" value="${v}">`;
    } else {
      input = `<input type="text" id="${id}" value="${esc(v)}" spellcheck="false" autocomplete="off">`;
    }
    const extra = c.type === 'range' ? ` = <span class="py-range-val" id="${id}-val">${v}</span>` : '';
    return `<div class="py-field"><label for="${id}">${esc(c.label)}${extra}</label>${input}</div>`;
  }

  function renderSlide(dir) {
    if (engine.running || engine.pending) stopRun();
    const d = DECKS[deck], i = idx, s = d.slides[i], n = d.slides.length;
    const r = compute(i);
    const vals = valuesFor(i);
    const nextKey = ORDER[ORDER.indexOf(deck) + 1];
    const controls = s.controls ? `<div class="py-controls"><span class="py-controls-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>Try it: change these and watch the code and the screen</span>${s.controls.map((c, k) => controlHTML(c, vals[c.key], k)).join('')}</div>` : '';
    const finish = i === n - 1 ? `<div class="py-finish"><span>&#127881; You finished <strong>${esc(d.name)}</strong>!</span>${nextKey ? `<a class="py-btn primary" href="${DECKS[nextKey].page}">Next: ${esc(DECKS[nextKey].name)} &rarr;</a>` : '<a class="py-btn primary" href="index.html">Back to the Python home &rarr;</a>'}</div>` : '';
    $('py-stage').innerHTML = `
      <div class="py-slide ${dir < 0 ? 'enter-prev' : (dir > 0 ? 'enter-next' : '')}">
        <div class="py-anim">
          <span class="py-eyebrow py-slide-kicker">${esc(d.short)} &bull; Slide ${i + 1} of ${n}</span>
          <h3 class="py-slide-title">${esc(s.title)}</h3>
          ${s.idea ? `<div class="py-idea"><span class="py-idea-tag">In plain English</span><span class="py-idea-text">${s.idea}</span></div>` : ''}
          ${s.analogy ? `<div class="py-analogy"><span class="py-analogy-icon" aria-hidden="true">&#128161;</span><span><strong>Think of it like this:</strong> ${s.analogy}</span></div>` : ''}
          ${s.explain ? `<div class="py-slide-explain">${s.explain}</div>` : ''}
          ${controls}
          <div class="py-visual" id="py-visual">${r.visual}</div>
          ${s.tip ? `<div class="py-tip"><span style="color:var(--deck-accent);font-weight:800;white-space:nowrap;">TRY THIS</span><span>${s.tip}</span></div>` : ''}
          ${finish}
        </div>
        <div class="py-code-col">
          <div class="py-panel">
            <div class="py-panel-head"><span><span class="py-lights"><i></i><i></i><i></i></span>Your code &bull; ${esc(s.file)} <span class="py-edited" id="py-edited" hidden>edited</span></span>
              <span class="py-panel-actions">
                <button type="button" class="py-mini-btn" id="py-reset-code" title="Put back the original code for this slide">&#8634; Reset</button>
                <button type="button" class="py-mini-btn" id="py-copy">Copy</button>
                <button type="button" class="py-mini-btn run" id="py-run" title="Run the code (Ctrl+Enter)">&#9654; Run</button>
              </span></div>
            <div class="py-editor" id="py-editor"></div>
            <div class="py-stdin" id="py-stdin" hidden>
              <label for="py-stdin-text">Your code uses <code>input()</code>. Type the answers here, one per line:</label>
              <textarea id="py-stdin-text" rows="2" spellcheck="false" placeholder="Alice&#10;25"></textarea>
            </div>
            <div class="py-editor-hint">&#9998; Click the code to edit it: change values, names or add your own lines. Press <span class="py-kbd">Ctrl</span>+<span class="py-kbd">Enter</span> to run.</div>
          </div>
          <div class="py-panel">
            <div class="py-panel-head"><span>WHAT YOU SEE ON SCREEN</span>
              <span class="py-engine" id="py-engine" data-state="${engine.state}">${esc(engine.label)}</span></div>
            <pre class="py-term" id="py-term"></pre>
          </div>
        </div>
      </div>`;

    (s.controls || []).forEach((c, k) => {
      const el = $('pyc-' + k);
      el.addEventListener(c.type === 'select' ? 'change' : 'input', () => {
        if (c.type === 'select') vals[c.key] = +el.value;
        else if (c.type === 'range' || c.type === 'number') vals[c.key] = toInt(el.value);
        else vals[c.key] = el.value;
        if (c.type === 'range') $('pyc-' + k + '-val').textContent = vals[c.key];
        const nr = compute(i);
        editorSet(nr.code);
        $('py-visual').innerHTML = nr.visual;
        writeOut(nr, false);
      });
    });
    mountEditor(r.code);
    $('py-run').addEventListener('click', runCode);
    $('py-reset-code').addEventListener('click', () => { delete values[i]; renderSlide(0); });
    $('py-copy').addEventListener('click', e => {
      const btn = e.currentTarget;
      try { navigator.clipboard.writeText(editorGet()).then(() => { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 1400); }); } catch (err) { /* clipboard unavailable */ }
    });
    setTimeout(() => { if (idx === i && !edited && !engine.running) writeOut(r, true); }, 380);

    if (!seen[deck].includes(i)) { seen[deck].push(i); save(); }
    renderChrome();
    renderModuleDash();
  }

  function renderChrome() {
    const d = DECKS[deck], i = idx, n = d.slides.length;
    $('py-counter').innerHTML = `<strong>${String(i + 1).padStart(2, '0')}</strong> / ${String(n).padStart(2, '0')}`;
    $('py-progress').style.width = ((i + 1) / n * 100) + '%';
    $('py-first').disabled = $('py-prev').disabled = i === 0;
    $('py-last').disabled = $('py-next').disabled = i === n - 1;
    const seenSet = new Set(seen[deck]);
    $('py-dots').innerHTML = d.slides.map((s, k) => `<button type="button" class="py-dot${k === i ? ' on' : ''}${seenSet.has(k) ? ' seen' : ''}" data-k="${k}" title="${esc(s.title)}" aria-label="Slide ${k + 1}: ${esc(s.title)}"></button>`).join('');
    $('py-outline').innerHTML = `<div class="py-outline-title">All ${n} slides</div>` + d.slides.map((s, k) =>
      `<button type="button" class="py-outline-item${k === i ? ' on' : ''}${seenSet.has(k) ? ' seen' : ''}" data-k="${k}"${k === i ? ' aria-current="step"' : ''}><span class="num">${seenSet.has(k) && k !== i ? '&#10003;' : k + 1}</span><span class="lbl">${esc(s.title)}<small>${esc(s.file)}</small></span></button>`).join('');
    const active = $('py-outline').querySelector('.on');
    if (active) $('py-outline').scrollTop = active.offsetTop - $('py-outline').clientHeight / 2;
    if (ready) { try { history.replaceState(null, '', `#slide-${i + 1}`); } catch (e) { /* file:// or sandboxed */ } }
  }

  // ---------- Dashboards ----------
  function deckStats(k) {
    const d = DECKS[k], n = d.slides.length, c = seen[k].length;
    return { n, c, pct: Math.round(c / n * 100), files: new Set(d.slides.map(s => s.file).filter(f => f.endsWith('.py'))).size, mins: Math.round(n * 1.5) };
  }

  function renderModuleDash() {
    const d = DECKS[deck], st = deckStats(deck);
    const seenSet = new Set(seen[deck]);
    const firstUnseen = d.slides.findIndex((_, k) => !seenSet.has(k));
    $('py-stat-progress').textContent = st.pct + '%';
    $('py-stat-progress-bar').style.width = st.pct + '%';
    $('py-stat-opened').textContent = `${st.c} / ${st.n}`;
    $('py-continue').textContent = st.c === st.n ? 'Review from the start' : (st.c <= 1 ? 'Start learning' : `Continue at slide ${firstUnseen + 1}`);
    $('py-continue').dataset.k = st.c === st.n ? 0 : Math.max(0, firstUnseen);
    $('py-learn').innerHTML = d.slides.map((s, k) => `<button type="button" class="py-learn-item${seenSet.has(k) ? ' seen' : ''}" data-k="${k}" style="animation-delay:${Math.min(k * 0.03, 0.5)}s"><span class="num">${seenSet.has(k) ? '&#10003;' : k + 1}</span><span>${esc(s.title)}</span></button>`).join('');
  }

  function renderModulePage() {
    const d = DECKS[deck], st = deckStats(deck);
    document.querySelector('.py-wrap').style.setProperty('--deck-accent', d.accent);
    $('py-stat-slides').textContent = st.n;
    $('py-stat-time').textContent = '~' + st.mins + ' min';
    $('py-glossary').innerHTML = d.glossary.map(([t, m]) => `<div class="py-gloss"><b>${esc(t)}</b><p>${esc(m)}</p></div>`).join('');
    const k = ORDER.indexOf(deck), prevK = ORDER[k - 1], nextK = ORDER[k + 1];
    $('py-modnav').innerHTML =
      (prevK ? `<a href="${DECKS[prevK].page}" style="--mod-accent:${DECKS[prevK].accent}"><span>&larr; Previous module</span><strong>${esc(DECKS[prevK].name)}</strong></a>` : '<a href="index.html"><span>&larr; Back</span><strong>Python home</strong></a>') +
      (nextK ? `<a class="next" href="${DECKS[nextK].page}" style="--mod-accent:${DECKS[nextK].accent}"><span>Next module &rarr;</span><strong>${esc(DECKS[nextK].name)}</strong></a>` : '<a class="next" href="index.html"><span>All done &rarr;</span><strong>Python home</strong></a>');
  }

  function renderHome() {
    let seenTotal = 0, total = 0;
    $('py-dash-grid').innerHTML = ORDER.map((k, n) => {
      const d = DECKS[k], st = deckStats(k);
      seenTotal += st.c; total += st.n;
      const label = st.c === 0 ? 'Open dashboard' : (st.c === st.n ? 'Review' : 'Continue');
      return `<article class="py-mod-card" style="--mod-accent:${d.accent};">
        <div class="py-mod-head"><div class="py-mod-icon">${d.icon}</div><div><span class="py-mod-meta">Module ${n + 1}</span><h3 class="py-mod-title">${esc(d.name)}</h3></div></div>
        <p class="py-sub" style="font-size:0.88rem;">${esc(d.blurb)}</p>
        <div class="py-mod-topics">${d.slides.slice(1, 6).map(s => `<span class="py-chip">${esc(s.title)}</span>`).join('')}<span class="py-chip">+${st.n - 6} more</span></div>
        <span class="py-mod-meta">${st.n} slides &bull; about ${st.mins} minutes</span>
        <div class="py-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${st.pct}" aria-label="${esc(d.name)} progress"><span style="width:${st.pct}%"></span></div>
        <div class="py-mod-foot"><span>${st.c} / ${st.n} slides opened &bull; ${st.pct}%</span><a class="py-btn" href="${d.page}" style="border-color:${d.accent}66;">${label} &rarr;</a></div>
      </article>`;
    }).join('');
    $('py-overall').textContent = Math.round(seenTotal / total * 100) + '%';
    $('py-seen-total').textContent = `${seenTotal} / ${total}`;
  }

  // ---------- Navigation + autoplay ----------
  function go(i, dir) {
    const n = DECKS[deck].slides.length;
    if (i < 0) i = n - 1;
    i = Math.max(0, Math.min(n - 1, i));
    const d = dir != null ? dir : (i >= idx ? 1 : -1);
    idx = i;
    renderSlide(d);
    restartAuto();
  }
  const next = () => { if (idx < DECKS[deck].slides.length - 1) go(idx + 1, 1); };
  const prev = () => { if (idx > 0) go(idx - 1, -1); };
  function setPlaying(p) {
    playing = p;
    $('py-play').setAttribute('aria-label', p ? 'Pause autoplay' : 'Play autoplay');
    $('py-play-icon').innerHTML = p ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>' : '<polygon points="6 4 20 12 6 20 6 4"/>';
    restartAuto();
  }
  function restartAuto() {
    cancelAnimationFrame(autoRaf);
    $('py-autobar').style.width = '0';
    if (!playing) return;
    if (idx === DECKS[deck].slides.length - 1) { playing = false; setPlaying(false); return; }
    autoStart = performance.now();
    const tick = now => {
      const f = Math.min(1, (now - autoStart) / speed);
      $('py-autobar').style.width = (f * 100) + '%';
      if (f >= 1) next(); else autoRaf = requestAnimationFrame(tick);
    };
    autoRaf = requestAnimationFrame(tick);
  }

  function initModule() {
    renderModulePage();
    const m = location.hash.match(/^#slide-(\d+)$/);
    if (m) idx = Math.max(0, Math.min(DECKS[deck].slides.length - 1, parseInt(m[1], 10) - 1));
    renderSlide(1);
    if (m) setTimeout(() => $('player').scrollIntoView({ block: 'start' }), 50);
    ready = true;
    // Warm up Python in the background so the first Run is quick (the browser caches the download).
    if ('requestIdleCallback' in window) requestIdleCallback(startEngine, { timeout: 3000 }); else setTimeout(startEngine, 1500);

    const jump = e => { const b = e.target.closest('[data-k]'); if (b) go(+b.dataset.k); };
    $('py-dots').addEventListener('click', jump);
    $('py-outline').addEventListener('click', jump);
    $('py-learn').addEventListener('click', e => { if (e.target.closest('[data-k]')) { jump(e); $('player').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    $('py-continue').addEventListener('click', e => { go(+e.currentTarget.dataset.k); $('player').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('py-stage').addEventListener('focusin', e => { if (e.target.matches('input, select') && playing) setPlaying(false); });
    $('py-reset').addEventListener('click', () => { seen[deck] = []; save(); renderSlide(1); });

    document.addEventListener('keydown', e => {
      const t = e.target;
      if (e.ctrlKey || e.metaKey || e.altKey || t.matches('input, select, textarea') || t.isContentEditable) return;
      const r = $('player').getBoundingClientRect();
      const visible = r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.3;
      if (!visible && !document.fullscreenElement) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === ' ' && !t.matches('button, a')) { e.preventDefault(); setPlaying(!playing); }
      else if (e.key === 'r' || e.key === 'R') { runCode(); }
    });
  }

  function init() {
    const page = document.querySelector('[data-py-page]').dataset.pyPage;
    if (page === 'home') { renderHome(); return; }
    deck = page;
    initModule();
  }

  return {
    init, go, next, prev, DECKS,
    togglePlay: () => setPlaying(!playing),
    setSpeed: v => { speed = +v; restartAuto(); },
    resetAll: () => { ORDER.forEach(k => { seen[k] = []; }); save(); renderHome(); },
    fullscreen: () => {
      const el = $('py-player');
      try { if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen(); } catch (e) { /* not supported */ }
    }
  };
})();

document.addEventListener('DOMContentLoaded', PyCourse.init);
