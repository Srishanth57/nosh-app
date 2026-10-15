'use client';
import Hero from '@/components/Hero';
import DishList from '@/components/DishList';
import { useDishes } from '@/hooks/useDishes';

export default function Page() {
  const state = useDishes();
  const { status, refresh, refreshing, refreshError } = state;
  return (
    <main className="wrap">
      <header className="nav"><strong>create®</strong><span className="mono muted">Dish Studio</span></header>
      <Hero items={state.items} />
      <div className="section-head">
        <h2 id="dishes" className="section-title">All dishes</h2>
        <div className="section-tools">
          {refreshError && <span className="refresh-err" role="alert">{refreshError}</span>}
          <button
            className="btn-text"
            onClick={refresh}
            disabled={status !== 'ready' || refreshing}
            title="Reload dishes from the server. Your unsaved drafts are kept."
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      <DishList state={state} />
    </main>
  );
}