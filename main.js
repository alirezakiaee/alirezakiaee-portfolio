// ============ Portfolio interactions ============
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Scroll reveal (Intersection Observer) ----------
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// ---------- Scroll progress bar ----------
const progressBar = document.getElementById('scroll-progress');
let ticking = false;

function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressBar.style.width = `${pct}%`;
  ticking = false;
}

window.addEventListener(
  'scroll',
  () => {
    if (!ticking) {
      requestAnimationFrame(updateProgress);
      ticking = true;
    }
  },
  { passive: true }
);
updateProgress();

// ---------- Parallax layers (hero) ----------
if (!prefersReducedMotion) {
  const layers = document.querySelectorAll('[data-parallax]');
  let parallaxTicking = false;

  window.addEventListener(
    'scroll',
    () => {
      if (parallaxTicking) return;
      parallaxTicking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        layers.forEach((layer) => {
          const speed = parseFloat(layer.dataset.parallax) || 0.2;
          layer.style.transform = `translateY(${y * speed}px)`;
        });
        parallaxTicking = false;
      });
    },
    { passive: true }
  );
}

// ---------- Custom cursor ----------
if (!prefersReducedMotion && window.matchMedia('(pointer: fine)').matches) {
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  let mouseX = 0;
  let mouseY = 0;
  let ringX = 0;
  let ringY = 0;

  window.addEventListener(
    'mousemove',
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    },
    { passive: true }
  );

  (function animateRing() {
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;
    requestAnimationFrame(animateRing);
  })();

  document
    .querySelectorAll('a, button, .project-card, .skill-chip')
    .forEach((el) => {
      el.addEventListener('mouseenter', () => ring.classList.add('is-active'));
      el.addEventListener('mouseleave', () => ring.classList.remove('is-active'));
    });
}

// ---------- Magnetic buttons ----------
if (!prefersReducedMotion && window.matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0, 0)';
    });
  });
}

// ---------- Mobile menu ----------
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

menuBtn.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('hidden');
  menuBtn.setAttribute('aria-expanded', String(!open));
});

mobileMenu.querySelectorAll('.mobile-link').forEach((link) => {
  link.addEventListener('click', () => {
    mobileMenu.classList.add('hidden');
    menuBtn.setAttribute('aria-expanded', 'false');
  });
});

// ---------- Active nav link highlight ----------
const sections = ['work', 'about', 'experience', 'contact'];
const navLinks = document.querySelectorAll('.nav-link');

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => {
          const active = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('text-ink', active);
          link.classList.toggle('text-muted', !active);
        });
      }
    });
  },
  { rootMargin: '-40% 0px -55% 0px' }
);

sections.forEach((id) => {
  const el = document.getElementById(id);
  if (el) sectionObserver.observe(el);
});
