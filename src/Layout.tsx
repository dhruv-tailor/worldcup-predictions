import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAppContext } from './context/useAppContext';
import { scoringSystems } from './utils/scoring';
import ScoringSelector from './components/ScoringSelector';
import './styles/index.css';

export default function Layout() {
  const location = useLocation();
  const { games, standings, theme, setTheme, selectedSystem, setSelectedSystem } = useAppContext();
  const playedCount = games.filter((g) => g.homeScore !== null).length;
  const playedPct = games.length > 0 ? Math.round((playedCount / games.length) * 100) : 0;
  const firstPlayer = standings[0]?.name;
  const currentLeader = standings[0];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">⚽ World Cup Predictions 🏆</h1>
          <p className="sidebar-subtitle">
            {playedCount} of {games.length} games played
          </p>
          <div className="sidebar-progress" role="progressbar" aria-valuenow={playedPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="sidebar-progress-bar" style={{ width: `${playedPct}%` }} />
          </div>
          <p className="sidebar-progress-label">{playedPct}% complete</p>
          {currentLeader && (
            <p className="sidebar-leader">👑 Leader: {currentLeader.name}</p>
          )}
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/breakdown" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            🏅 All Systems
          </NavLink>
          <NavLink to="/upcoming" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            🔮 Upcoming
          </NavLink>
          {firstPlayer && (
            <NavLink
              to="/players"
              className={({ isActive }) =>
                isActive || location.pathname.startsWith('/player/') || location.pathname.startsWith('/players')
                  ? 'nav-link active'
                  : 'nav-link'
              }
            >
              👤 Players
            </NavLink>
          )}
        </nav>

        <div className="sidebar-scoring">
          <ScoringSelector
            systems={scoringSystems}
            selected={selectedSystem}
            onSelect={setSelectedSystem}
          />
        </div>

        <div className="sidebar-footer">
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Suspense fallback={<div className="route-loading" role="status" aria-live="polite">Loading page…</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
