/* =============================================================================
   Snowflake track - shared page behaviour
   Code blocks (highlight + copy), tabs, and Q&A rendering from SF_QNA.
   ============================================================================= */
(function () {
  const SQL_KEYWORDS = [
    'ALTER', 'AND', 'AS', 'AT', 'AUTO_INGEST', 'BEFORE', 'BEGIN', 'BY', 'CALL', 'CASE', 'CLONE', 'CLUSTER',
    'COMMIT', 'COPY', 'CREATE', 'DATABASE', 'DELETE', 'DESC', 'DESCRIBE', 'DISTINCT', 'DROP', 'DYNAMIC',
    'ELSE', 'END', 'EXTERNAL', 'FAILOVER', 'FILE', 'FORMAT', 'FROM', 'FULL', 'GRANT', 'GROUP', 'IF', 'IN',
    'INSERT', 'INTEGRATION', 'INTO', 'IS', 'JOIN', 'LEFT', 'LIKE', 'LIMIT', 'MATERIALIZED', 'MERGE', 'NOT',
    'NULL', 'ON', 'OR', 'ORDER', 'OVER', 'PARTITION', 'PIPE', 'PRIMARY', 'REPLACE', 'REPLICATION',
    'RESOURCE', 'MONITOR', 'RESUME', 'ROLE', 'SCHEMA', 'SELECT', 'SET', 'SHOW', 'STAGE', 'STORAGE', 'STREAM',
    'SUSPEND', 'TABLE', 'TASK', 'TEMPORARY', 'THEN', 'TO', 'TRANSIENT', 'TRUNCATE', 'UNDROP', 'UNION',
    'UNSET', 'UPDATE', 'USE', 'USING', 'VALUES', 'VIEW', 'WAREHOUSE', 'WHEN', 'WHERE', 'WITH', 'MATCHED',
    'LATERAL', 'FLATTEN', 'QUALIFY', 'WINDOW', 'REFRESH', 'GROUPS', 'ACCOUNTS', 'ALLOWED', 'NOTIFICATION',
  ];
  const KW_RE = new RegExp('\\b(' + SQL_KEYWORDS.join('|') + ')\\b', 'g');

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // One pass over the text so a match inside a comment/string is never re-highlighted
  function highlightSql(text) {
    const token = /(--[^\n]*)|('(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_$]*)|([\s\S])/g;
    let out = '';
    let m;
    while ((m = token.exec(text))) {
      if (m[1]) out += '<span class="cm">' + escapeHtml(m[1]) + '</span>';
      else if (m[2]) out += '<span class="st">' + escapeHtml(m[2]) + '</span>';
      else if (m[3]) out += '<span class="nu">' + m[3] + '</span>';
      else if (m[4]) out += KW_RE.test(m[4]) ? '<span class="kw">' + m[4] + '</span>' : m[4];
      else out += escapeHtml(m[5]);
      KW_RE.lastIndex = 0;
    }
    return out;
  }

  function enhanceCode(root) {
    root.querySelectorAll('pre.sf-sql:not([data-ready])').forEach(pre => {
      const raw = pre.textContent.replace(/^\n/, '').replace(/\s+$/, '');
      pre.dataset.ready = '1';
      pre.innerHTML = highlightSql(raw);
      const label = pre.dataset.label || 'sql';
      const wrap = document.createElement('div');
      wrap.className = 'sf-code';
      wrap.innerHTML = '<div class="sf-code-head"><span>' + escapeHtml(label) + '</span>' +
        '<button type="button" class="sf-copy" aria-label="Copy code">Copy</button></div>';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      // Read text at click time: labs rewrite some code blocks live
      wrap.querySelector('.sf-copy').addEventListener('click', e => copyText(pre.textContent, e.currentTarget));
    });
  }

  function copyText(text, btn) {
    const done = () => {
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* clipboard unavailable */ }
    ta.remove();
  }

  function initTabs(root) {
    root.querySelectorAll('[data-tabs]').forEach(group => {
      const tabs = group.querySelectorAll('.sf-tab');
      tabs.forEach(tab => tab.addEventListener('click', () => {
        tabs.forEach(t => {
          const on = t === tab;
          t.setAttribute('aria-selected', String(on));
          const panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
      }));
    });
  }

  // ---------- Q&A rendering (data lives in snowflake-qna-data.js) ----------
  function renderQa(item, opts) {
    const o = opts || {};
    const tags = '<span class="sf-qa-tags">' +
      (o.showTopic ? '<span class="sf-tag">' + escapeHtml(item.topic) + '</span>' : '') +
      '<span class="sf-tag lvl-' + item.level + '">' + item.level + '</span></span>';
    return '<details class="sf-qa" id="q-' + item.id + '"' + (o.open ? ' open' : '') + '>' +
      '<summary><span class="sf-qa-q">' + item.q + '</span>' + tags + '</summary>' +
      '<div class="sf-qa-body">' + item.a + '</div></details>';
  }

  function renderTopicQa(root) {
    if (!window.SF_QNA) return;
    root.querySelectorAll('[data-qna-topic]').forEach(box => {
      const topics = box.dataset.qnaTopic.split(',').map(s => s.trim());
      const limit = parseInt(box.dataset.limit || '0', 10);
      let items = window.SF_QNA.filter(q => topics.includes(q.topic));
      if (limit) items = items.slice(0, limit);
      box.innerHTML = items.map(q => renderQa(q)).join('');
      enhanceCode(box);
    });
  }

  // Material sliders: fill the active part of the track (WebKit has no native progress)
  function paintRange(el) {
    const min = +el.min || 0, max = +el.max || 100;
    el.style.setProperty('--p', ((+el.value - min) / (max - min || 1) * 100) + '%');
  }
  function initRanges(root) {
    root.querySelectorAll('input[type="range"]').forEach(el => {
      paintRange(el);
      el.addEventListener('input', () => paintRange(el));
    });
    // Labs change slider max/value from code (e.g. Time Travel retention clamp)
    root.addEventListener('input', () => root.querySelectorAll('input[type="range"]').forEach(paintRange));
    root.addEventListener('click', () => requestAnimationFrame(() => root.querySelectorAll('input[type="range"]').forEach(paintRange)));
  }

  window.SF = { highlightSql, enhanceCode, renderQa, escapeHtml };

  document.addEventListener('DOMContentLoaded', () => {
    initRanges(document);
    renderTopicQa(document);
    enhanceCode(document);
    initTabs(document);
    if (window.lucide) window.lucide.createIcons();
  });
})();
