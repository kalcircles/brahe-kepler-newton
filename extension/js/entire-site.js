/* ===== KaTeX render ===== */
document.addEventListener("DOMContentLoaded", function () {
  renderMathInElement(document.body, {
    delimiters: [
      {left: '$$', right: '$$', display: true},
      {left: '\\[', right: '\\]', display: true},
      {left: '$', right: '$', display: false},
      {left: '\\(', right: '\\)', display: false}
    ],
    throwOnError: false
  });
});

// ---------- in-page cross-references (the \ref{} links from the write-up) ---------- //
(function () {
  document.querySelectorAll('[data-jump]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(link.dataset.jump);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // restart the highlight animation even if it was just played
      target.classList.remove('xref-hit');
      void target.offsetWidth;
      target.classList.add('xref-hit');
    });
  });
})();

/* ===== TAB NAV (+ in-text jump links) ===== */
(function () {
  const tabs = document.querySelectorAll('.tab');
  
  function activate(target, anchor) {
    const tabEl = document.querySelector(`.tab[data-tab="${target}"]`);
    if (!tabEl) return;

    // 1. Update active states on tab buttons
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === target && !t.hasAttribute('disabled')));
    
    // 2. Update active states on content containers
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === target);
    });

    const targetContainer = document.getElementById(target);
    if (!targetContainer) return;

    // Helper to safely trigger updates once the container is ready
    const handleTabReady = () => {
      if (window.numberEquations) window.numberEquations();
      
      // If your contents collection function is exposed globally, run it now.
      // Otherwise, we trigger a global rebuild routine:
      if (window.collectAndRebuildTOC) {
        window.collectAndRebuildTOC();
      } else if (window.rebuildTOC) {
        window.rebuildTOC();
      }

      if (target === 'toolkit' && window.initInteractivePython) {
        window.initInteractivePython();
      }

      if (target === 'second' && typeof initKepler2Simulator === 'function') {
        initKepler2Simulator();
      }

      targetContainer.querySelectorAll('.code-cell').forEach(host => {
        if (host._ta) {
            host._ta.style.height = 'auto';
            host._ta.style.height = Math.max(40, host._ta.scrollHeight) + 'px';
        }
      });
    };

    // 3. Fetch HTML dynamically if it has a data-path and isn't loaded yet
    const htmlPath = tabEl.getAttribute('data-path');
    if (htmlPath && !targetContainer.hasAttribute('data-loaded')) {
      fetch(htmlPath)
        .then(response => response.text())
        .then(html => {
          targetContainer.innerHTML = html;
          targetContainer.setAttribute('data-loaded', 'true');

          // Fix relative image paths
          const folderPath = htmlPath.substring(0, htmlPath.lastIndexOf('/') + 1);
          targetContainer.querySelectorAll('img, source').forEach(el => {
            const src = el.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('/')) {
              el.setAttribute('src', folderPath + src);
            }
          });

          renderMathInElement(targetContainer, {
            delimiters: [
              {left: '$$', right: '$$', display: true},
              {left: '\\[', right: '\\]', display: true},
              {left: '$', right: '$', display: false},
              {left: '\\(', right: '\\)', display: false}
            ],
            throwOnError: false
          });

          // Initialize your interactive labs and notebooks within the newly loaded container
                    targetContainer.querySelectorAll('[data-codelab]').forEach(initInteractivePython);
                    targetContainer.querySelectorAll('.nb[data-nb]').forEach(initJupyterNotebook);

                    // Initialize shared interactive components (mode switches, carousels, reveals, hints)
                    if (window.initModeSwitches) window.initModeSwitches();
                    if (window.initCarousels) window.initCarousels();
                    if (window.initReveals) window.initReveals();
                    if (window.initHints) window.initHints();

                    // ---> PUT THE HEIGHT FIX RIGHT HERE INSTEAD OF TIMEOUT:
                    targetContainer.querySelectorAll('.code-cell').forEach(host => {
                      if (host._ta) {
                        host._ta.style.height = 'auto';
                        host._ta.style.height = Math.max(40, host._ta.scrollHeight) + 'px';
                      }
                    });

                    handleTabReady();
        })

        .catch(err => console.error('Error loading tab content:', err));
    } else {
      setTimeout(handleTabReady, 50);
    }

    if (!anchor) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    
    requestAnimationFrame(() => {
      const el = document.getElementById(anchor);
      if (!el) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.remove('xref-hit');
      void el.offsetWidth;
      el.classList.add('xref-hit');
    });
  }

  tabs.forEach(tab => {
    if (tab.hasAttribute('disabled')) return;
    tab.addEventListener('click', () => activate(tab.dataset.tab));
  });

  document.querySelectorAll('[data-go]').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); activate(link.dataset.go, link.dataset.anchor); });
  });

  // Automatically trigger the active tab on initial page load
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    activate(activeTab.dataset.tab);
  }
})();


// ---------- numbered equations + the contents rail ---------- //
/* Runs on DOMContentLoaded, i.e. AFTER the KaTeX pass registered earlier, so the
   equation miniatures in the rail can just clone the already-rendered math. */
document.addEventListener('DOMContentLoaded', function () {

  /* Anything inside these is a step-by-step restatement or code, so it gets no
     equation number. Revealed results DO get numbered, but they stay out of the
     contents so the rail never spoils them. */
  const SKIP = '.derivation, .hint, .codelab, .nb, .ext-aux, [data-modepane][data-mode="try"]';
  const TOC_SKIP = SKIP + ', [data-revealtarget], .skip-num';
  const panels = Array.from(document.querySelectorAll('.tab-content'));
  const tabLabel = {};
  document.querySelectorAll('.tab').forEach(t => { tabLabel[t.dataset.tab] = t.textContent.trim(); });

  const rail     = document.getElementById('toc');
  const list     = rail.querySelector('[data-toc-list]');
  const marker   = rail.querySelector('[data-toc-marker]');
  const where    = rail.querySelector('[data-toc-where]');
  const progress = rail.querySelector('[data-toc-progress]');
  const scrim    = document.querySelector('[data-toc-scrim]');
  const fab      = document.querySelector('[data-toc-toggle]');
  const wide     = window.matchMedia('(min-width:1500px)');

  let items = [];      // { entry, button }
  let activeIdx = -1;
  let filter = 'all';
  const contents = {};

  function cleanText(node) {
    const c = node.cloneNode(true);
    c.querySelectorAll('.katex-mathml').forEach(n => n.remove());
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  // 1. Wrap the numbering logic in a function and expose it globally
  function numberEquations() {
    panels.forEach(panel => {
      let n = 0;
      panel.querySelectorAll('.equation, .equation-boxed').forEach(eq => {
        // Prevent re-numbering equations if the tab is clicked again
        if (eq.dataset.eqnum || eq.closest(SKIP) || eq.classList.contains('skip-num')) return;
        n += 1;
        eq.dataset.eqnum = String(n);
        if (!eq.id) eq.id = panel.id + '-eq-' + n;

        const row = document.createElement('div');
        row.className = 'eq-row';
        eq.parentNode.insertBefore(row, eq);
        row.appendChild(eq);

        const tag = document.createElement('button');
        tag.className = 'eq-num';
        tag.type = 'button';
        tag.textContent = '(' + n + ')';
        tag.setAttribute('aria-label', 'Equation ' + n);
        tag.addEventListener('click', () => flash(eq));
        row.appendChild(tag);
      });
    });

    document.querySelectorAll('[data-jump]').forEach(link => {
      const target = document.getElementById(link.dataset.jump);
      if (target && target.dataset.eqnum) link.textContent = '(' + target.dataset.eqnum + ')';
    });
  }
  window.numberEquations = numberEquations; // <--- This exposes it globally


  /* ---------- 2. collect the contents of each tab ---------- */
  function collect(panel) {
    const sel = '.section-heading, .subheading, figure[id], .equation, .equation-boxed';
    return Array.from(panel.querySelectorAll(sel))
      .filter(el => !el.closest(TOC_SKIP) && !el.classList.contains('skip-num'))
      .map((el, i) => {
        let kind, num = '', text = '', badge = '';
        
        if (el.classList.contains('section-heading') || el.classList.contains('subheading')) {
          kind = el.classList.contains('section-heading') ? 'section' : 'sub';
          const m = cleanText(el).match(/^(\d+(?:\.\d+)*)\.?\s+(.*)$/);
          if (m) { num = m[1]; text = m[2]; } else { text = cleanText(el); }
        } else if (el.tagName === 'FIGURE') {
          kind = 'figure';
          const cap = el.querySelector('figcaption');
          const label = cap && cap.querySelector('.label');
          badge = label ? cleanText(label).replace(/\.$/, '') : 'Fig.';
          
          // Check data-title first, then look for a title element inside the figcaption, fallback to cleaned caption text
          const titleEl = cap ? cap.querySelector('.title, .fig-title') : null;
          text = el.dataset.title || (titleEl ? cleanText(titleEl) : (cap ? cleanText(cap).replace(/^Fig\.?\s*\d+\s*[:\.-]?\s*/i, '') : ''));
        } else {
          kind = 'equation';
          badge = el.dataset.eqnum ? 'Eq. ' + el.dataset.eqnum : 'Eq.';
          
          // Only use explicit data-title or a dedicated title class inside the equation; do NOT fallback to equation markup
          const titleEl = el.querySelector('.title, .eq-title');
          text = el.dataset.title || (titleEl ? cleanText(titleEl) : ''); 
        }
        
        if (!el.id) el.id = panel.id + '-toc-' + i;
        return { el: el, kind: kind, num: num, text: text, badge: badge };
      });
  }

  /* ---------- 3. the rail ---------- */
  function activePanel() {
    return panels.find(p => p.offsetParent !== null && !p.hidden && window.getComputedStyle(p).display !== 'none') || panels[0];
  }

  function flash(el) {
    el.classList.remove('xref-hit');
    void el.offsetWidth;
    el.classList.add('xref-hit');
  }

  /* a target can be parked behind the read-through / try-it-yourself switch */
  function ensureVisible(el) {
    const pane = el.closest('[data-modepane]');
    if (pane && pane.hidden) {
      const sw = document.querySelector('[data-modeswitch="' + pane.dataset.modepane + '"]');
      const btn = sw && sw.querySelector('.mode-btn[data-mode="' + pane.dataset.mode + '"]');
      if (btn) btn.click();
    }
  }

  function build() {
    const panel = activePanel();
    items = [];
    activeIdx = -1;
    Array.from(list.querySelectorAll('.toc-item, .toc-empty')).forEach(n => n.remove());
    where.textContent = (tabLabel[panel.id.replace('panel-', '')] || '').replace(/^Kepler.s\s*/, '');

    const entries = contents[panel.id] || [];
    if (!entries.length) {
      const p = document.createElement('p');
      p.className = 'toc-empty';
      p.textContent = 'Nothing to jump to on this tab yet.';
      list.appendChild(p);
      return;
    }

    entries.forEach(entry => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toc-item kind-' + entry.kind;
      b.dataset.kind = entry.kind;

      if (entry.kind === 'section' || entry.kind === 'sub') {
        const num = document.createElement('span');
        num.className = 'toc-num';
        num.textContent = entry.num;
        if (entry.num) b.appendChild(num);
        const txt = document.createElement('span');
        txt.className = 'toc-text';
        txt.textContent = entry.text;
        b.appendChild(txt);
        b.setAttribute('aria-label', (entry.num ? entry.num + ' ' : '') + entry.text);
      } else {
        const badge = document.createElement('span');
        badge.className = 'toc-badge';
        badge.textContent = entry.badge;
        b.appendChild(badge);

        if (entry.text) {
          const txt = document.createElement('span');
          txt.className = 'toc-text';
          txt.textContent = entry.text;
          b.appendChild(txt);
        }

        if (entry.kind === 'equation') {
          b.setAttribute('aria-label', 'Equation ' + (entry.el.dataset.eqnum || 'n/a') + (entry.text ? ': ' + entry.text : ''));
        } else if (entry.kind === 'figure') {
          b.setAttribute('aria-label', (entry.badge || 'Figure') + (entry.text ? ': ' + entry.text : ''));
        } else {
          b.setAttribute('aria-label', entry.badge + (entry.text ? ' ' + entry.text : ''));
        }
      }

      b.addEventListener('click', () => {
        ensureVisible(entry.el);
        if (!wide.matches) setOpen(false, false);
        requestAnimationFrame(() => {
          entry.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          flash(entry.el);
        });
      });

      list.appendChild(b);
      items.push({ entry: entry, button: b });
    });

    applyFilter();
    requestAnimationFrame(sync);
  }

  window.rebuildTOC = build;

  function collectAndRebuild() {
    panels.forEach(p => { contents[p.id] = collect(p); });
    build();
  }
  window.collectAndRebuildTOC = collectAndRebuild;

  function applyFilter() {
    items.forEach(it => {
      const k = it.entry.kind;
      const show = filter === 'all'
        || (filter === 'section' && (k === 'section' || k === 'sub'))
        || filter === k;
      it.button.classList.toggle('filtered', !show);
    });
    requestAnimationFrame(moveMarker);
  }

  function moveMarker() {
    const it = items[activeIdx];
    if (!it || it.button.classList.contains('filtered')) { marker.style.opacity = '0'; return; }
    marker.style.opacity = '1';
    marker.style.height = Math.max(0, it.button.offsetHeight - 10) + 'px';
    marker.style.transform = 'translateY(' + (it.button.offsetTop + 5) + 'px)';
  }

  /* which entry are we standing on, and how far through the tab are we */
  function sync() {
    const panel = activePanel();
    if (!items.length) return;

    let idx = -1;
    for (let i = 0; i < items.length; i++) {
      const el = items[i].entry.el;
      if (el.offsetParent === null) continue;          // inside a hidden pane
      if (el.getBoundingClientRect().top <= 140) idx = i; else break;
    }
    if (idx < 0) idx = 0;

    if (idx !== activeIdx) {
      if (items[activeIdx]) items[activeIdx].button.classList.remove('active');
      activeIdx = idx;
      items[activeIdx].button.classList.add('active');
      moveMarker();
      // keep the active row in view, but never fight a hand that is hovering the list
      if (!list.matches(':hover')) {
        const b = items[activeIdx].button;
        const top = b.offsetTop, bot = top + b.offsetHeight;
        if (top < list.scrollTop + 12 || bot > list.scrollTop + list.clientHeight - 12) {
          list.scrollTo({ top: Math.max(0, top - list.clientHeight / 2), behavior: 'smooth' });
        }
      }
    }

    const box = panel.getBoundingClientRect();
    const span = Math.max(1, box.height - window.innerHeight * 0.6);
    const done = Math.min(1, Math.max(0, (-box.top + 120) / span));
    progress.style.width = (done * 100).toFixed(1) + '%';

    fitRail();
  }

  /* the rail is fixed, but it never sits on top of the masthead or the colophon */
  const navbar = document.querySelector('nav.tabs');   // sticky: sits under the masthead, then at y=0
  const colophon = document.querySelector('.colophon');
  function fitRail() {
    if (navbar) rail.style.top = Math.max(72, navbar.getBoundingClientRect().bottom + 14) + 'px';
    if (colophon) {
      const gap = window.innerHeight - colophon.getBoundingClientRect().top + 14;
      rail.style.bottom = Math.max(78, gap) + 'px';
    }
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; sync(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { onScroll(); moveMarker(); });

  /* ---------- 4. open / close ---------- */
  function setOpen(open, persist) {
    document.body.classList.toggle('toc-open', open);
    rail.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (fab) fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    // only a deliberate open/close is remembered; breakpoint moves are not
    if (persist !== false) { try { localStorage.setItem('kepler-toc-open', open ? '1' : '0'); } catch (e) {} }
    if (open) requestAnimationFrame(moveMarker);
  }
  document.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('[data-toc-toggle]');
  if (toggleBtn) {
    setOpen(!document.body.classList.contains('toc-open'));
  }
  });
  rail.querySelector('[data-toc-close]').addEventListener('click', () => setOpen(false));
  scrim.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('toc-open') && !wide.matches) setOpen(false);
  });

  rail.querySelectorAll('.toc-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      rail.querySelectorAll('.toc-chip').forEach(c => c.classList.toggle('active', c === chip));
      filter = chip.dataset.filter;
      applyFilter();
    });
  });

  /* rebuild whenever a different law tab becomes the visible one */
  const obs = new MutationObserver(muts => {
    if (muts.some(m => m.target.classList.contains('active'))) build();
  });
  panels.forEach(p => obs.observe(p, { attributes: true, attributeFilter: ['class'] }));

  // Force rebuild whenever any tab button is clicked
  document.querySelectorAll('.tab, [data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      setTimeout(build, 50); // Small delay to let the active class apply first
    });
  });

  try { stored = localStorage.getItem('kepler-toc-open'); } catch (e) {}

  // Wait a brief moment for dynamic content to render into the DOM
  setTimeout(() => {
    numberEquations();

    panels.forEach(p => { contents[p.id] = collect(p); });

    let stored = null;
    try { stored = localStorage.getItem('kepler-toc-open'); } catch (e) {}
    
    build();
    fitRail();
    
    setOpen(wide.matches && stored !== '0', false);
    
    wide.addEventListener('change', (e) => {
      if (e.matches) { if (stored !== '0') setOpen(true, false); }
      else setOpen(false, false);
    });
  }, 100); // 100ms delay ensures elements have rendered
});

// Helper to safely load interactive-python.js on demand
function loadAndInitPythonTab() {
  const scriptSrc = 'tabs/Kepler-1st/interactive-python.js';
  if (document.querySelector(`script[src="${scriptSrc}"]`)) {
    if (window.initInteractivePython) window.initInteractivePython();
    return;
  }
  const script = document.createElement('script');
  script.src = scriptSrc;
  script.onload = () => { if (window.initInteractivePython) window.initInteractivePython(); };
  document.body.appendChild(script);
}