// Renders content blocks from /api/content into the page.
// If the request fails, the static HTML in index.html remains as fallback.
(async () => {
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const accentize = (text, accent) => {
    const t = esc(text);
    if (!accent || !text.includes(accent)) return t;
    return t.replace(esc(accent), `<span class="text-accent">${esc(accent)}</span>`);
  };

  try {
    const res = await fetch('/api/content');
    if (!res.ok) return;
    const { blocks } = await res.json();
    if (!blocks) return;
    const byTitle = (type, title) => (blocks[type] || []).find((b) => b.title === title);

    // ----- Hero -----
    const eyebrow = byTitle('hero', 'eyebrow');
    if (eyebrow) {
      const el = document.getElementById('hero-eyebrow');
      if (el) el.innerHTML = `<span class="inline-block w-8 h-px bg-accent"></span> ${esc(eyebrow.body)}`;
    }
    const line1 = byTitle('hero', 'line1');
    if (line1) document.getElementById('hero-line1').textContent = line1.body;
    const line2 = byTitle('hero', 'line2');
    if (line2) document.getElementById('hero-line2').textContent = line2.body;
    const tagline = byTitle('hero', 'tagline');
    if (tagline) {
      const el = document.getElementById('hero-tagline');
      if (el)
        el.innerHTML = accentize(tagline.body, tagline.meta?.accent).replace(
          `<span class="text-accent">`,
          `<span class="text-ink font-medium">`
        );
    }

    // ----- Marquee -----
    if (blocks.marquee?.length) {
      const items = blocks.marquee
        .map((b) => `<span>${esc(b.title)}</span><span class="text-accent">•</span>`)
        .join('');
      const track = document.getElementById('marquee-track');
      if (track)
        track.innerHTML =
          `<span class="flex gap-10 shrink-0">${items}</span>` +
          `<span class="flex gap-10 shrink-0" aria-hidden="true">${items}</span>`;
    }

    // ----- Projects -----
    if (blocks.project?.length) {
      const arrow = `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>`;
      const grid = document.getElementById('project-grid');
      if (grid)
        grid.innerHTML = blocks.project
          .map((b, i) => {
            const g = b.meta?.gradient || ['#2563EB', '#1D4ED8', '#0F172A'];
            const link = b.meta?.link || '#';
            const tags = (b.meta?.tags || [])
              .map((t) => `<span class="rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium text-white">${esc(t)}</span>`)
              .join('');
            return `
          <a href="${esc(link)}" target="_blank" rel="noopener" class="project-card reveal is-visible group relative rounded-3xl overflow-hidden border border-black/[0.06] bg-white cursor-pointer block">
            <div class="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-[${g[0]}] via-[${g[1]}] to-[${g[2]}]">
              <div class="absolute inset-0 card-sheen"></div>
              <span class="absolute top-6 left-6 font-display font-black text-white/10 text-7xl select-none">${String(i + 1).padStart(2, '0')}</span>
              <div class="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <div class="flex gap-2 flex-wrap">${tags}</div>
                <span class="w-11 h-11 shrink-0 rounded-full bg-white text-ink grid place-items-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">${arrow}</span>
              </div>
            </div>
            <div class="p-6">
              <h3 class="font-display font-bold text-2xl tracking-tight group-hover:text-accent transition-colors duration-300">${esc(b.title)}</h3>
              <p class="mt-2 text-muted leading-relaxed">${esc(b.body)}</p>
            </div>
          </a>`;
          })
          .join('');
    }

    // ----- Side projects -----
    if (blocks.sideproject?.length) {
      const el = document.getElementById('side-projects');
      if (el)
        el.innerHTML =
          'More side projects: ' +
          blocks.sideproject
            .map(
              (b) =>
                `<a href="${esc(b.meta?.link || '#')}" target="_blank" rel="noopener" class="text-ink font-medium underline decoration-accent/40 underline-offset-4 hover:text-accent transition-colors duration-200 cursor-pointer">${esc(b.title)}</a>`
            )
            .join('<span class="mx-2 text-accent">·</span>');
    }

    // ----- About heading -----
    const heading = byTitle('about', 'heading');
    if (heading) {
      const el = document.getElementById('about-heading');
      if (el) el.innerHTML = accentize(heading.body, heading.meta?.accent);
    }

    // ----- Pillars -----
    if (blocks.pillar?.length) {
      const icons = {
        code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
        link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
        layers: '<path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5"/>',
      };
      const grid = document.getElementById('pillar-grid');
      if (grid)
        grid.innerHTML = blocks.pillar
          .map(
            (b, i) => `
          <div class="reveal is-visible" style="transition-delay:${i * 80}ms">
            <h3 class="font-display font-bold text-lg mb-3 flex items-center gap-2">
              <svg class="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[b.meta?.icon] || icons.code}</svg>
              ${esc(b.title)}
            </h3>
            <p class="text-paper/60 leading-relaxed text-sm">${esc(b.body)}</p>
          </div>`
          )
          .join('');
    }

    // ----- Skills -----
    if (blocks.skill?.length) {
      const el = document.getElementById('skill-chips');
      if (el) el.innerHTML = blocks.skill.map((b) => `<span class="skill-chip">${esc(b.title)}</span>`).join('');
    }

    // ----- Experience -----
    if (blocks.experience?.length) {
      const list = document.getElementById('experience-list');
      if (list)
        list.innerHTML = blocks.experience
          .map((b, i) => {
            const m = b.meta || {};
            const dot = m.current ? 'bg-accent' : 'bg-ink/20';
            const period = m.current ? 'text-accent' : 'text-muted';
            return `
          <li class="reveal is-visible relative pl-8" style="transition-delay:${i * 80}ms">
            <span class="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full ${dot} ring-4 ring-paper"></span>
            <div class="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <h3 class="font-display font-bold text-xl">${esc(b.title)}</h3>
              <span class="text-sm font-medium ${period}">${esc(m.period || '')}</span>
            </div>
            <p class="text-muted font-medium mt-1">${esc(m.company || '')}${m.location ? ' · ' + esc(m.location) : ''}</p>
            <p class="mt-3 max-w-2xl leading-relaxed text-muted">${esc(b.body)}</p>
          </li>`;
          })
          .join('');
    }

    // ----- Contact -----
    const email = byTitle('contact', 'email');
    if (email) {
      const el = document.getElementById('contact-email');
      if (el) {
        el.href = email.meta?.link || `mailto:${email.body}`;
        el.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg> ${esc(email.body)}`;
      }
    }
    const socials = ['github', 'linkedin', 'phone']
      .map((k) => byTitle('contact', k))
      .filter(Boolean);
    if (socials.length) {
      const icons = {
        github: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>',
        linkedin: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"/></svg>',
        phone: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
      };
      const el = document.getElementById('contact-socials');
      if (el)
        el.innerHTML = socials
          .map(
            (b) =>
              `<a href="${esc(b.meta?.link || '#')}" ${/^https?:/.test(b.meta?.link || '') ? 'target="_blank" rel="noopener"' : ''} aria-label="${esc(b.title)}" class="magnetic w-12 h-12 rounded-full border border-ink/15 grid place-items-center hover:border-accent hover:text-accent transition-colors duration-300 cursor-pointer">${icons[b.title] || icons.phone}</a>`
          )
          .join('');
    }
  } catch {
    // Network/DB down -> static fallback stays.
  }
})();
