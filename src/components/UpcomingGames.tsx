import { useCallback, useRef, useState } from 'react';
import type { Game, Prediction } from '../types';
import { getFlag } from '../utils/flags';

interface UpcomingGamesProps {
  games: Game[];
  predictions: Prediction[];
}

const GATES = ['A', 'B', 'C', 'D', 'E', 'F'];
const ZONES = ['North', 'South', 'East', 'West', 'Club'];

function ticketMeta(gameId: number) {
  const gate = `Gate ${GATES[gameId % GATES.length]}`;
  const zone = `${ZONES[(gameId * 3) % ZONES.length]} ${100 + ((gameId * 7) % 90)}`;
  const serial = `WC26-${String(gameId).padStart(3, '0')}-${String((gameId * 947) % 10000).padStart(4, '0')}`;
  const batch = `Batch ${(gameId * 29) % 900 + 100}`;
  return { gate, zone, serial, batch };
}

/**
 * Preview section showing player predictions for the next set of unplayed games.
 *
 * "Next set" = all unplayed games that have at least one prediction submitted.
 * Each game is rendered as a mini card with every player's predicted score.
 */
export default function UpcomingGames({ games, predictions }: UpcomingGamesProps) {
  const [showAll, setShowAll] = useState(false);
  const ticketRefs = useRef<Record<number, HTMLElement | null>>({});

  const handlePrintTicket = useCallback(async (game: Game) => {
    const target = ticketRefs.current[game.id];
    if (!target) return;

    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(target, { backgroundColor: '#f5f1e7', pixelRatio: 3 });
    const link = document.createElement('a');
    link.download = `print-ticket-match-${game.id}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

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
          const meta = ticketMeta(game.id);
          const homeWins = gamePreds.filter((p) => p.homeScore > p.awayScore);
          const draws = gamePreds.filter((p) => p.homeScore === p.awayScore);
          const awayWins = gamePreds.filter((p) => p.awayScore > p.homeScore);
          return (
            <article
              key={game.id}
              className="upcoming-card ticket-shell"
              ref={(el) => {
                ticketRefs.current[game.id] = el;
              }}
            >
              <span className="ticket-corner-fold" aria-hidden="true" />
              <div className="ticket-top-band">
                <span className="ticket-event">FIFA WORLD CUP ADMIT ONE</span>
                <span className="ticket-serial">{meta.serial}</span>
              </div>

              <div className="upcoming-card-header ticket-title ticket-fixture">
                <span className="ticket-fixture-team">{game.home} {getFlag(game.home)}</span>
                <span className="ticket-fixture-vs">vs</span>
                <span className="ticket-fixture-team">{getFlag(game.away)} {game.away}</span>
              </div>
              <div className="ticket-meta-row">
                <span>{meta.gate}</span>
                <span>{meta.zone}</span>
                <span>Match {game.id}</span>
              </div>
              <div className="ticket-perf" aria-hidden="true" />
              <div className="upcoming-columns ticket-columns">
                <div className="upcoming-col">
                  <div className="upcoming-col-header">{getFlag(game.home)} Win</div>
                  {homeWins.length > 0 ? homeWins.map((p) => (
                    <div key={p.name} className="upcoming-pred ticket-line-item">
                      <span className="upcoming-player-wrap">
                        <span className="upcoming-player">{p.name}</span>
                      </span>
                      <span className="upcoming-score">{p.homeScore}–{p.awayScore}</span>
                    </div>
                  )) : <div className="upcoming-empty">—</div>}
                </div>
                <div className="upcoming-col">
                  <div className="upcoming-col-header">🤝 Draw</div>
                  {draws.length > 0 ? draws.map((p) => (
                    <div key={p.name} className="upcoming-pred ticket-line-item">
                      <span className="upcoming-player-wrap">
                        <span className="upcoming-player">{p.name}</span>
                      </span>
                      <span className="upcoming-score">{p.homeScore}–{p.awayScore}</span>
                    </div>
                  )) : <div className="upcoming-empty">—</div>}
                </div>
                <div className="upcoming-col">
                  <div className="upcoming-col-header">{getFlag(game.away)} Win</div>
                  {awayWins.length > 0 ? awayWins.map((p) => (
                    <div key={p.name} className="upcoming-pred ticket-line-item">
                      <span className="upcoming-player-wrap">
                        <span className="upcoming-player">{p.name}</span>
                      </span>
                      <span className="upcoming-score">{p.homeScore}–{p.awayScore}</span>
                    </div>
                  )) : <div className="upcoming-empty">—</div>}
                </div>
              </div>
              <div className="ticket-footer-note">
                <span>Prediction Boarding Pass</span>
                <button
                  className="ticket-print-btn"
                  type="button"
                  onClick={() => handlePrintTicket(game)}
                  aria-label={`Print ticket for match ${game.id}`}
                >
                  Print Ticket
                </button>
                <span className="ticket-barcode" aria-hidden="true" />
              </div>
              <div className="ticket-audit-row">
                <span>Issued by Prediction Office</span>
                <span>{meta.batch}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
