'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DishCard from './DishCard';

gsap.registerPlugin(ScrollTrigger);

export default function DishList({ state }) {
  const { items, status, loadError, load, ...actions } = state;
  const ref = useRef(null);
  const count = items.length;

  // Batched scroll reveal for cards; skipped for reduced motion.
  useEffect(() => {
    if (status !== 'ready' || !ref.current) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.set('.dish-card', { y: 40, opacity: 0 });
      ScrollTrigger.batch('.dish-card', {
        start: 'top 92%',
        once: true,
        onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', clearProps: 'transform' }),
      });
    }, ref);
    return () => mm.revert();
  }, [status, count]);

  if (status === 'loading') return <p className="state">Loading dishes…</p>;
  if (status === 'error')
    return (
      <div className="state">
        <p>{loadError}</p>
        <button className="btn-arrow" onClick={load}><span className="arrow">→</span><span>Retry</span></button>
      </div>
    );
  if (!count) return <p className="state">No dishes found</p>;

  return (
    <div className="grid" ref={ref}>
      {items.map((it) => (
        <DishCard key={it.saved.dishId} item={it} {...actions} />
      ))}
    </div>
  );
}
