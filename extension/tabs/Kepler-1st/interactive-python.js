function initInteractivePython(...args) {
    const lab = args[0] instanceof Element ? args[0] : document.querySelector('[data-codelab]');
    console.log("initInteractivePython is running for:", lab);
    if (!lab) return;

  // ========================================================================== //
  //       interactive code lab: editable cells + student-named variables       //
  // ========================================================================== //

  /* ============================================================
     1. The variables a student is allowed to rename
     ============================================================ */
  const DEFAULTS = {
    G:'G', M:'M', AU:'AU',
    a:'a', e:'e',
    x:'x', y:'y', vx:'vx', vy:'vy',
    r:'r', ax:'ax', ay:'ay',
    T:'T', dt:'dt', N:'N',
    xs:'xs', ys:'ys', i:'i'
  };
  const LABELS = {
    G:'gravitational constant', M:'mass of the Sun', AU:'astronomical unit',
    a:'semi-major axis', e:'eccentricity',
    x:'position x', y:'position y', vx:'velocity vx', vy:'velocity vy',
    r:'distance from the Sun', ax:'acceleration ax', ay:'acceleration ay',
    T:'orbital period', dt:'time step', N:'number of steps',
    xs:'array of x values', ys:'array of y values', i:'loop counter'
  };
  const KEYS = Object.keys(DEFAULTS);

  /* Names we can't let a student take: Python's own words, plus every literal
     identifier that already appears in the plotting cell. */
  const RESERVED = new Set((
    'False None True and as assert async await break class continue def del elif ' +
    'else except finally for from global if import in is lambda nonlocal not or ' +
    'pass raise return try while with yield ' +
    'np numpy plt matplotlib IPython display HTML FuncAnimation ' +
    'fig ax_plot trail planet update anim h ' +
    'min max range zeros sqrt pi print len abs sum int float str list tuple dict set'
  ).split(' '));
  const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

  /* ============================================================
     2. Cell templates. @key@ is a placeholder for a student's name.
        `code`     — what the cell starts out holding (editable)
        `solution` — the filled-in version, behind a toggle
     ============================================================ */
  const CELLS = {
    packages: {
      title: 'Cell 1 &middot; Packages', tag: 'given',
      code:
        'import numpy as np\n' +
        'import matplotlib.pyplot as plt\n' +
        'from matplotlib.animation import FuncAnimation\n' +
        'from IPython.display import HTML'
    },

    example: {
      title: 'For example', quote: true,
      code: "h = 6.626 * 10**-34       # Planck's constant [m^2 kg / s]"
    },

    constants: {
      title: 'Cell 2 &middot; Constants', tag: 'yours',
      code:
        '@G@ =    # gravitational constant [m^3 kg^-1 s^-2]\n' +
        '@M@ =    # mass of the Sun [kg]\n' +
        '@AU@ =    # 1 AU in meters',
      solution:
        '@G@ = 6.674e-11    # gravitational constant [m^3 kg^-1 s^-2]\n' +
        '@M@ = 1.989e30    # mass of the Sun [kg]\n' +
        '@AU@ = 1.496e11    # 1 AU in meters'
    },

    params: {
      title: 'Cell 3 &middot; Orbital Parameters', tag: 'yours',
      code:
        '@a@ =    # semi-major axis [m]\n' +
        '@e@ =    # eccentricity',
      solution:
        '@a@ = 0.387 * @AU@    # semi-major axis [m]\n' +
        '@e@ = 0.206    # eccentricity'
    },

    initial: {
      title: 'Cell 4 &middot; Initial Conditions (perihelion)', tag: 'yours',
      code:
        '@x@ =\n' +
        '@y@ =\n' +
        '@vx@ =\n' +
        '@vy@ =',
      solution:
        '@x@ = @a@ * (1 - @e@)\n' +
        '@y@ = 0.0\n' +
        '@vx@ = 0.0\n' +
        '@vy@ = np.sqrt(@G@ * @M@ * (1 + @e@) / (@a@ * (1 - @e@)))'
    },

    /* the .tex introduces the period, the time step and N one at a time */
    periodonly: {
      title: 'Cell 5a &middot; the period', quote: true,
      code: '@T@ ='
    },

    dtonly: {
      title: 'Cell 5b &middot; the time step', quote: true,
      code: '@dt@ = @T@ / 1000'
    },

    time: {
      title: 'Cell 5c &middot; Time Setup, all together', tag: 'yours',
      code:
        '@T@ =\n' +
        '@dt@ = @T@ / 1000\n' +
        '@N@ =',
      solution:
        '@T@ = 2 * np.pi * np.sqrt(@a@**3 / (@G@ * @M@))\n' +
        '@dt@ = @T@ / 1000\n' +
        '@N@ = 1000'
    },

    storage: {
      title: 'Cell 6a &middot; Storage', tag: 'given',
      code:
        '@xs@ = np.zeros(@N@)\n' +
        '@ys@ = np.zeros(@N@)'
    },

    loopseed: {
      title: 'Cell 6b &middot; Simulation Loop, to start with', quote: true,
      code:
        'for @i@ in range(@N@):\n' +
        '    @xs@[@i@] = @x@\n' +
        '    @ys@[@i@] = @y@'
    },

    loop: {
      title: 'Cell 6c &middot; Simulation Loop', tag: 'yours',
      code:
        'for @i@ in range(@N@):\n' +
        '    @xs@[@i@] = @x@\n' +
        '    @ys@[@i@] = @y@\n' +
        '\n' +
        '    @r@ =\n' +
        '    @ax@ =\n' +
        '    @ay@ =\n' +
        '\n' +
        '    @vx@ =\n' +
        '    @vy@ =\n' +
        '\n' +
        '    @x@ =\n' +
        '    @y@ =',
      solution:
        'for @i@ in range(@N@):\n' +
        '    @xs@[@i@] = @x@\n' +
        '    @ys@[@i@] = @y@\n' +
        '\n' +
        '    @r@ = np.sqrt(@x@**2 + @y@**2)\n' +
        '    @ax@ = -@G@ * @M@ * @x@ / @r@**3\n' +
        '    @ay@ = -@G@ * @M@ * @y@ / @r@**3\n' +
        '\n' +
        '    @vx@ = @vx@ + @ax@ * @dt@\n' +
        '    @vy@ = @vy@ + @ay@ * @dt@\n' +
        '\n' +
        '    @x@ = @x@ + @vx@ * @dt@\n' +
        '    @y@ = @y@ + @vy@ * @dt@'
    },

    plotting: {
      title: 'Cell 7 &middot; Plotting', tag: 'given',
      code:
        '@xs@_AU = @xs@ / @AU@\n' +
        '@ys@_AU = @ys@ / @AU@\n' +
        '\n' +
        'fig, ax_plot = plt.subplots(figsize=(7, 7))\n' +
        'ax_plot.set_xlim(min(@xs@_AU) * 1.1, max(@xs@_AU) * 1.1)\n' +
        'ax_plot.set_ylim(min(@ys@_AU) * 1.1, max(@ys@_AU) * 1.1)\n' +
        "ax_plot.set_aspect('equal')\n" +
        "ax_plot.set_xlabel('x [AU]')\n" +
        "ax_plot.set_ylabel('y [AU]')\n" +
        'ax_plot.set_title("Mercury\'s orbit from Newton\'s law of gravitation")\n' +
        '\n' +
        "ax_plot.plot(0, 0, 'o', color='orange', markersize=12)\n" +
        "trail,  = ax_plot.plot([], [], 'steelblue', linewidth=1, alpha=0.4)\n" +
        "planet, = ax_plot.plot([], [], 'o', color='red', markersize=8)\n" +
        '\n' +
        'def update(@i@):\n' +
        '    trail.set_data(@xs@_AU[:@i@], @ys@_AU[:@i@])\n' +
        '    planet.set_data([@xs@_AU[@i@]], [@ys@_AU[@i@]])\n' +
        '    return trail, planet\n' +
        '\n' +
        'anim = FuncAnimation(fig, update, frames=@N@, interval=10, blit=True)\n' +
        'HTML(anim.to_jshtml())'
    },

    /* Same plot, minus the animation — the in-page kernel has no IPython. */
    sandboxplot: {
      title: 'Still picture, for the in-page kernel', tag: 'given',
      code:
        '@xs@_AU = @xs@ / @AU@\n' +
        '@ys@_AU = @ys@ / @AU@\n' +
        '\n' +
        'fig, ax_plot = plt.subplots(figsize=(7, 7))\n' +
        "ax_plot.set_aspect('equal')\n" +
        "ax_plot.set_xlabel('x [AU]')\n" +
        "ax_plot.set_ylabel('y [AU]')\n" +
        'ax_plot.set_title("Mercury\'s orbit from Newton\'s law of gravitation")\n' +
        '\n' +
        "ax_plot.plot(0, 0, 'o', color='orange', markersize=12)\n" +
        "ax_plot.plot(@xs@_AU, @ys@_AU, 'steelblue', linewidth=1)\n" +
        'plt.show()'
    }
  };

  /* The whole notebook, stitched together from the cells above. */
  const banner = (t) =>
    '# ============================================================\n' +
    '# ' + t + '\n' +
    '# ============================================================';

  CELLS.whole = { title: 'Your notebook, assembled live', assembled: true };

  /* ============================================================
     3. Rendering: substitute -> re-align -> syntax highlight
     ============================================================ */
  const substitute = (src, names) => src.replace(/@([A-Za-z_]\w*)@/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(names, k) ? names[k] : m);

  /* Index of a `#` that actually starts a comment (i.e. not inside a string). */
  function commentIndex(line) {
    let quote = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === '#') return i;
    }
    return -1;
  }

  /* Renaming changes how wide the names are, so the `=` signs and the trailing
     comments have to be re-aligned per run of consecutive assignments. */
  const ASSIGN = /^(\s*)([A-Za-z_][\w[\]]*)\s*=\s*(?!=)(.*)$/;
  function align(src) {
    const lines = src.split('\n');
    const out = lines.slice();
    let i = 0;
    while (i < lines.length) {
      const run = [];
      let indent = null, j = i;
      while (j < lines.length) {
        const m = lines[j].match(ASSIGN);
        if (!m) break;
        if (indent === null) indent = m[1];
        else if (m[1] !== indent) break;
        run.push({ j: j, indent: m[1], name: m[2], rest: m[3] });
        j++;
      }
      if (run.length > 1) {
        const w = Math.max.apply(null, run.map(r => r.name.length));
        run.forEach(r => { out[r.j] = (r.indent + r.name.padEnd(w) + ' = ' + r.rest).replace(/\s+$/, ''); });

        // now line up any trailing comments across the same run
        const parts = run.map(r => {
          const k = commentIndex(out[r.j]);
          return k < 0 ? { code: out[r.j], com: '' }
                       : { code: out[r.j].slice(0, k).replace(/\s+$/, ''), com: out[r.j].slice(k) };
        });
        if (parts.some(p => p.com)) {
          const cw = Math.max.apply(null, parts.map(p => p.code.length));
          parts.forEach((p, k) => { out[run[k].j] = p.com ? p.code.padEnd(cw) + '  ' + p.com : p.code; });
        }
      }
      i = (j > i) ? j : i + 1;
    }
    return out.join('\n');
  }

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const KW  = /^(False|None|True|and|as|def|elif|else|for|from|import|in|is|lambda|not|or|pass|return|while|with)$/;
  const MOD = /^(np|plt|numpy|matplotlib|IPython|HTML|FuncAnimation)$/;
  const TOKEN = /(#[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|(\d+\.?\d*(?:[eE][+-]?\d+)?)|([A-Za-z_]\w*)/g;

  function highlight(src, nameToKey) {
    let out = '', last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      if (m[1])      out += '<span class="tok-com">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tok-str">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tok-num">' + esc(m[3]) + '</span>';
      else {
        const w = m[4];
        if (nameToKey.has(w)) {
          out += '<span class="tok-var" data-varkey="' + nameToKey.get(w) + '">' + esc(w) + '</span>';
        } else if (KW.test(w))  out += '<span class="tok-kw">'  + esc(w) + '</span>';
        else if (MOD.test(w))   out += '<span class="tok-mod">' + esc(w) + '</span>';
        else if (/^\s*\(/.test(src.slice(TOKEN.lastIndex))) out += '<span class="tok-fn">' + esc(w) + '</span>';
        else out += esc(w);
      }
      last = TOKEN.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  /* ============================================================
     4. Build the cells

     Three kinds of cell:
       quote     — a read-only snippet quoted from the write-up
       assembled — the student's whole notebook, rebuilt from the cells below
       (default) — a real editable cell the student types into
     ============================================================ */
  let state = Object.assign({}, DEFAULTS);
  let nameToKey = new Map();
  const rebuildMap = () => { nameToKey = new Map(); KEYS.forEach(k => nameToKey.set(state[k], k)); };
  rebuildMap();

  /* Which cells make up the notebook, in order, and the banner each gets. */
  const NOTEBOOK = [
    { cell: 'packages',  banner: null },
    { cell: 'constants', banner: 'CONSTANTS (SI units)' },
    { cell: 'params',    banner: 'ORBITAL PARAMETERS' },
    { cell: 'initial',   banner: 'INITIAL CONDITIONS (perihelion)' },
    { cell: 'time',      banner: 'TIME SETUP' },
    { cell: 'storage',   banner: 'STORAGE' },
    { cell: 'loop',      banner: 'SIMULATION LOOP' },
    { cell: 'plotting',  banner: 'PLOTTING (convert to AU for display)' }
  ];

  const hosts = Array.from(lab.querySelectorAll('[data-cell]')).filter(h => CELLS[h.dataset.cell]);
  const byCell = {};
  hosts.forEach(h => { byCell[h.dataset.cell] = h; });
  const statusEl = lab.querySelector('[data-whole-status]');

  function mkBtn(text, cls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nb-btn' + (cls ? ' ' + cls : '');
    b.textContent = text;
    return b;
  }

  function copyText(btn, text) {
    const done = () => { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => { btn.textContent = 'Press Ctrl+C'; });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (_) { btn.textContent = 'Press Ctrl+C'; }
      ta.remove();
    }
  }

  hosts.forEach(host => {
    const spec = CELLS[host.dataset.cell];
    const editable = !spec.quote && !spec.assembled;

    /* ---- header ---- */
    const head = document.createElement('div');
    head.className = 'code-cell-head';
    const title = document.createElement('span');
    title.className = 'code-cell-title';
    title.innerHTML = spec.title;
    head.appendChild(title);

    if (spec.tag) {
      const tag = document.createElement('span');
      tag.className = 'code-cell-tag ' + spec.tag;
      tag.textContent = spec.tag === 'given' ? 'given to you' : 'your turn';
      head.appendChild(tag);
    }

    const editedTag = document.createElement('span');
    editedTag.className = 'code-cell-tag edited';
    editedTag.textContent = 'edited';
    editedTag.hidden = true;
    if (editable) head.appendChild(editedTag);
    host._editedTag = editedTag;

    const actions = document.createElement('div');
    actions.className = 'cell-actions';
    head.appendChild(actions);
    host.appendChild(head);

    /* ---- body ---- */
    const pre = document.createElement('pre');
    pre.className = 'code-pre';
    host._pre = pre;
    host._dirty = false;
    host._generated = '';

    if (editable) {
      // transparent textarea sitting exactly on top of the highlighted pre
      const wrap = document.createElement('div');
      wrap.className = 'code-edit';
      pre.setAttribute('aria-hidden', 'true');
      const ta = document.createElement('textarea');
      ta.className = 'code-ta';
      ta.spellcheck = false;
      ta.setAttribute('aria-label', title.textContent + ' — editable Python');
      wrap.appendChild(pre);
      wrap.appendChild(ta);
      host.appendChild(wrap);
      host._ta = ta;
    } else {
      host.appendChild(pre);
    }

    /* ---- revealed solution (read-only) ---- */
    if (spec.solution) {
      const sol = document.createElement('pre');
      sol.className = 'code-pre code-solution';
      sol.dataset.src = spec.solution;
      sol.hidden = true;
      host.appendChild(sol);
      host._sol = sol;
    }

    /* ---- output area, fed by the shared Pyodide kernel ---- */
    if (editable) {
      const outWrap = document.createElement('div');
      outWrap.className = 'cell-outwrap';
      outWrap.hidden = true;
      const outLabel = document.createElement('span');
      outLabel.className = 'cell-outlabel';
      outLabel.textContent = 'Output';
      const out = document.createElement('pre');
      out.className = 'cell-out';
      outWrap.appendChild(outLabel);
      outWrap.appendChild(out);
      host.appendChild(outWrap);
      host._out = out;
      host._outWrap = outWrap;
    }

    /* ---- buttons ---- */
    if (editable) {
      const runBtn = mkBtn('▶ Run', 'primary');
      runBtn.addEventListener('click', () => runCell(host));
      actions.appendChild(runBtn);
      host._runBtn = runBtn;

      const revertBtn = mkBtn('↺ Revert');
      revertBtn.hidden = true;
      revertBtn.addEventListener('click', () => {
        host._ta.value = host._generated;
        host._dirty = false;
        editedTag.hidden = true;
        revertBtn.hidden = true;
        paint(host);
        rebuildWhole();
      });
      actions.appendChild(revertBtn);
      host._revertBtn = revertBtn;
    }

    if (spec.solution) {
      const toggle = mkBtn('Show the filled-in cell');
      toggle.addEventListener('click', () => {
        host._sol.hidden = !host._sol.hidden;
        toggle.textContent = host._sol.hidden ? 'Show the filled-in cell' : 'Hide the filled-in cell';
      });
      actions.appendChild(toggle);
    }

    const copyBtn = mkBtn('Copy');
    copyBtn.addEventListener('click', () => copyText(copyBtn, host._ta ? host._ta.value : (host._plain || '')));
    actions.appendChild(copyBtn);

    /* ---- typing ---- */
    if (editable) {
      const ta = host._ta;
      ta.addEventListener('input', () => {
        host._dirty = (ta.value !== host._generated);
        editedTag.hidden = !host._dirty;
        host._revertBtn.hidden = !host._dirty;
        paint(host);
        rebuildWhole();
      });
      ta.addEventListener('keydown', (ev) => {
        if (ev.key === 'Tab') {
          ev.preventDefault();
          const s = ta.selectionStart, en = ta.selectionEnd;
          ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(en);
          ta.selectionStart = ta.selectionEnd = s + 4;
          ta.dispatchEvent(new Event('input'));
        } else if (ev.key === 'Enter' && (ev.shiftKey || ev.ctrlKey || ev.metaKey)) {
          ev.preventDefault();
          runCell(host);
        }
      });
    }
  });

  /* Repaint one cell: highlight behind the textarea, and match heights. */
  function paint(host) {
    const spec = CELLS[host.dataset.cell];
    if (host._ta) {
      host._pre.innerHTML = highlight(host._ta.value, nameToKey) + '\n';
      
      // Force the textarea to auto-resize to fit its content
      host._ta.style.height = 'auto';
      host._ta.style.height = Math.max(40, host._ta.scrollHeight) + 'px';
    } else if (spec.quote) {
      const t = align(substitute(spec.code, state));
      host._plain = t;
      host._pre.innerHTML = highlight(t, nameToKey);
    }
    if (host._sol) {
      const s = align(substitute(host._sol.dataset.src, state));
      host._sol._plain = s;
      host._sol.innerHTML = highlight(s, nameToKey);
    }
  }

  /* ============================================================
     4b. The assembled notebook — always the student's newest text
     ============================================================ */
  function assembledText() {
    const parts = [];
    NOTEBOOK.forEach(entry => {
      const h = byCell[entry.cell];
      if (!h) return;
      const body = (h._ta ? h._ta.value : (h._plain || '')).replace(/\s+$/, '');
      if (entry.banner) parts.push(banner(entry.banner));
      parts.push(body, '');
    });
    return parts.join('\n').replace(/\n+$/, '');
  }

  function rebuildWhole() {
    const host = byCell.whole;
    if (!host) return;
    const text = assembledText();
    host._plain = text;
    host._pre.innerHTML = highlight(text, nameToKey);

    if (statusEl) {
      const mine = NOTEBOOK.filter(e => byCell[e.cell] && byCell[e.cell]._dirty).length;
      statusEl.innerHTML = mine === 0
        ? 'Nothing customised yet &mdash; this is still the starting text for all ' + NOTEBOOK.length + ' cells.'
        : '<span class="filled">' + mine + '</span> of ' + NOTEBOOK.length +
          ' cells are your own edits; the rest are still as they started.';
    }
  }

  /* Run a cell against the kernel at the bottom of the page. */
  async function runCell(host) {
    if (!host._out) return;
    host._outWrap.hidden = false;
    if (!window.__keplerRun) {
      host._out.innerHTML = '<span class="py-err">The Python kernel hasn’t loaded yet.</span>';
      return;
    }
    host._runBtn.disabled = true;
    const label = host._runBtn.textContent;
    host._runBtn.textContent = '… Running';
    try {
      await window.__keplerRun(host._ta.value, host._out);
    } finally {
      host._runBtn.disabled = false;
      host._runBtn.textContent = label;
      // a run always refreshes the assembled notebook, and flags that it moved
      rebuildWhole();
      const whole = byCell.whole;
      if (whole && NOTEBOOK.some(e => e.cell === host.dataset.cell)) {
        whole.classList.remove('just-updated');
        void whole.offsetWidth;
        whole.classList.add('just-updated');
      }
    }
  }

  /* ============================================================
     5. The rename controls
     ============================================================ */
  const inputs = {};
  lab.querySelectorAll('[data-var-key]').forEach(el => { inputs[el.dataset.varKey] = el; });
  const warnEl = lab.querySelector('[data-vars-warn]');
  const inlineNames = Array.from(lab.querySelectorAll('[data-vartext]'));

  function render(changedKeys) {
    rebuildMap();

    hosts.forEach(host => {
      const spec = CELLS[host.dataset.cell];
      if (host._ta) {
        const gen = align(substitute(spec.code, state));
        // a cell the student has typed in belongs to them now — leave it alone
        if (!host._dirty) host._ta.value = gen;
        host._generated = gen;
        if (host._dirty && host._ta.value === gen) {
          host._dirty = false;
          host._editedTag.hidden = true;
          host._revertBtn.hidden = true;
        }
      }
      paint(host);
    });
    rebuildWhole();

    // inline `\texttt{...}` mentions in the prose track the names too
    inlineNames.forEach(el => { el.textContent = substitute(el.dataset.vartext, state); });

    (changedKeys || []).forEach(k => {
      lab.querySelectorAll('.tok-var[data-varkey="' + k + '"]').forEach(s => {
        s.classList.remove('flash');
        void s.offsetWidth;
        s.classList.add('flash');
      });
    });
  }

  function readInputs() {
    const errs = [];
    const next = Object.assign({}, state);
    const bad = {};

    KEYS.forEach(k => {
      const el = inputs[k];
      if (!el) return;
      const raw = el.value.trim();
      let why = null;
      if (!raw) why = 'needs a name';
      else if (!IDENT.test(raw)) why = '“' + raw + '” isn’t a valid Python name — letters, digits and underscores only, and it can’t start with a digit';
      else if (RESERVED.has(raw)) why = '“' + raw + '” is already taken by Python or by the plotting code';
      if (why) { bad[k] = true; errs.push(LABELS[k] + ': ' + why); }
      else next[k] = raw;
      el.classList.toggle('invalid', !!why);
    });

    // no two variables may share a name, or the generated code stops making sense
    const taken = new Map();
    KEYS.forEach(k => {
      if (bad[k]) return;
      const n = next[k];
      if (taken.has(n)) {
        inputs[k].classList.add('invalid');
        errs.push(LABELS[k] + ': “' + n + '” is already used for the ' + LABELS[taken.get(n)]);
        next[k] = state[k];           // fall back to the last good name
      } else {
        taken.set(n, k);
      }
    });

    const changed = KEYS.filter(k => next[k] !== state[k]);
    state = next;
    warnEl.textContent = errs.join('  ·  ');
    return changed;
  }

  KEYS.forEach(k => {
    const el = inputs[k];
    if (!el) return;
    el.value = DEFAULTS[k];
    el.addEventListener('input', () => { render(readInputs()); });
    el.addEventListener('blur', () => {
      // an abandoned invalid entry snaps back to whatever the code is using
      if (el.classList.contains('invalid')) { el.value = state[k]; render(readInputs()); }
    });
  });

  const resetBtn = lab.querySelector('[data-vars-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        KEYS.forEach(k => { if (inputs[k]) { inputs[k].value = DEFAULTS[k]; inputs[k].classList.remove('invalid'); } });
        const changed = KEYS.filter(k => state[k] !== DEFAULTS[k]);
        state = Object.assign({}, DEFAULTS);
        warnEl.textContent = '';
        render(changed);
    });
  }

  render([]);
  // textarea heights need a second pass once the web font has actually landed
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => hosts.forEach(paint));
  window.addEventListener('resize', () => hosts.forEach(paint));
}


// ============================================================= //                                                
//            Jupyter-style Python notebook (Pyodide)            //
// ============================================================= //
function initJupyterNotebook(nb) {
    const cellsEl = nb.querySelector('.nb-cells');
    const dot     = nb.querySelector('.nb-dot');
    const kLabel  = nb.querySelector('.nb-kernel-label');
    let execCount = 0;
    let pyodide   = null;
    let pyReady   = null;   // promise

    // ----- kernel -----
    function setKernel(state){
        dot.classList.remove('ready','busy');
        if (state === 'ready'){ dot.classList.add('ready'); kLabel.textContent = 'Kernel ready'; }
        else if (state === 'busy'){ dot.classList.add('busy'); kLabel.textContent = 'Running…'; }
        else if (state === 'loading'){ dot.classList.add('busy'); kLabel.textContent = 'Starting kernel…'; }
        else { kLabel.textContent = 'Kernel idle'; }
    }

    function bootKernel(){
        if (pyReady) return pyReady;
        setKernel('loading');
        pyReady = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
        s.onload = async () => {
            try {
            const py = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' });
            await py.loadPackage(['numpy', 'matplotlib']);
            // Non-interactive backend so figures render to PNG we can grab.
            await py.runPythonAsync("import matplotlib; matplotlib.use('AGG')\nimport matplotlib.pyplot as plt");
            // Pyodide has no IPython, so `from IPython.display import HTML` in the
            // Packages cell would blow up on line 4. Stub it just enough to import.
            await py.runPythonAsync(IPYTHON_SHIM);
            pyodide = py;
            setKernel('ready');
            resolve(py);
            } catch (err) { setKernel('idle'); reject(err); }
        };
        s.onerror = () => { setKernel('idle'); reject(new Error('Could not load Pyodide (check your internet connection).')); };
        document.head.appendChild(s);
        });
        return pyReady;
    }

    // Minimal stand-in for IPython.display so the Packages cell imports cleanly.
    // HTML() just hands its argument back; nothing here renders a notebook widget.
    const IPYTHON_SHIM = `
    import sys, types
    if 'IPython' not in sys.modules:
    _ip = types.ModuleType('IPython')
    _disp = types.ModuleType('IPython.display')
    def HTML(obj=None, *a, **k): return obj
    def display(*a, **k): pass
    _disp.HTML = HTML
    _disp.display = display
    _ip.display = _disp
    sys.modules['IPython'] = _ip
    sys.modules['IPython.display'] = _disp
    `;

    // Grab any open matplotlib figures as base64 PNGs, then close them.
    const GRAB_FIGS = `
    import io, base64
    import matplotlib.pyplot as _plt
    _out = []
    for _n in _plt.get_fignums():
    _f = _plt.figure(_n)
    _b = io.BytesIO()
    _f.savefig(_b, format='png', dpi=110, bbox_inches='tight')
    _out.append(base64.b64encode(_b.getvalue()).decode())
    _plt.close('all')
    _out
    `;

    // ----- cell model -----
    function makeCell(code){
        const cell = document.createElement('div');
        cell.className = 'nb-cell';
        cell.innerHTML =
        '<div class="nb-prompt">In [ ]:</div>' +
        '<div class="nb-input">' +
            '<div class="nb-cell-tools"><button class="nb-x" title="Delete cell" type="button">&times;</button></div>' +
            '<textarea class="nb-code" spellcheck="false" placeholder="Type Python here — Shift+Enter to run"></textarea>' +
        '</div>' +
        '<div class="nb-outrow"></div>';

        const code_ta = cell.querySelector('.nb-code');
        if (code) code_ta.value = code;

        autoGrow(code_ta);
        code_ta.addEventListener('input', () => autoGrow(code_ta));

        code_ta.addEventListener('keydown', (e) => {
        if (e.key === 'Tab'){
            e.preventDefault();
            const s = code_ta.selectionStart, en = code_ta.selectionEnd;
            code_ta.value = code_ta.value.slice(0,s) + '    ' + code_ta.value.slice(en);
            code_ta.selectionStart = code_ta.selectionEnd = s + 4;
            autoGrow(code_ta);
        } else if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)){
            e.preventDefault();
            runCell(cell).then(() => {
            if (e.shiftKey && !e.ctrlKey && !e.metaKey){
                // Shift+Enter: move to next cell, creating one if needed
                const next = cell.nextElementSibling;
                if (next && next.classList.contains('nb-cell')) next.querySelector('.nb-code').focus();
                else addCell().querySelector('.nb-code').focus();
            }
            });
        }
        });

        cell.querySelector('.nb-x').addEventListener('click', () => {
        if (cellsEl.querySelectorAll('.nb-cell').length > 1) cell.remove();
        else { code_ta.value=''; autoGrow(code_ta); clearCellOutput(cell); cell.querySelector('.nb-prompt').textContent='In [ ]:'; }
        });

        return cell;
    }

    function addCell(code){
        const cell = makeCell(code);
        cellsEl.appendChild(cell);
        return cell;
    }

    function autoGrow(ta){
        ta.style.height = 'auto';
        ta.style.height = Math.max(24, ta.scrollHeight) + 'px';
    }

    function clearCellOutput(cell){
        cell.querySelector('.nb-outrow').innerHTML = '';
    }

    // ----- running -----
    async function runCell(cell){
        const code = cell.querySelector('.nb-code').value;
        const promptEl = cell.querySelector('.nb-prompt');
        const outrow = cell.querySelector('.nb-outrow');
        if (!code.trim()){ clearCellOutput(cell); promptEl.textContent = 'In [ ]:'; return; }

        promptEl.textContent = 'In [*]:';
        outrow.innerHTML = '';
        const out = document.createElement('pre');
        out.className = 'nb-out';

        let py;
        try {
        py = await bootKernel();
        } catch (err){
        renderOutrow(outrow, out);
        appendText(out, (err.message || String(err)), 'py-err');
        promptEl.textContent = 'In [ ]:';
        return;
        }

        setKernel('busy');
        renderOutrow(outrow, out);
        try {
        py.setStdout({ batched: (t) => appendText(out, t) });
        py.setStderr({ batched: (t) => appendText(out, t, 'py-err') });
        const result = await py.runPythonAsync(code);

        // Collect any figures produced
        let figs = [];
        try { const proxy = await py.runPythonAsync(GRAB_FIGS); figs = proxy.toJs(); proxy.destroy(); } catch(_) {}
        figs.forEach(b64 => {
            const img = new Image();
            img.src = 'data:image/png;base64,' + b64;
            out.appendChild(img);
        });

        if (result !== undefined && result !== null && figs.length === 0){
            appendText(out, String(result));
        }
        execCount += 1;
        promptEl.textContent = 'In [' + execCount + ']:';
        } catch (err){
        appendText(out, (err.message || String(err)), 'py-err');
        execCount += 1;
        promptEl.textContent = 'In [' + execCount + ']:';
        } finally {
        setKernel('ready');
        }
        if (!out.textContent.trim() && !out.querySelector('img')) outrow.innerHTML = '';
    }

    function renderOutrow(outrow, out){
        outrow.innerHTML = '<div class="nb-outprompt">Out:</div>';
        outrow.appendChild(out);
    }
    function appendText(el, text, cls){
        if (cls){ const s = document.createElement('span'); s.className = cls; s.textContent = text; el.appendChild(s); }
        else el.appendChild(document.createTextNode(text));
    }

    // ----- toolbar (must be inside initJupyterNotebook(nb)) -----
    nb.querySelector('[data-act="run-all"]').addEventListener('click', async () => {
        for (const cell of cellsEl.querySelectorAll('.nb-cell')) await runCell(cell);
    });
    nb.querySelector('[data-act="add"]').addEventListener('click', () => {
        addCell().querySelector('.nb-code').focus();
    });
    nb.querySelector('[data-act="clear"]').addEventListener('click', () => {
        cellsEl.querySelectorAll('.nb-cell').forEach(c => { clearCellOutput(c); c.querySelector('.nb-prompt').textContent = 'In [ ]:'; });
    });
    nb.querySelector('[data-act="restart"]').addEventListener('click', async () => {
        if (pyodide){ try { await pyodide.runPythonAsync("import matplotlib.pyplot as _p; _p.close('all')"); } catch(_){}
        try { pyodide.globals.clear(); await pyodide.runPythonAsync("import matplotlib.pyplot as plt"); } catch(_){}
        }
        execCount = 0;
        cellsEl.querySelectorAll('.nb-cell').forEach(c => { clearCellOutput(c); c.querySelector('.nb-prompt').textContent = 'In [ ]:'; });
        if (pyodide) setKernel('ready');
    });

    // start with one empty cell
    addCell();

    nb.querySelectorAll('.nb-code').forEach(textarea => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });
} // <-- This single closing bracket cleanly closes function initJupyterNotebook(nb)


// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-codelab]').forEach(initInteractivePython);
    resizeAllCodeCells();
});

document.addEventListener('input', function (e) {
  if (e.target && e.target.classList.contains('nb-code')) {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  }
});

function resizeAllCodeCells() {
  document.querySelectorAll('.nb-code').forEach(textarea => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  });
}

window.initInteractivePython = initInteractivePython;

window.addEventListener("load", () => {
    document.querySelectorAll('[data-codelab]').forEach(initInteractivePython);
    resizeAllCodeCells();
});