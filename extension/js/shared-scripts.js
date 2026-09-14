/* ===== STEP CAROUSELS ===== */
function initCarousels() {
  document.querySelectorAll('[data-carousel]').forEach(root => {
    if (root.dataset.initialized) return; // Prevent double-binding
    root.dataset.initialized = 'true';

    const key = root.dataset.carousel;
    const track = root.querySelector(`[data-track="${key}"]`);
    if (!track) return;
    const slides = Array.from(track.querySelectorAll('.step-slide'));
    const prevBtn = root.querySelector(`[data-prev="${key}"]`);
    const nextBtn = root.querySelector(`[data-next="${key}"]`);
    const dotsWrap = root.querySelector(`[data-dots="${key}"]`);
    const counter = root.querySelector(`[data-counter="${key}"]`);
    const total = slides.length;
    let idx = slides.findIndex(s => s.classList.contains('active'));
    if (idx < 0) idx = 0;
    const seen = new Set([idx]);

    if (dotsWrap && dotsWrap.children.length === 0) {
      slides.forEach((_, i) => {
        const d = document.createElement('button');
        d.className = 'carousel-dot';
        d.setAttribute('aria-label', `Go to step ${i + 1}`);
        d.addEventListener('click', () => go(i));
        dotsWrap.appendChild(d);
      });
    }
    const dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.carousel-dot')) : [];

    function render() {
      slides.forEach((s, i) => s.classList.toggle('active', i === idx));
      dots.forEach((d, i) => {
        d.classList.toggle('active', i === idx);
        d.classList.toggle('seen', seen.has(i));
      });
      if (counter) counter.textContent = `Step ${idx + 1} / ${total}`;
      if (prevBtn) prevBtn.disabled = (idx === 0);
      if (nextBtn) nextBtn.disabled = (idx === total - 1);
    }

    function go(i) {
      idx = Math.max(0, Math.min(total - 1, i));
      seen.add(idx);
      render();
      root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (prevBtn) prevBtn.addEventListener('click', () => go(idx - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(idx + 1));
    render();
  });
}

/* ===== RESULT REVEAL ===== */
function initReveals() {
  document.querySelectorAll('.reveal-result').forEach(btn => {
    if (btn.dataset.initialized) return;
    btn.dataset.initialized = 'true';

    const key = btn.dataset.reveal;
    const target = document.querySelector(`[data-revealtarget="${key}"]`);
    btn.addEventListener('click', () => {
      if (target) target.hidden = false;
      btn.hidden = true;
    });
  });

  document.querySelectorAll('.result-reset').forEach(rbtn => {
    if (rbtn.dataset.initialized) return;
    rbtn.dataset.initialized = 'true';

    const key = rbtn.dataset.resultreset;
    const target = document.querySelector(`[data-revealtarget="${key}"]`);
    const revealBtn = document.querySelector(`.reveal-result[data-reveal="${key}"]`);
    rbtn.addEventListener('click', () => {
      if (target) target.hidden = true;
      if (revealBtn) {
        revealBtn.hidden = false;
        revealBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
}

/* ===== MODE SWITCHES (Try it yourself / Read through) ===== */
function initModeSwitches() {
  document.querySelectorAll('[data-modeswitch]').forEach(sw => {
    if (sw.dataset.initialized) return;
    sw.dataset.initialized = 'true';

    const key = sw.dataset.modeswitch;
    const panes = Array.from(document.querySelectorAll('[data-modepane="' + key + '"]'));
    const btns = Array.from(sw.querySelectorAll('.mode-btn'));
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.toggle('active', b === btn));
        panes.forEach(p => { p.hidden = (p.dataset.mode !== btn.dataset.mode); });
      });
    });
  });
}

/* ===== HINT REVEAL (+ % badges and solution meter) ===== */
function initHints() {
  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

  document.querySelectorAll('.hint-btn').forEach(btn => {
    if (btn.dataset.initialized) return;
    btn.dataset.initialized = 'true';

    const stepId = btn.dataset.step;
    const container = document.querySelector(`[data-hints="${stepId}"]`);
    const progress = document.querySelector(`[data-progress="${stepId}"]`);
    const meterFill = document.querySelector(`[data-meter="${stepId}"]`);
    const meterLabel = document.querySelector(`[data-meterlabel="${stepId}"]`);
    if (!container) return;

    const hints = Array.from(container.querySelectorAll('.hint'));
    const total = hints.length;
    let revealed = 0;
    if (progress) progress.innerHTML = `<span class="filled">0</span> / ${total}`;

    hints.forEach(h => {
      const pct = parseInt(h.dataset.pct || '0', 10);
      const badge = h.querySelector('.hint-pct');
      if (badge) {
        const t = Math.min(Math.max(pct / 100, 0), 1);
        const r = lerp(120, 43, t), g = lerp(160, 197, t), b = lerp(210, 255, t);
        badge.style.color = `rgb(${r},${g},${b})`;
        badge.style.borderColor = `rgba(${r},${g},${b},0.5)`;
      }
    });

    btn.addEventListener('click', () => {
      if (revealed >= total) return;
      const h = hints[revealed];
      h.classList.add('visible');
      revealed++;
      if (progress) progress.innerHTML = `<span class="filled">${revealed}</span> / ${total}`;
      const pct = parseInt(h.dataset.pct || '0', 10);
      if (meterFill) meterFill.style.width = pct + '%';
      if (meterLabel) meterLabel.textContent = `~${pct}% of the solution revealed`;
      if (revealed >= total) { 
        btn.setAttribute('disabled', 'true'); 
        btn.innerHTML = 'All hints revealed'; 
      }
      setTimeout(() => { h.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 180);
    });
  });

  document.querySelectorAll('.hint-reset').forEach(resetBtn => {
    if (resetBtn.dataset.initialized) return;
    resetBtn.dataset.initialized = 'true';

    const stepId = resetBtn.dataset.reset;
    resetBtn.addEventListener('click', () => {
      const container = document.querySelector(`[data-hints="${stepId}"]`);
      const progress = document.querySelector(`[data-progress="${stepId}"]`);
      const btn = document.querySelector(`.hint-btn[data-step="${stepId}"]`);
      const meterFill = document.querySelector(`[data-meter="${stepId}"]`);
      const meterLabel = document.querySelector(`[data-meterlabel="${stepId}"]`);
      if (!container) return;

      const total = container.querySelectorAll('.hint').length;
      container.querySelectorAll('.hint').forEach(h => h.classList.remove('visible'));
      if (progress) progress.innerHTML = `<span class="filled">0</span> / ${total}`;
      if (meterFill) meterFill.style.width = '0%';
      if (meterLabel) meterLabel.textContent = '0% of the solution revealed';
      if (btn) {
        btn.removeAttribute('disabled');
        btn.innerHTML = 'Reveal next hint <span class="arrow">&rarr;</span>';
      }
    });
  });
}

/* Run on initial load */
document.addEventListener('DOMContentLoaded', () => {
  initCarousels();
  initReveals();
  initHints();
  initModeSwitches();
});

/* Expose for dynamic tab loading */
window.initModeSwitches = initModeSwitches;
window.initCarousels = initCarousels;
window.initReveals = initReveals;
window.initHints = initHints;