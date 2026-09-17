'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Mounts the site's progressive-enhancement layer: scroll progress bar,
// IntersectionObserver reveals, mobile menu toggle, and the custom cursor.
// Everything degrades gracefully — content is fully server-rendered without JS.
export function PublicEffects() {
  const pathname = usePathname();

  // Re-observe .reveal elements on every route change — App Router client
  // navigation swaps page content without remounting this component, so
  // elements rendered after the initial mount would otherwise stay hidden.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    // Wait a frame so the new route's DOM is painted before querying.
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
    });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scroll progress
    const bar = document.getElementById('scroll-progress');
    const onScroll = () => {
      if (!bar) return;
      const h = document.documentElement;
      const pct = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      bar.style.width = `${pct * 100}%`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile menu
    const btn = document.getElementById('menu-btn');
    const menu = document.getElementById('mobile-menu');
    const toggle = () => {
      const open = menu?.classList.toggle('hidden') === false;
      btn?.setAttribute('aria-expanded', String(open));
    };
    const close = () => menu?.classList.add('hidden');
    btn?.addEventListener('click', toggle);
    menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));

    // Custom cursor (desktop + fine pointer only)
    let removeCursor = () => {};
    if (!reduced && window.matchMedia('(pointer: fine)').matches) {
      const dot = document.getElementById('cursor-dot');
      const ring = document.getElementById('cursor-ring');
      dot?.classList.remove('hidden');
      ring?.classList.remove('hidden');
      let rx = 0, ry = 0, tx = 0, ty = 0, raf = 0;
      const move = (e: MouseEvent) => {
        tx = e.clientX; ty = e.clientY;
        if (dot) { dot.style.left = `${tx}px`; dot.style.top = `${ty}px`; }
      };
      const loop = () => {
        rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
        if (ring) { ring.style.left = `${rx}px`; ring.style.top = `${ry}px`; }
        raf = requestAnimationFrame(loop);
      };
      const over = (e: MouseEvent) => {
        const t = e.target as HTMLElement;
        ring?.classList.toggle('is-active', !!t.closest('a,button,.project-card'));
      };
      window.addEventListener('mousemove', move, { passive: true });
      window.addEventListener('mouseover', over, { passive: true });
      raf = requestAnimationFrame(loop);
      removeCursor = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseover', over);
        cancelAnimationFrame(raf);
      };
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      btn?.removeEventListener('click', toggle);
      menu?.querySelectorAll('a').forEach((a) => a.removeEventListener('click', close));
      removeCursor();
    };
  }, []);

  return (
    <>
      <div id="scroll-progress" className="fixed top-0 left-0 h-[3px] bg-accent z-[60] w-0" />
      <div id="cursor-dot" className="cursor-dot hidden" />
      <div id="cursor-ring" className="cursor-ring hidden" />
    </>
  );
}
