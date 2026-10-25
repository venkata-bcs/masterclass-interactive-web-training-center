// Python Foundations: shared slide engine and course content.
// Slide examples follow github.com/tinitiateprime/python
// (python-core-language/python-print, python-datatypes, python-strings).
// Each page sets data-py-page on <main>: "home", "print", "datatypes" or "strings".
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
  const pyFloat = n => (Number.isInteger(n) ? n.toFixed(1) : String(n));
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
  const ORDER = ['print', 'datatypes', 'strings'];

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
