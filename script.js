/* ══════════════════════════════════════════════════════════════════════
   Ravi Ranjan Kumar — Portfolio Script
   ══════════════════════════════════════════════════════════════════════ */

// ── Typed text animation ───────────────────────────────────────────────
const phrases = [
  "Data & Business Operations Analyst",
  "CRM & Automation Specialist",
  "Power BI | Metabase Dashboard Expert",
  "Sales Operations Analyst",
  "MIS & Process Automation Executive"
];

let phraseIndex = 0, charIndex = 0, isDeleting = false;
const typedEl = document.getElementById("typedText");

function typeLoop() {
  if (!typedEl) return;
  const current = phrases[phraseIndex];
  typedEl.textContent = isDeleting
    ? current.substring(0, charIndex - 1)
    : current.substring(0, charIndex + 1);

  if (isDeleting) charIndex--;
  else charIndex++;

  if (!isDeleting && charIndex === current.length) {
    setTimeout(() => { isDeleting = true; }, 2200);
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
  }

  setTimeout(typeLoop, isDeleting ? 38 : 62);
}
typeLoop();

// ── Animated stat counters ─────────────────────────────────────────────
let countersRun = false;

function animateCounters() {
  if (countersRun) return;
  countersRun = true;
  document.querySelectorAll(".stat-num").forEach(el => {
    const target = parseInt(el.getAttribute("data-target"), 10);
    let count = 0;
    const step = Math.max(1, Math.ceil(target / 45));
    const timer = setInterval(() => {
      count = Math.min(count + step, target);
      el.textContent = count;
      if (count >= target) clearInterval(timer);
    }, 38);
  });
}

// ── Intersection Observer — fade-in + counter trigger ──────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".fade-in").forEach(el => observer.observe(el));

// Counter trigger when stats strip is visible
const statsObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) animateCounters();
}, { threshold: 0.4 });

const statsEl = document.querySelector(".stats-strip");
if (statsEl) statsObserver.observe(statsEl);

// ── Mobile nav toggle ──────────────────────────────────────────────────
const navToggle  = document.getElementById("navToggle");
const navLinks   = document.getElementById("navLinks");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  // Close menu when a link is clicked
  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
  });
}

// ── Active nav highlight on scroll ────────────────────────────────────
const allSections  = document.querySelectorAll("section[id], header[id]");
const navAnchors   = document.querySelectorAll(".nav-links a");

function updateActiveNav() {
  let current = "";
  allSections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 80) {
      current = sec.getAttribute("id");
    }
  });
  navAnchors.forEach(a => {
    const href = a.getAttribute("href").replace("#", "");
    if (href === current) {
      a.style.color = "var(--gold, #f59e0b)";
    } else {
      a.style.color = "";
    }
  });
}

window.addEventListener("scroll", updateActiveNav, { passive: true });
updateActiveNav();

// ── Sticky nav shrink on scroll ────────────────────────────────────────
const topNav = document.getElementById("topNav");
window.addEventListener("scroll", () => {
  if (window.scrollY > 60) {
    topNav.style.boxShadow = "0 3px 20px rgba(0,0,0,0.38)";
  } else {
    topNav.style.boxShadow = "0 2px 16px rgba(0,0,0,0.28)";
  }
}, { passive: true });
