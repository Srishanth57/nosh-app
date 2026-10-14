'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { isDirty } from '@/hooks/useDishes';

export default function Hero({ items }) {
  const root = useRef(null);
  const published = items.filter((i) => i.saved.isPublished).length;
  const unsaved = items.filter(isDirty).length;

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.hero-card', { y: 50, opacity: 0, duration: 0.9, stagger: 0.12 })
        .from('.hero-line', { yPercent: 100, duration: 0.8, stagger: 0.08 }, '-=0.7');
    }, root);
    return () => mm.revert();
  }, []);

  return (
    <section className="hero" ref={root}>
      <div className="card hero-card">
        <p className="mono eyebrow">● Dish Management</p>
        <h1><span className="mask"><span className="hero-line">Dish</span></span> <span className="mask"><span className="hero-line">Dashboard</span></span></h1>
        <p className="muted">Edit names and publish status as local drafts. Nothing is saved until you click Save.</p>
        <a className="btn-arrow" href="#dishes"><span className="arrow">↓</span><span>View dishes</span></a>
      </div>

      <div className="card card-grey hero-card">
        <p className="muted">Built for safe editing</p>
        <h2><span className="mask"><span className="hero-line">Conflicts caught,</span></span> <span className="mask"><span className="hero-line">never overwritten</span></span></h2>
        <ul className="checks">
          <li>Local drafts</li>
          <li>Backend validation</li>
          <li>Optimistic locking</li>
        </ul>
      </div>

      <div className="card card-grey hero-card">
        <p className="muted">Live overview</p>
        <div className="stats">
          <div><strong>{items.length}</strong><span className="mono">Dishes</span></div>
          <div><strong>{published}</strong><span className="mono">Published</span></div>
          <div><strong>{unsaved}</strong><span className="mono">Unsaved</span></div>
        </div>
      </div>
    </section>
  );
}
