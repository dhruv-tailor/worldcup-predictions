import { useState } from 'react';
import type { Game, Prediction } from '../types';
import { getFlag, getGameLabel } from '../utils/flags';

interface UpcomingGamesProps {
  games: Game[];
  predictions: Prediction[];
}

/**
 * Preview section showing player predictions for the next set of unplayed games.
 *
 * "Next set" = all unplayed games that have at least one prediction submitted.
 * Each game is rendered as a mini card with every player's predicted score.
 */
export default function UpcomingGames({ games, predictions }: UpcomingGamesProps) {
  const [showAll, setShowAll] = useState(false);

  // Find unplayed games that have predictions
  const upcomingGames = games
    .filter((g) => g.homeScore === null)
    .filter((g) => predictions.some((p) => p.gameId === g.id))
    .sort((a, b) => a.id - b.id);

  if (upcomingGames.length === 0) return null;

  const displayGames = showAll ? upcomingGames : upcomingGames.slice(0, 4);

  // Group predictions by game for quick lookup
  const predsByGame = new Map<number, Prediction[]>();
  for (const p of predictions) {
    const list = predsByGame.get(p.gameId) ?? [];
    list.push(p);
    predsByGame.set(p.gameId, list);
  }

  return (
    <div className="upcoming-games">
      <div className="upcoming-header">
        <h3>🔮 Upcoming Predictions</h3>
        {upcomingGames.length > 4 && (
          <select
            className="upcoming-filter-select"
            value={showAll ? 'all' : 'next4'}
            onChange={(e) => setShowAll(e.target.value === 'all')}
            aria-label="Filter upcoming games"
          >
            <option value="next4">Next 4 Games</option>
            <option value="all">All ({upcomingGames.length})</option>
          </select>
        )}
      </div>
      <div className="upcoming-grid">
        {displayGames.map((game) => {
          const gamePreds = (predsByGame.get(game.id) ?? []).sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          const homeWins = gamePreds.filter((p) => p.homeScore > p.awayScore);
          const draws = gamePreds.filter((p) => p.homeScore === p.awayScore);
          const awayWins = gamePreds.filter((p) => p.awayScore > p.homeScore);
          return (
            <div key={game.id} className="upcoming-card">
              <div className="upcoming-card-header">
                {getGameLabel(game)}
              </div>
              <div className="upcoming-card-teams">
                {game.home} vs {game.away}
              </div>
              <div className="upcoming-columns">
                <div className="upcoming-col">
                  <div className="upcoming-col-header">{getFlag(game.home)} Win</div>
                  {homeWins.length > 0 ? homeWins.map((p) => (
                    <div key={p.name} className="upcoming-pred">
                      <span className="upcoming-player">{p.name}</span>
                      <span className="upcoming-score">{p.homeScore}–{p.awayScore}</span>
                    </div>
                  )) : <div className="upcoming-empty">—</div>}
                </div>
                <div className="upcoming-col">
                  <div className="upcoming-col-header">🤝 Draw</div>
                  {draws.length > 0 ? draws.map((p) => (
                    <div key={p.name} className="upcoming-pred">
                      <span className="upcoming-player">{p.name}</span>
                      <span className="upcoming-score">{p.homeScore}–{p.awayScore}</span>
                    </div>
                  )) : <div className="upcoming-empty">—</div>}
                </div>
                <div className="upcoming-col">
                  <div className="upcoming-col-header">{getFlag(game.away)} Win</div>
                  {awayWins.length > 0 ? awayWins.map((p) => (
                    <div key={p.name} className="upcoming-pred">
                      <span className="upcoming-player">{p.name}</span>
                      <span className="upcoming-score">{p.homeScore}–{p.awayScore}</span>
                    </div>
                  )) : <div className="upcoming-empty">—</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
