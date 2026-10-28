/* =====================================================================
   SDX STUDIO — site behaviour. No dependencies.
   ===================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ } },
  };

  /* ---------- Theme ---------- */
  const themeBtn = $('[data-theme-toggle]');
  const systemLight = matchMedia('(prefers-color-scheme: light)');
  const currentTheme = () => root.getAttribute('data-theme') || (systemLight.matches ? 'light' : 'dark');
  // Keep the browser bar colour in step with a theme the visitor picked by hand.
  const syncThemeColor = () => {
    const color = currentTheme() === 'dark' ? '#07080B' : '#F6F7F9';
    $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
  };
  if (root.hasAttribute('data-theme')) syncThemeColor();
  themeBtn?.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('sdx-theme', next);
    syncThemeColor();
  });

  /* ---------- Nav: glass on scroll, active section ---------- */
  const nav = $('[data-nav]');
  const progress = $('.progress');
  const scrollTimelineSupported = CSS.supports && CSS.supports('animation-timeline: scroll()');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      nav.classList.toggle('is-scrolled', scrollY > 12);
      if (!scrollTimelineSupported && progress) {
        const max = document.documentElement.scrollHeight - innerHeight;
        progress.style.setProperty('--progress', max > 0 ? (scrollY / max).toFixed(4) : 0);
      }
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = new Map($$('.nav-links a').map((a) => [a.getAttribute('href').slice(1), a]));
  const sectionToLink = { apps: 'apps', tafseer: 'apps', habitflow: 'apps', snapdocx: 'apps', checkmines: 'apps', kashmirmarket: 'apps', workshop: 'workshop', craft: 'craft', contact: 'contact' };
  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const key = sectionToLink[entry.target.id];
      navLinks.forEach((a, id) => a.classList.toggle('is-active', id === key));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(sectionToLink).forEach((id) => { const el = document.getElementById(id); if (el) activeObserver.observe(el); });
  const top = $('#top');
  if (top) new IntersectionObserver(([e]) => { if (e.isIntersecting) navLinks.forEach((a) => a.classList.remove('is-active')); }, { rootMargin: '-45% 0px -50% 0px' }).observe(top);

  /* ---------- Reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((el) => revealObserver.observe(el));

  /* ---------- Count-up stats ---------- */
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countObserver.unobserve(entry.target);
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      if (reduceMotion) { el.textContent = target.toFixed(decimals); return; }
      const duration = 1500;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(2, -10 * t);
        el.textContent = (target * (t === 1 ? 1 : eased)).toFixed(decimals);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => { el.textContent = (0).toFixed(parseInt(el.dataset.decimals || '0', 10)); countObserver.observe(el); });

  /* ---------- Pointer effects ---------- */
  if (finePointer) {
    $$('[data-spotlight]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });

    if (!reduceMotion) {
      $$('[data-magnetic]').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.3}px)`;
        });
        el.addEventListener('pointerleave', () => { el.style.transform = ''; });
      });

      const dock = $('[data-dock]');
      if (dock) {
        const items = $$('li', dock);
        dock.addEventListener('pointermove', (e) => {
          items.forEach((li) => {
            const r = li.getBoundingClientRect();
            const d = Math.abs(e.clientX - (r.left + r.width / 2));
            li.style.setProperty('--s', (1 + 0.5 * Math.max(0, 1 - d / 150)).toFixed(3));
          });
        });
        dock.addEventListener('pointerleave', () => items.forEach((li) => li.style.setProperty('--s', 1)));
      }
    }
  }

  /* ---------- Screenshot river: duplicate once for a seamless loop ---------- */
  const river = $('[data-river]');
  if (river && !reduceMotion) {
    Array.from(river.children).forEach((img) => river.appendChild(img.cloneNode(true)));
  }

  /* ---------- Galleries ---------- */
  $$('[data-gallery]').forEach((gallery) => {
    const track = $('.gallery-track', gallery);
    const step = () => {
      const fig = $('figure', track);
      return fig ? fig.getBoundingClientRect().width + 18 : track.clientWidth * 0.8;
    };
    $('[data-prev]', gallery)?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    $('[data-next]', gallery)?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step(), behavior: 'smooth' }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step(), behavior: 'smooth' }); }
    });

    // Drag to scroll with a mouse; touch already scrolls natively.
    let startX = 0, startLeft = 0, dragging = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true; startX = e.clientX; startLeft = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) track.classList.add('is-dragging');
      track.scrollLeft = startLeft - dx;
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      // Let scroll-snap settle on the nearest screenshot.
      const s = step();
      track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: 'smooth' });
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
  });

  /* ---------- Copy email ---------- */
  $$('[data-copy]').forEach((btn) => {
    const label = $('[data-copy-label]', btn);
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        ta.remove();
      }
      label.textContent = ok ? 'Copied ✓' : text;
      setTimeout(() => { label.textContent = 'Copy email'; }, 2200);
    });
  });

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* =====================================================================
     CheckMines — a real, playable 9×9 field with a safe first tap
     ===================================================================== */
  const minesRoot = $('[data-mines]');
  if (minesRoot) initMines(minesRoot);

  function initMines(el) {
    const ROWS = 9, COLS = 9, MINES = 10, TOTAL = ROWS * COLS;
    const board = $('[data-mines-board]', el);
    const leftEl = $('[data-mines-left]', el);
    const timeEl = $('[data-mines-time]', el);
    const statusEl = $('[data-mines-status]', el);
    const modeBtn = $('[data-mines-mode]', el);
    const resetBtn = $('[data-mines-reset]', el);

    const FLAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="flag" d="M7 21V4h10l-3 4 3 4H7"/></svg>';
    const MINE = '<svg viewBox="0 0 24 24" aria-hidden="true" class="mine"><circle cx="12" cy="12" r="5.6"/><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M5.6 18.4l2.5-2.5M15.9 8.1l2.5-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

    let cells, mine, open, flag, adj, state, opened, flags, startTime, timer, flagMode = false, suppressClick = false;

    const neighbours = (i) => {
      const r = Math.floor(i / COLS), c = i % COLS, out = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) out.push(rr * COLS + cc);
      }
      return out;
    };
    const fmt = (ms) => {
      const s = Math.floor(ms / 1000);
      return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };
    const setStatus = (text, cls = '') => { statusEl.textContent = text; statusEl.className = `mines-status ${cls}`; };
    const updateLeft = () => {
      const left = MINES - flags;
      leftEl.textContent = (left < 0 ? '-' : '') + String(Math.abs(left)).padStart(3, '0');
    };

    function reset() {
      clearInterval(timer);
      mine = new Array(TOTAL).fill(false);
      open = new Array(TOTAL).fill(false);
      flag = new Array(TOTAL).fill(false);
      adj = new Array(TOTAL).fill(0);
      state = 'ready'; opened = 0; flags = 0;
      timeEl.textContent = '00:00';
      board.innerHTML = '';
      cells = [];
      for (let i = 0; i < TOTAL; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cell';
        b.dataset.i = i;
        b.setAttribute('aria-label', `Row ${Math.floor(i / COLS) + 1}, column ${(i % COLS) + 1}, hidden`);
        b.tabIndex = i === 40 ? 0 : -1;
        cells.push(b);
        board.appendChild(b);
      }
      updateLeft();
      const best = store.get('sdx-mines-best');
      setStatus(best ? `First tap is always safe. Best ${fmt(+best)}.` : 'Tap any cell. The first one is always safe.');
    }

    function placeMines(safe) {
      const banned = new Set([safe, ...neighbours(safe)]);
      let placed = 0;
      while (placed < MINES) {
        const i = Math.floor(Math.random() * TOTAL);
        if (mine[i] || banned.has(i)) continue;
        mine[i] = true; placed++;
      }
      for (let i = 0; i < TOTAL; i++) adj[i] = neighbours(i).filter((n) => mine[n]).length;
    }

    function paint(i, delay = 0) {
      const b = cells[i];
      const label = `Row ${Math.floor(i / COLS) + 1}, column ${(i % COLS) + 1}`;
      b.className = 'cell';
      b.innerHTML = '';
      if (open[i]) {
        b.classList.add('is-open');
        b.style.setProperty('--delay', `${delay}ms`);
        if (mine[i]) { b.innerHTML = MINE; b.setAttribute('aria-label', `${label}, mine`); }
        else if (adj[i]) { b.textContent = adj[i]; b.classList.add(`c${adj[i]}`); b.setAttribute('aria-label', `${label}, ${adj[i]}`); }
        else b.setAttribute('aria-label', `${label}, empty`);
      } else if (flag[i]) {
        b.innerHTML = FLAG; b.setAttribute('aria-label', `${label}, flagged`);
      } else {
        b.setAttribute('aria-label', `${label}, hidden`);
      }
    }

    function start(i) {
      placeMines(i);
      state = 'play';
      startTime = performance.now();
      timer = setInterval(() => { timeEl.textContent = fmt(performance.now() - startTime); }, 250);
      setStatus('Clear every safe cell.');
    }

    function reveal(i) {
      if (state === 'won' || state === 'lost' || flag[i]) return;
      if (state === 'ready') start(i);
      if (open[i]) { chord(i); return; }
      if (mine[i]) { lose(i); return; }
      // Flood fill outward from the tapped cell, staggering the pop animation by distance.
      const queue = [[i, 0]];
      const seen = new Set([i]);
      while (queue.length) {
        const [j, depth] = queue.shift();
        if (open[j] || flag[j]) continue;
        open[j] = true; opened++;
        paint(j, reduceMotion ? 0 : Math.min(depth * 28, 420));
        if (adj[j] === 0) neighbours(j).forEach((n) => { if (!seen.has(n) && !mine[n]) { seen.add(n); queue.push([n, depth + 1]); } });
      }
      if (opened === TOTAL - MINES) win();
    }

    function chord(i) {
      if (!adj[i]) return;
      const around = neighbours(i);
      if (around.filter((n) => flag[n]).length !== adj[i]) return;
      around.forEach((n) => { if (!open[n] && !flag[n] && state === 'play') reveal(n); });
    }

    function toggleFlag(i) {
      if (state === 'won' || state === 'lost' || open[i]) return;
      flag[i] = !flag[i];
      flags += flag[i] ? 1 : -1;
      paint(i);
      updateLeft();
      if (navigator.vibrate && !finePointer) navigator.vibrate(12);
    }

    function win() {
      state = 'won';
      clearInterval(timer);
      const ms = performance.now() - startTime;
      for (let i = 0; i < TOTAL; i++) if (mine[i] && !flag[i]) { flag[i] = true; paint(i); }
      flags = MINES; updateLeft();
      const best = +store.get('sdx-mines-best') || Infinity;
      if (ms < best) store.set('sdx-mines-best', String(Math.round(ms)));
      setStatus(ms < best ? `Field cleared in ${fmt(ms)}. New best!` : `Field cleared in ${fmt(ms)}.`, 'is-win');
    }

    function lose(i) {
      state = 'lost';
      clearInterval(timer);
      let n = 0;
      for (let j = 0; j < TOTAL; j++) {
        if (mine[j] && !flag[j]) { open[j] = true; paint(j, reduceMotion ? 0 : (n++) * 45); }
        else if (!mine[j] && flag[j]) cells[j].classList.add('is-wrong');
      }
      cells[i].classList.add('is-boom');
      if (navigator.vibrate && !finePointer) navigator.vibrate([30, 40, 60]);
      setStatus('Boom. Hit ↻ for one more try.', 'is-lose');
    }

    // Input: click, right-click, long-press, flag mode, keyboard.
    board.addEventListener('click', (e) => {
      const b = e.target.closest('.cell'); if (!b) return;
      if (suppressClick) { suppressClick = false; return; }
      const i = +b.dataset.i;
      if (flagMode && !open[i]) toggleFlag(i); else reveal(i);
    });
    board.addEventListener('contextmenu', (e) => {
      const b = e.target.closest('.cell'); if (!b) return;
      e.preventDefault();
      toggleFlag(+b.dataset.i);
    });
    let pressTimer = null;
    board.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      const b = e.target.closest('.cell'); if (!b) return;
      pressTimer = setTimeout(() => { suppressClick = true; toggleFlag(+b.dataset.i); }, 420);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => board.addEventListener(t, () => clearTimeout(pressTimer)));
    board.addEventListener('keydown', (e) => {
      const b = e.target.closest('.cell'); if (!b) return;
      const i = +b.dataset.i;
      const moves = { ArrowUp: -COLS, ArrowDown: COLS, ArrowLeft: -1, ArrowRight: 1 };
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFlag(i); return; }
      if (moves[e.key] !== undefined) {
        e.preventDefault();
        const next = i + moves[e.key];
        const sameRow = Math.floor(next / COLS) === Math.floor(i / COLS);
        if (next < 0 || next >= TOTAL || ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !sameRow)) return;
        b.tabIndex = -1; cells[next].tabIndex = 0; cells[next].focus();
      }
    });
    modeBtn.addEventListener('click', () => {
      flagMode = !flagMode;
      modeBtn.setAttribute('aria-pressed', String(flagMode));
    });
    resetBtn.addEventListener('click', reset);

    reset();
  }

  /* =====================================================================
     LearnArabic — a letter in its four positional forms
     ===================================================================== */
  const lettersRoot = $('[data-letters]');
  if (lettersRoot) initLetters(lettersRoot);

  function initLetters(el) {
    const T = 'ـ'; // tatweel joins the letter on either side
    const LETTERS = [
      ['ب', 'Bāʾ', 'b, as in “bat”'],
      ['ت', 'Tāʾ', 't, as in “tea”'],
      ['ث', 'Thāʾ', 'th, as in “think”'],
      ['ج', 'Jīm', 'j, as in “jam”'],
      ['ح', 'Ḥāʾ', 'a breathy h from deep in the throat'],
      ['خ', 'Khāʾ', 'kh, like the ch in Scottish “loch”'],
      ['س', 'Sīn', 's, as in “sun”'],
      ['ع', 'ʿAyn', 'a voiced sound from the throat'],
      ['ك', 'Kāf', 'k, as in “kite”'],
      ['ه', 'Hāʾ', 'h, as in “hat”'],
    ];
    const picker = $('.letter-picker', el);
    const forms = $('.letter-forms', el);
    const name = $('.letter-name', el);

    LETTERS.forEach(([ch, nm], i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = ch;
      b.setAttribute('aria-label', nm);
      b.setAttribute('aria-pressed', String(i === 0));
      b.addEventListener('click', () => show(i));
      picker.appendChild(b);
    });

    function show(i) {
      const [ch, nm, sound] = LETTERS[i];
      $$('button', picker).forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      const shapes = [[ch, 'Isolated'], [ch + T, 'Initial'], [T + ch + T, 'Medial'], [T + ch, 'Final']];
      forms.innerHTML = shapes.map(([s, label]) => `<div><b lang="ar">${s}</b><span>${label}</span></div>`).join('');
      name.innerHTML = `<strong>${nm}</strong> · ${sound}`;
    }
    show(0);
  }

  /* =====================================================================
     Fast Maths — a 20-second sprint that gets harder as you score
     ===================================================================== */
  const sprintRoot = $('[data-sprint]');
  if (sprintRoot) initSprint(sprintRoot);

  function initSprint(el) {
    const DURATION = 20000;
    const q = $('[data-sprint-q]', el);
    const input = $('[data-sprint-input]', el);
    const form = $('[data-sprint-form]', el);
    const startBtn = $('[data-sprint-start]', el);
    const scoreEl = $('[data-sprint-score]', el);
    const bestEl = $('[data-sprint-best]', el);
    const bar = $('[data-sprint-bar]', el);
    let running = false, score = 0, answer = 0, endAt = 0;
    bestEl.textContent = store.get('sdx-sprint-best') || '0';

    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    function next() {
      const level = 1 + Math.floor(score / 4);
      let a, b, op;
      if (level === 1) { a = rnd(2, 9); b = rnd(2, 9); op = '+'; }
      else if (level === 2) { op = Math.random() < 0.5 ? '+' : '−'; a = rnd(6, 20); b = rnd(2, op === '−' ? a - 1 : 19); }
      else if (level === 3) { op = '×'; a = rnd(2, 9); b = rnd(2, 9); }
      else { op = ['+', '−', '×'][rnd(0, 2)]; a = op === '×' ? rnd(3, 12) : rnd(12, 60); b = op === '×' ? rnd(3, 12) : rnd(5, op === '−' ? a - 1 : 45); }
      answer = op === '+' ? a + b : op === '−' ? a - b : a * b;
      q.textContent = `${a} ${op} ${b}`;
      q.classList.remove('is-right', 'is-wrong');
    }
    function tick() {
      if (!running) return;
      const left = Math.max(0, endAt - performance.now());
      bar.style.setProperty('--t', (left / DURATION).toFixed(4));
      if (left === 0) { finish(); return; }
      requestAnimationFrame(tick);
    }
    function begin() {
      running = true; score = 0; scoreEl.textContent = '0';
      input.disabled = false; input.value = ''; input.focus();
      startBtn.textContent = 'Enter';
      endAt = performance.now() + DURATION;
      next(); requestAnimationFrame(tick);
    }
    function finish() {
      running = false;
      input.disabled = true; input.value = '';
      startBtn.textContent = 'Again';
      bar.style.setProperty('--t', 0);
      const best = +(store.get('sdx-sprint-best') || 0);
      if (score > best) { store.set('sdx-sprint-best', String(score)); bestEl.textContent = score; }
      q.textContent = score > best && score > 0 ? `${score} correct · new best` : `${score} correct`;
    }
    function correct() {
      score++; scoreEl.textContent = score;
      q.classList.add('is-right');
      input.value = '';
      setTimeout(next, 140);
    }
    input.addEventListener('input', () => {
      if (!running) return;
      input.value = input.value.replace(/[^0-9-]/g, '');
      if (input.value !== '' && +input.value === answer && String(answer).length === input.value.length) correct();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!running) { begin(); return; }
      if (input.value === '') return;
      if (+input.value === answer) { correct(); return; }
      q.classList.remove('is-wrong'); void q.offsetWidth; q.classList.add('is-wrong');
      input.value = '';
    });
  }
})();
