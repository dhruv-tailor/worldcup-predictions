import { useMemo } from 'react';
import { useAppContext } from '../context/useAppContext';
import Leaderboard from '../components/Leaderboard';
import ScoreChart from '../components/ScoreChart';

interface DashStats {
  leader: { name: string; points: number } | null;
  gapTo2nd: number;
  lastGameMVP: { name: string; delta: number } | null;
  hotStreak: number;
  gamesRemaining: number;
  totalGames: number;
  playedGames: number;
}

export default function DashboardPage() {
  const { standings, games, selectedSystem } = useAppContext();

  const stats = useMemo((): DashStats => {
    const playedGames = games.filter((g) => g.homeScore !== null);
    const gamesRemaining = games.filter((g) => g.homeScore === null).length;

    const leader = standings.length > 0 ? standings[0] : null;
    const gapTo2nd =
      standings.length > 1
        ? Math.max(0, standings[0].totalPoints - standings[1].totalPoints)
        : 0;

    let lastGameMVP: { name: string; delta: number } | null = null;
    if (playedGames.length > 0) {
      const lastGameId = playedGames[playedGames.length - 1].id;
      for (const player of standings) {
        const breakdown = player.gameBreakdowns.find((gb) => gb.gameId === lastGameId);
        if (breakdown && breakdown.points.total) {
          if (!lastGameMVP || breakdown.points.total > lastGameMVP.delta) {
            lastGameMVP = { name: player.name, delta: breakdown.points.total };
          }
        }
      }
    }

    const hotStreak = Math.max(...standings.map((p) => p.currentStreak ?? 0), 0);

    return {
      leader: leader ? { name: leader.name, points: leader.totalPoints } : null,
      gapTo2nd,
      lastGameMVP,
      hotStreak,
      gamesRemaining,
      totalGames: games.length,
      playedGames: playedGames.length,
    };
  }, [standings, games]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">{selectedSystem.name}</h1>
          <p className="dashboard-subtitle">
            Game {stats.playedGames} of {stats.totalGames} · Leader: {stats.leader?.name || '—'}
          </p>
        </div>
        <span className="live-badge">● LIVE</span>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">🏆 Leader</div>
          <div className="stat-value">
            {stats.leader?.name} <span className="stat-points">{stats.leader?.points}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📏 Gap to 2nd</div>
          <div className="stat-value">
            <span className="stat-points">{stats.gapTo2nd}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📈 Last Game MVP</div>
          <div className="stat-value">
            {stats.lastGameMVP ? (
              <>
                {stats.lastGameMVP.name} <span className="stat-points">+{stats.lastGameMVP.delta}</span>
              </>
            ) : (
              '—'
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🔥 Streak</div>
          <div className="stat-value">
            <span className="stat-points">{stats.hotStreak}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">⚽ Remaining</div>
          <div className="stat-value">
            <span className="stat-points">{stats.gamesRemaining}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <Leaderboard standings={standings} games={games} system={selectedSystem} />
      </div>

      <div className="dashboard-section">
        <ScoreChart standings={standings} games={games} system={selectedSystem} />
      </div>
    </div>
  );
}
