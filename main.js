// UI for "The Jonathon Line" — works even if WebGL / 3D or smooth-scroll fails to load
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

$('#year').textContent = new Date().getFullYear();

/* ---------- Split text for reveal animations ---------- */
function splitWords(root) {
  let wi = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          const inner = document.createElement('span');
          inner.textContent = part;
          inner.style.setProperty('--wi', wi++);
          w.appendChild(inner);
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(root);
}
$$('.words').forEach(splitWords);
let ci = 0;
$$('.chars').forEach((el) => {
  const text = el.textContent;
  el.textContent = '';
  [...text].forEach((ch) => {
    const s = document.createElement('span');
    s.className = 'c';
    s.textContent = ch;
    s.style.setProperty('--ci', ci++);
    el.appendChild(s);
  });
});

/* ---------- Habit tracker calendar mock ---------- */
(() => {
  const cal = $('.h-cal');
  const pattern = 'gggyggg.gggggygg.ggggyggg.gggt';
  [...pattern].forEach((p, k) => {
    const i = document.createElement('i');
    if (p === 'g') i.className = 'g';
    if (p === 'y') i.className = 'y';
    if (p === 't') i.className = 't';
    i.style.setProperty('--k', k);
    cal.appendChild(i);
  });
})();

/* ---------- Smooth scrolling (Lenis) ---------- */
let lenis = null;
if (window.Lenis && !reduced) {
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  lenis.stop();
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = a.getAttribute('href') === '#home' ? 0 : $(a.getAttribute('href'));
  if (target === null) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -10, duration: 1.6 });
  else window.scrollTo({ top: target === 0 ? 0 : target.offsetTop - 10, behavior: reduced ? 'auto' : 'smooth' });
});

/* ---------- 3D scene ---------- */
let sceneReady = false;
import('./scene.js')
  .then(({ initScene }) => { initScene($('#bg')); sceneReady = true; })
  .catch((err) => { console.warn('3D scene unavailable:', err); sceneReady = true; });

/* ---------- Loader ---------- */
(() => {
  const fill = $('#loaderFill'), msg = $('#loaderMsg');
  const msgs = ['Doors closing…', 'Stand clear…', 'Departing Queens…'];
  let i = 0, done = false;
  const start = performance.now();
  const iv = setInterval(() => {
    i++;
    msg.textContent = msgs[Math.min(Math.floor(i / 9), msgs.length - 1)];
    fill.style.width = Math.min(i * 3, 88) + '%';
    if (sceneReady && document.readyState === 'complete' && performance.now() - start > 1000) finish();
  }, 60);
  function finish() {
    if (done) return;
    done = true;
    clearInterval(iv);
    fill.style.width = '100%';
    msg.textContent = 'All aboard!';
    setTimeout(() => {
      $('#loader').classList.add('done');
      document.body.classList.remove('loading');
      if (lenis) lenis.start();
      setTimeout(() => $('#home').classList.add('go'), 250);
      setTimeout(startTyping, 1800);
    }, 450);
  }
  setTimeout(finish, 5500);
})();

/* ---------- Typing ---------- */
function startTyping() {
  if (reduced) return;
  const el = $('#typed');
  const words = ['cross-platform mobile apps.', 'full-stack web apps.', 'AI-powered tools.', 'clean Java & C++ systems.'];
  let w = 0, i = words[0].length, del = true;
  const loop = () => {
    const word = words[w];
    i += del ? -1 : 1;
    el.textContent = word.slice(0, i);
    let delay = del ? 28 : 62;
    if (!del && i === word.length) { del = true; delay = 1900; }
    else if (del && i === 0) { del = false; w = (w + 1) % words.length; delay = 300; }
    setTimeout(loop, delay);
  };
  setTimeout(loop, 1200);
}

/* ---------- Nav, route rail, panel scale ---------- */
const nav = $('#nav'), burger = $('#burger'), links = $('#navLinks');
burger.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
});
$$('a', links).forEach((a) => a.addEventListener('click', () => {
  links.classList.remove('open'); burger.classList.remove('open'); burger.setAttribute('aria-expanded', false);
}));

const stations = $$('[data-station]');
const route = $('#route');
const fill = document.createElement('span');
fill.className = 'route-fill';
route.appendChild(fill);
stations.forEach((s) => {
  const a = document.createElement('a');
  a.href = '#' + s.id;
  a.setAttribute('aria-label', s.dataset.station);
  a.style.setProperty('--c', `var(--${s.dataset.color})`);
  a.innerHTML = `<span class="dot"></span><span class="lbl">${s.dataset.station}</span>`;
  route.appendChild(a);
});
const routeLinks = $$('a', route);
const panels = $$('.panel');

let lastY = window.scrollY;
function frame() {
  const y = window.scrollY, vh = window.innerHeight;
  nav.classList.toggle('scrolled', y > 30);
  if (!links.classList.contains('open')) nav.classList.toggle('hide', y > lastY + 2 && y > vh * 0.8);
  if (y < lastY - 2) nav.classList.remove('hide');
  lastY = y;

  let idx = 0;
  stations.forEach((s, i) => { if (s.offsetTop - vh * 0.45 <= y) idx = i; });
  const id = stations[idx].id;
  $$('.nav-links a[href^="#"]').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  routeLinks.forEach((a, i) => a.classList.toggle('active', i === idx));
  const next = stations[idx + 1];
  const frac = next ? Math.min(Math.max((y - stations[idx].offsetTop + vh * 0.45) / (next.offsetTop - stations[idx].offsetTop), 0), 1) : 0;
  const a0 = routeLinks[idx], a1 = routeLinks[idx + 1] || a0;
  fill.style.height = Math.max(a0.offsetTop + (a1.offsetTop - a0.offsetTop) * frac - 10, 0) + 'px';

  // panels grow into place as they rise into view
  if (!reduced) {
    panels.forEach((p) => {
      const top = p.getBoundingClientRect().top;
      const k = Math.min(Math.max((vh - top) / (vh * 0.75), 0), 1);
      const e = 1 - Math.pow(1 - k, 3);
      p.style.transform = `scale(${0.9 + 0.1 * e})`;
    });
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- Reveal on scroll ---------- */
$$('.stops').forEach((row) => $$('span', row).forEach((s, i) => s.style.setProperty('--i', i)));
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
    $$('[data-count]', e.target).forEach(countUp);
    if (e.target.id === 'board') runBoard();
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
$$('.reveal, .words, #habitMock').forEach((el) => {
  if (el.closest('.hero')) return;
  const sibs = $$(':scope > .reveal', el.parentElement);
  if (el.classList.contains('reveal')) el.style.setProperty('--d', `${Math.min(Math.max(sibs.indexOf(el), 0), 5) * 0.08}s`);
  io.observe(el);
});

function countUp(el) {
  const target = +el.dataset.count, t0 = performance.now();
  const f = (now) => {
    const k = Math.min((now - t0) / 1300, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}

/* ---------- Split-flap departures board ---------- */
const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function flap(el, delay) {
  const text = el.dataset.text;
  el.setAttribute('aria-label', text);
  el.textContent = '';
  [...text].forEach((final, i) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = ' ';
    el.appendChild(s);
    const show = () => { s.textContent = final === ' ' ? ' ' : final; };
    if (reduced) return show();
    let n = 0;
    const max = 8 + i * 2;
    setTimeout(() => {
      const iv = setInterval(() => {
        if (++n >= max) { show(); clearInterval(iv); }
        else s.textContent = POOL[(Math.random() * POOL.length) | 0];
      }, 42);
    }, delay);
  });
}
let boardRan = false;
function runBoard() {
  if (boardRan) return;
  boardRan = true;
  $$('.board-row').forEach((row, r) => $$('.flap', row).forEach((el) => flap(el, r * 220)));
}
function tickClock() {
  $('#clock').textContent = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });
}
tickClock();
setInterval(tickClock, 15000);

/* ---------- Pointer effects: tilt, magnetic, cursor ---------- */
if (finePointer && !reduced) {
  $$('[data-tilt]').forEach((el) => {
    const max = el.classList.contains('project') || el.classList.contains('ticket') ? 4 : 9;
    const base = el.classList.contains('polaroid') ? ' rotate(-4deg)' : '';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(1100px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg)${base}`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
  $$('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  document.body.classList.add('has-cursor');
  const cursor = $('.cursor');
  let mx = -100, my = -100, cx = -100, cy = -100;
  window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  (function follow() {
    cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(follow);
  })();
  document.addEventListener('pointerover', (e) => cursor.classList.toggle('hover', !!e.target.closest('a, button, .bullet, .stops span')));
}

/* ---------- Terminal animation ---------- */
(() => {
  const body = $('#termBody');
  const lines = [
    ['pr', '$ ./bank'],
    ['', '1) Open  2) Deposit  3) Withdraw  4) Balance'],
    ['pr', '> 1  name: Jonathon'],
    ['ok', '✔ Account #10042 created'],
    ['pr', '> 2  amount: 1250.00'],
    ['ok', '✔ Deposited $1,250.00'],
    ['pr', '> 3  amount: 2000.00'],
    ['err', '✘ Insufficient funds — blocked'],
    ['pr', '> 4'],
    ['ok', '  Balance: $1,250.00'],
  ];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let started = false;
  async function run() {
    for (;;) {
      body.textContent = '';
      for (const [cls, text] of lines) {
        const span = document.createElement('span');
        if (cls) span.className = cls;
        body.appendChild(span);
        for (let i = 1; i <= text.length; i++) { span.textContent = text.slice(0, i); await sleep(cls === 'pr' ? 36 : 8); }
        body.appendChild(document.createTextNode('\n'));
        await sleep(240);
      }
      const cur = document.createElement('span');
      cur.className = 'cur';
      body.appendChild(cur);
      await sleep(3500);
    }
  }
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; run(); } }).observe(body);
})();

/* ---------- Copy email ---------- */
$('#copyEmail').addEventListener('click', async () => {
  const email = 'jonathangomesmaster@gmail.com';
  try { await navigator.clipboard.writeText(email); }
  catch { const t = document.createElement('textarea'); t.value = email; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
  const toast = $('#toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
});
