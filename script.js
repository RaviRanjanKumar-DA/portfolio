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

  let W, H, particles = [], mouse = { x: -999, y: -999 };
  const PARTICLE_COUNT = 55;
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

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", () => { resize(); init(); });
  window.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  resize(); init(); draw();
})();

/* ── 2. Typed text animation ─────────────────────────────────────────── */
(function initTyped() {
  const el = document.getElementById("typedText");
  if (!el) return;

  const phrases = [
    "Data & Business Operations Analyst",
    "CRM & Automation Specialist",
    "Power BI · Metabase Dashboard Expert",
    "Sales Operations Analyst",
    "MIS & Process Automation Executive",
  ];

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
