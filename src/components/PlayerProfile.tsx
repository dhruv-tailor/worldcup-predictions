import { Link } from 'react-router';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { Game, PlayerScore, Prediction, ScoringSystem } from '../types';
import { getCrossSystemRanks, getPlayerAccuracy, getPlayerGameHistory } from '../utils/playerStats';
import { getGameLabelShort } from '../utils/flags';

interface PlayerProfileProps {
  player: PlayerScore;
  games: Game[];
  predictions: Prediction[];
  selectedSystem: ScoringSystem;
  systems: ScoringSystem[];
}

export default function PlayerProfile({
  player,
  games,
  predictions,
  selectedSystem,
  systems,
}: PlayerProfileProps) {
  const accuracy = getPlayerAccuracy(player, games);
  const history = getPlayerGameHistory(player, games);
  const crossSystem = getCrossSystemRanks(player.name, games, predictions, systems);
  const rank = selectedSystem.calculateStandings(games, predictions).findIndex((p) => p.name === player.name) + 1;
  const rankLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  const initials = player.name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const chartData = history.map((item, idx) => {
    const prev = idx > 0 ? history.slice(0, idx).reduce((sum, g) => sum + g.totalPoints, 0) : 0;
    return {
      game: getGameLabelShort({ id: item.gameId, home: item.home, away: item.away, homeScore: item.actualHome, awayScore: item.actualAway }),
      cumulative: prev + item.totalPoints,
    };
  });

  return (
    <div className="player-page">
      <section className="player-header">
        <div className="player-identity">
          <div className="player-avatar" aria-hidden="true">{initials}</div>
          <div>
            <h2>{player.name}</h2>
            <p>Current System: {selectedSystem.name}</p>
            <p className="player-badges">{rankLabel} {player.bestSystem ? `• 🏆 Best in ${player.bestSystem}` : ''}</p>
          </div>
        </div>
      </section>

      <section className="player-section player-metrics-grid">
        <div className="metric-card"><div className="label">Rank</div><div className="value">#{rank}</div></div>
        <div className="metric-card"><div className="label">Total Points</div><div className="value">{player.totalPoints}</div></div>
        <div className="metric-card"><div className="label">Winner %</div><div className="value">{accuracy.winnerPct}%</div></div>
        <div className="metric-card"><div className="label">Exact %</div><div className="value">{accuracy.exactPct}%</div></div>
        <div className="metric-card"><div className="label">Avg Error</div><div className="value">{accuracy.avgError}</div></div>
        <div className="metric-card"><div className="label">Predictions</div><div className="value">{accuracy.playedPredictions}</div></div>
      </section>

      <section className="player-section">
        <h3>Cross-System Rankings</h3>
        <div className="leaderboard">
          <table>
            <thead>
              <tr>
                <th>System</th>
                <th>Rank</th>
                <th>Total</th>
                <th>Key Stat</th>
              </tr>
            </thead>
            <tbody>
              {crossSystem.map((row) => (
                <tr key={row.systemName}>
                  <td className="name-col">{row.systemName}</td>
                  <td>{row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}</td>
                  <td>{row.totalPoints}</td>
                  <td>{row.keyStat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="player-section">
        <h3>Performance Trend</h3>
        {chartData.length > 0 ? (
          <div className="score-chart">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="game" tick={{ fontSize: 11, fill: 'var(--text)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text)' }} />
                <Tooltip />
                <Line type="monotone" dataKey="cumulative" stroke="var(--accent)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="score-chart empty">No played games for this player yet</div>
        )}
      </section>

      <section className="player-section">
        <h3>Game-by-Game History</h3>
        <div className="leaderboard">
          <table>
            <thead>
              <tr>
                <th>Game</th>
                <th>Prediction</th>
                <th>Actual</th>
                <th>Points</th>
                <th>Error</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.gameId}>
                  <td className="name-col">{item.home} vs {item.away}</td>
                  <td>{item.predictedHome}-{item.predictedAway}</td>
                  <td>{item.actualHome}-{item.actualAway}</td>
                  <td className={item.totalPoints > 0 ? 'pts-good' : 'pts-zero'}>{item.totalPoints}</td>
                  <td>{item.error}</td>
                  <td>
                    <Link to={`/game/${item.gameId}`} className="inline-link">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
