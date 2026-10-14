'use client';
import Hero from '@/components/Hero';
import DishList from '@/components/DishList';
import { useDishes } from '@/hooks/useDishes';

export default function Page() {
  const state = useDishes();
  return (
    <main className="wrap">
      <header className="nav"><strong>create®</strong><span className="mono muted">Dish Studio</span></header>
      <Hero items={state.items} />
      <h2 id="dishes" className="section-title">All dishes</h2>
      <DishList state={state} />
    </main>
  );
}
