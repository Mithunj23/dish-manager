import React, { useState, useEffect, useMemo } from 'react';
import { useDishes } from './useDishes';
import DishCard from './components/DishCard';
import { ToastProvider, toast } from './components/Toast';
import './App.css';

export default function App() {
  const { dishes, loading, toggling, wsStatus, lastChange, toggleDish } = useDishes();
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');   // all | published | unpublished
  const [view,    setView]    = useState('grid');   // grid | list

  // ── Toast on every change ─────────────────────────────────────────────────
  useEffect(() => {
    if (!lastChange) return;
    if (lastChange.source === 'backend') {
      toast.sync(`Backend changed "${lastChange.dishName}" → ${lastChange.isPublished ? 'Live' : 'Draft'}`);
    } else {
      lastChange.isPublished
        ? toast.pub(`"${lastChange.dishName}" is now Live`)
        : toast.unpub(`"${lastChange.dishName}" set to Draft`);
    }
  }, [lastChange]);

  // ── Derived counts ────────────────────────────────────────────────────────
  const published   = dishes.filter(d => d.isPublished).length;
  const unpublished = dishes.length - published;

  // ── Filtered dishes ───────────────────────────────────────────────────────
  const visible = useMemo(() => dishes.filter(d => {
    if (filter === 'published'   && !d.isPublished) return false;
    if (filter === 'unpublished' &&  d.isPublished) return false;
    if (search && !d.dishName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [dishes, filter, search]);

  const wsLabel = { live: 'Live', connecting: 'Connecting', reconnecting: 'Reconnecting…' };

  return (
    <>
      <ToastProvider />

      <div className="layout">
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-mark">DM</div>
            <div>
              <div className="brand-name">Dish Manager</div>
              <div className="brand-sub">Admin dashboard</div>
            </div>
          </div>

          <nav className="nav">
            <div className="nav-label">Filters</div>
            {[
              { key: 'all',         label: 'All dishes',   count: dishes.length },
              { key: 'published',   label: 'Live',         count: published },
              { key: 'unpublished', label: 'Draft',        count: unpublished },
            ].map(f => (
              <button
                key={f.key}
                className={`nav-item ${filter === f.key ? 'nav-item--active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                <span>{f.label}</span>
                <span className="nav-count">{f.count}</span>
              </button>
            ))}
          </nav>

          <div className="ws-status">
            <span className={`ws-dot ws-dot--${wsStatus}`} />
            <span className="ws-label">{wsLabel[wsStatus] || wsStatus}</span>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────────────────── */}
        <main className="main">
          {/* Header */}
          <header className="topbar">
            <div className="topbar-left">
              <h1 className="page-title">
                {filter === 'all' ? 'All Dishes' : filter === 'published' ? 'Live Dishes' : 'Draft Dishes'}
              </h1>
              <span className="page-count">{visible.length} {visible.length === 1 ? 'dish' : 'dishes'}</span>
            </div>

            <div className="topbar-right">
              {/* Search */}
              <div className="search-box">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search dishes…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="search-input"
                />
                {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
              </div>

              {/* View toggle */}
              <div className="view-toggle">
                <button className={`view-btn ${view === 'grid' ? 'view-btn--active' : ''}`} onClick={() => setView('grid')} title="Grid view">
                  <GridIcon />
                </button>
                <button className={`view-btn ${view === 'list' ? 'view-btn--active' : ''}`} onClick={() => setView('list')} title="List view">
                  <ListIcon />
                </button>
              </div>
            </div>
          </header>

          {/* Stats strip */}
          <div className="stats-strip">
            <Stat label="Total" value={dishes.length} />
            <Stat label="Live"  value={published}   color="green" />
            <Stat label="Draft" value={unpublished} color="red" />
          </div>

          {/* Content */}
          <div className="content">
            {loading ? (
              <div className="state-center">
                <div className="big-spinner" />
                <p>Loading dishes…</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="state-center">
                <div style={{ fontSize: 40 }}>🍽</div>
                <p>No dishes found</p>
                {search && <button className="clear-btn" onClick={() => setSearch('')}>Clear search</button>}
              </div>
            ) : view === 'grid' ? (
              <div className="dish-grid">
                {visible.map(dish => (
                  <DishCard
                    key={dish.dishId}
                    dish={dish}
                    isToggling={toggling.has(dish.dishId)}
                    onToggle={toggleDish}
                  />
                ))}
              </div>
            ) : (
              <div className="dish-list">
                {visible.map(dish => (
                  <ListRow
                    key={dish.dishId}
                    dish={dish}
                    isToggling={toggling.has(dish.dishId)}
                    onToggle={toggleDish}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

/* ── List row ──────────────────────────────────────────────────────────────── */
function ListRow({ dish, isToggling, onToggle }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className={`list-row ${dish.isPublished ? '' : 'list-row--draft'}`}>
      {!imgErr
        ? <img src={dish.imageUrl} alt={dish.dishName} className="list-thumb" onError={() => setImgErr(true)} />
        : <div className="list-thumb list-thumb--ph">🍽</div>
      }
      <div className="list-info">
        <span className="list-name">{dish.dishName}</span>
        <code className="list-id">{dish.dishId}</code>
      </div>
      <span className={`pill ${dish.isPublished ? 'pill--live' : 'pill--draft'}`}>
        <span className="pill-dot" />
        {dish.isPublished ? 'Live' : 'Draft'}
      </span>
      <button
        className={`list-toggle ${dish.isPublished ? 'list-toggle--unpublish' : 'list-toggle--publish'} ${isToggling ? 'list-toggle--loading' : ''}`}
        onClick={() => onToggle(dish.dishId)}
        disabled={isToggling}
      >
        {isToggling ? 'Updating…' : dish.isPublished ? 'Unpublish' : 'Publish'}
      </button>
    </div>
  );
}

/* ── Stat chip ─────────────────────────────────────────────────────────────── */
function Stat({ label, value, color }) {
  return (
    <div className={`stat ${color ? `stat--${color}` : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────────── */
function SearchIcon() {
  return <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function GridIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
}
function ListIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}
