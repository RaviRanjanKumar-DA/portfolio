/* ══════════════════════════════════════════════════════════════════════
   Ravi Ranjan Kumar — Portfolio Script
   Features: Canvas network · Typed text · Counters · Scroll reveals
             Active nav · Mobile menu · Back-to-top · Navbar scroll
   ══════════════════════════════════════════════════════════════════════ */

/* ── 1. Canvas Particle Network ──────────────────────────────────────── */
(function initCanvas() {
  const canvas = document.getElementById("networkCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let W, H, particles = [], mouse = { x: -999, y: -999 }, paused = false;
  const PARTICLE_COUNT = window.innerWidth < 768 ? 26 : 55;
  const MAX_DIST = 140;
  const COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981"];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Particle() {
    this.x  = Math.random() * W;
    this.y  = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.r  = Math.random() * 2.5 + 1;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  function init() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + "aa";
      ctx.fill();
    });

    // Lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          const alpha = (1 - dist / MAX_DIST) * 0.25;
          ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
      // Lines to mouse
      const mx = particles[i].x - mouse.x;
      const my = particles[i].y - mouse.y;
      const md = Math.sqrt(mx * mx + my * my);
      if (md < 180) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(6,182,212,${(1 - md / 180) * 0.35})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    if (!paused) requestAnimationFrame(draw);
  }

  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { resize(); init(); }, 150); });
  document.addEventListener("visibilitychange", () => { paused = document.hidden; if (!paused) draw(); });
  window.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  resize(); init(); draw();
})();

/* ── 2. Typed text animation ─────────────────────────────────────────── */
(function initTyped() {
  const el = document.getElementById("typedText");
  if (!el) return;

  const phrases = [
    "Senior Data Analyst · 5+ Years of Experience",
    "Designed 100+ Interactive Dashboards",
    "CRM Automation & Business Intelligence Expert",
    "Enabling Data-Driven Decision Making",
    "Sales Operations & Reporting Automation Specialist",
  ];

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = phrases[0]; return; }
  let pi = 0, ci = 0, del = false;

  function tick() {
    const phrase = phrases[pi];
    el.textContent = del ? phrase.slice(0, ci - 1) : phrase.slice(0, ci + 1);
    del ? ci-- : ci++;

    if (!del && ci === phrase.length) {
      setTimeout(() => { del = true; }, 2200);
    } else if (del && ci === 0) {
      del = false;
      pi  = (pi + 1) % phrases.length;
    }
    setTimeout(tick, del ? 36 : 60);
  }
  tick();
})();

/* ── 3. Scroll reveal (Intersection Observer) ────────────────────────── */
(function initReveal() {
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); } }),
    { threshold: 0.1 }
  );
  document.querySelectorAll(".reveal").forEach(el => obs.observe(el));
})();

/* ── 4. Animated counters ────────────────────────────────────────────── */
(function initCounters() {
  let done = false;
  const statsEl = document.querySelector(".stats-strip");
  if (!statsEl) return;

  const obs = new IntersectionObserver(entries => {
    if (!done && entries[0].isIntersecting) {
      done = true;
      document.querySelectorAll(".stat-num").forEach(el => {
        const target = parseInt(el.dataset.target, 10);
        let count = 0;
        const step = Math.max(1, Math.ceil(target / 50));
        const t = setInterval(() => {
          count = Math.min(count + step, target);
          el.textContent = count;
          if (count >= target) clearInterval(t);
        }, 36);
      });
    }
  }, { threshold: 0.5 });

  obs.observe(statsEl);
})();

/* ── 5. Sticky navbar scroll effect ──────────────────────────────────── */
(function initNavbar() {
  const nav = document.getElementById("navbar");
  if (!nav) return;
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 50);
  }, { passive: true });
})();

/* ── 6. Mobile nav toggle ─────────────────────────────────────────────── */
(function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const links  = document.getElementById("navLinks");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    links.classList.toggle("open");
    const isOpen = links.classList.contains("open");
    toggle.setAttribute("aria-expanded", isOpen);
  });

  links.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => links.classList.remove("open"));
  });
})();

/* ── 7. Active nav link on scroll ─────────────────────────────────────── */
(function initActiveNav() {
  const sections = document.querySelectorAll("section[id]");
  const links    = document.querySelectorAll(".nav-links a");

  function update() {
    let current = "";
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 90) current = sec.id;
    });
    links.forEach(a => {
      const match = a.getAttribute("href") === `#${current}`;
      a.classList.toggle("active", match);
    });
  }

  window.addEventListener("scroll", update, { passive: true });
  update();
})();

/* ── 8. Back-to-top button ────────────────────────────────────────────── */
(function initBackToTop() {
  const btn = document.getElementById("backToTop");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > 500);
  }, { passive: true });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

/* ── 9. Animated flow diagrams (play when visible) ────────────────────── */
(function initFlows() {
  const flows = document.querySelectorAll("[data-flow]");
  if (!flows.length) return;
  const obs = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("play"); obs.unobserve(e.target); }
  }), { threshold: 0.2 });
  flows.forEach(f => obs.observe(f));
})();

/* ── 10. Timeline progress line ───────────────────────────────────────── */
(function initTimelineProgress() {
  const tl = document.querySelector(".timeline");
  if (!tl) return;
  function update() {
    const r = tl.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((window.innerHeight * 0.6 - r.top) / r.height) * 100));
    tl.style.setProperty("--tl-progress", pct + "%");
  }
  window.addEventListener("scroll", update, { passive: true });
  update();
})();

/* ── 11. Footer year ──────────────────────────────────────────────────── */
(function () {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();

/* ── 12. 3D tilt on cards (mouse devices only) ─────────────────────────── */
(function initTilt() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll(".proj-card, .ach-card, .skill-block, .info-card, .edu-card").forEach(card => {
    card.setAttribute("data-tilt", "");
    if (getComputedStyle(card).position === "static") card.style.position = "relative";
    const icon = card.querySelector(".ach-ico, .proj-icon-wrap, .sb-head i, .edu-ico");
    if (icon) icon.classList.add("tilt-pop");
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg) translateY(-4px)`;
      card.style.setProperty("--gx", x * 100 + "%");
      card.style.setProperty("--gy", y * 100 + "%");
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
})();

/* ── 13. Job durations + "experience at a glance" bars ────────────────── */
(function initDurations() {
  const MON = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
  const now = new Date();
  const nowIdx = (() => {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(now);
    return +p.find(x => x.type === "year").value * 12 + (+p.find(x => x.type === "month").value) - 1;
  })();
  const parse = s => {
    if (/present|current/i.test(s)) return nowIdx;
    const m = s.trim().toLowerCase().match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/);
    return m && m[1] in MON ? +m[2] * 12 + MON[m[1]] : null;
  };
  const fmt = n => {
    const y = Math.floor(n / 12), m = n % 12;
    return [y ? y + (y > 1 ? " yrs" : " yr") : "", m ? m + (m > 1 ? " mos" : " mo") : ""].filter(Boolean).join(" ");
  };
  const rows = [];
  document.querySelectorAll(".tl-item").forEach(item => {
    const dateEl = item.querySelector(".tl-date");
    if (!dateEl) return;
    const [a, b] = dateEl.textContent.split(/[–-]/).map(x => x.trim());
    const s = parse(a || ""), e = parse(b || "");
    if (s === null || e === null || e < s) return;
    const months = e - s + 1;
    dateEl.insertAdjacentHTML("beforeend", ` <span class="tl-dur">· ${fmt(months)}</span>`);
    const co = item.querySelector(".tl-co");
    const name = co ? co.childNodes[co.childNodes.length > 1 ? 1 : 0].textContent.split("·")[0].trim() : "";
    rows.push({ title: item.querySelector("h3")?.textContent.trim() || "", company: name, months, current: /present/i.test(b || ""), logo: co?.querySelector("img")?.getAttribute("src") || "" });
  });
  const box = document.getElementById("tlSummary");
  if (!box || !rows.length) return;
  const total = rows.reduce((t, r) => t + r.months, 0);
  const max = Math.max(...rows.map(r => r.months));
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" })[c]);
  box.innerHTML = `<div class="tls-head"><span><i class="fas fa-hourglass-half"></i> Experience at a glance</span><b>${fmt(total)} total</b></div>` +
    rows.map(r => `<div class="tls-row"><div class="tls-name">${r.logo ? `<img src="${esc(r.logo)}" alt="">` : ""}<div><b>${esc(r.company)}</b><small>${esc(r.title)}${r.current ? " · Current" : ""}</small></div></div>
      <div class="tls-bar"><span style="--w:${(r.months / max * 100).toFixed(1)}%"${r.current ? ' class="cur"' : ""}></span></div><div class="tls-dur">${fmt(r.months)}</div></div>`).join("");
})();
