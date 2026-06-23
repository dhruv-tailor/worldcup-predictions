import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { Game, PlayerScore, ScoringSystem } from '../types';
import { useAppContext } from '../context/useAppContext';
import { getFlag, getGameLabel } from '../utils/flags';
import { createBarcodePattern } from '../utils/barcode';

interface GameCardProps {
  game: Game;
  games: Game[];
  standings: PlayerScore[];
  system: ScoringSystem;
}

function ticketRef(name: string, gameId: number) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? 'X')
    .join('');
  const suffix = String((name.length * 137 + gameId * 97) % 10000).padStart(4, '0');
  return `${initials}${String(gameId).padStart(3, '0')}-${suffix}`;
}

function pickWinner(home: number, away: number): 'home' | 'away' | 'draw' {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

function ticketExtras(name: string, gameId: number) {
  const gate = String.fromCharCode(65 + ((gameId + name.length) % 6));
  const batch = `Batch ${(name.length * 31 + gameId * 17) % 900 + 100}`;
  return { gate: `Gate ${gate}`, batch };
}

export default function GameCard({ game, games, standings, system }: GameCardProps) {
  const { updateGame, isAdmin } = useAppContext();
  const ticketRefs = useRef<Record<string, HTMLElement | null>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editHome, setEditHome] = useState(game.homeScore?.toString() || '');
  const [editAway, setEditAway] = useState(game.awayScore?.toString() || '');
  const isPlayed = game.homeScore !== null && game.awayScore !== null;
  const isHomeWinner = isPlayed && game.homeScore! > game.awayScore!;
  const isAwayWinner = isPlayed && game.awayScore! > game.homeScore!;
  const playedGames = games.filter((g) => g.homeScore !== null).sort((a, b) => a.id - b.id);
  const currentIdx = playedGames.findIndex((g) => g.id === game.id);
  const prevGame = currentIdx > 0 ? playedGames[currentIdx - 1] : null;
  const nextGame = currentIdx < playedGames.length - 1 ? playedGames[currentIdx + 1] : null;

  // Gather all predictions for this game, sorted by points (desc)
  const predictions = standings
    .map((player) => {
      const breakdown = player.gameBreakdowns.find((gb) => gb.gameId === game.id);
      return breakdown ? { name: player.name, ...breakdown } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.points.total - a!.points.total);

  const handlePrintTicket = useCallback(async (key: string, playerName: string) => {
    const target = ticketRefs.current[key];
    if (!target) return;

    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(target, { backgroundColor: '#f5f1e7', pixelRatio: 4 });
    const safeName = playerName.toLowerCase().replace(/\s+/g, '-');
    const link = document.createElement('a');
    link.download = `print-ticket-match-${game.id}-${safeName}.png`;
    link.href = dataUrl;
    link.click();
  }, [game.id]);

  return (
    <div className="game-card">
      <div className="game-card-header">
        <div className="game-card-nav">
          <Link to="/" className="back-btn">← Back</Link>
          <div className="game-card-nav-spacer" />
          {prevGame ? (
            <Link to={`/game/${prevGame.id}`} className="nav-btn" aria-label="Previous game">← Prev</Link>
          ) : (
            <span className="nav-btn disabled" aria-disabled="true">← Prev</span>
          )}
          {nextGame ? (
            <Link to={`/game/${nextGame.id}`} className="nav-btn" aria-label="Next game">Next →</Link>
          ) : (
            <span className="nav-btn disabled" aria-disabled="true">Next →</span>
          )}
        </div>
        <h2>
          {getGameLabel(game)}
        </h2>
        <div className="game-card-fixture ticket-fixture">
          <span className="ticket-fixture-team">{game.home} {getFlag(game.home)}</span>
          <span className="ticket-fixture-vs">vs</span>
          <span className="ticket-fixture-team">{getFlag(game.away)} {game.away}</span>
        </div>
        {isPlayed ? (
          <div className="actual-score final-scoreline">
            <span className={`final-team ${isHomeWinner ? 'winner-team' : ''}`}>
              {game.home} {game.homeScore}{isHomeWinner ? ' 🏆' : ''}
            </span>
            <span className="final-sep"> – </span>
            <span className={`final-team ${isAwayWinner ? 'winner-team' : ''}`}>
              {isAwayWinner ? '🏆 ' : ''}{game.awayScore} {game.away}
            </span>
            {isAdmin && (
              <button
                className="game-card-edit-btn"
                onClick={() => {
                  setIsEditing(true);
                  setEditHome(game.homeScore?.toString() || '');
                  setEditAway(game.awayScore?.toString() || '');
                }}
              >
                Edit
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="actual-score pending">Not yet played</div>
            {isAdmin && (
              <>
                {isEditing ? (
                  <div className="game-card-score-editor">
                    <input
                      type="number"
                      value={editHome}
                      onChange={(e) => setEditHome(e.target.value)}
                      placeholder="Home"
                      min="0"
                    />
                    <span>vs</span>
                    <input
                      type="number"
                      value={editAway}
                      onChange={(e) => setEditAway(e.target.value)}
                      placeholder="Away"
                      min="0"
                    />
                    <button
                      className="btn-save"
                      onClick={() => {
                        const hs = editHome ? parseInt(editHome) : null;
                        const as = editAway ? parseInt(editAway) : null;
                        updateGame(game.id, hs, as);
                        setIsEditing(false);
                      }}
                    >
                      Save
                    </button>
                    <button className="btn-cancel" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="game-card-enter-result-btn"
                    onClick={() => setIsEditing(true)}
                  >
                    Enter Result
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div className="prediction-ticket-list">
        {predictions.map((p) => {
          const ticketKey = `${game.id}-${p!.name}`;
          const extras = ticketExtras(p!.name, game.id);
          const predictedWinner = pickWinner(p!.prediction.homeScore, p!.prediction.awayScore);
          const actualWinner = isPlayed ? pickWinner(game.homeScore!, game.awayScore!) : null;
          const isOutcomeHit = isPlayed && predictedWinner === actualWinner;
          const isExact =
            isPlayed &&
            p!.prediction.homeScore === game.homeScore &&
            p!.prediction.awayScore === game.awayScore;

          return (
            <article
              key={p!.name}
              className={`prediction-ticket ticket-shell ${isExact ? 'ticket-exact' : ''} ${isPlayed ? (isOutcomeHit ? 'ticket-hit' : 'ticket-miss') : ''}`}
              ref={(el) => {
                ticketRefs.current[ticketKey] = el;
              }}
              style={{ ['--barcode-pattern' as string]: createBarcodePattern(`${game.id}:${game.home}:${game.away}`, { variant: 'detail' }) }}
            >
              <span className="ticket-corner-fold" aria-hidden="true" />
              <div className="ticket-top-band">
                <span className="ticket-event">OFFICIAL MATCH PREDICTION TICKET</span>
                <span className="ticket-serial">REF {ticketRef(p!.name, game.id)}</span>
              </div>

              <div className="prediction-ticket-head">
                <div>
                  <p className="prediction-ticket-kicker">Holder</p>
                  <h4>{p!.name}</h4>
                </div>
                <div className="prediction-ticket-meta">
                  <span>Match {game.id}</span>
                  <span>{system.name}</span>
                </div>
              </div>

              <div className="ticket-chip-row">
                <span className="ticket-chip">{extras.gate}</span>
              </div>

              <div className="prediction-ticket-score-row">
                <span className="ticket-fixture">{game.home} vs {game.away}</span>
                <span className="prediction-ticket-score">{p!.prediction.homeScore} – {p!.prediction.awayScore}</span>
                {isExact && <span className="exact-hit-badge">🎯 EXACT!</span>}
                {isPlayed && !isExact && (
                  <span className={`ticket-status-stamp ${isOutcomeHit ? 'ticket-status-hit' : 'ticket-status-miss'}`}>
                    {isOutcomeHit ? 'Winning Pick' : 'Miss'}
                  </span>
                )}
              </div>

              {isPlayed && (
                <>
                  <div className="ticket-perf" aria-hidden="true" />
                  <div className="prediction-ticket-points">
                    {system.categoryLabels.map((cat) => {
                      const val = p!.points.categories[cat.key] ?? 0;
                      return (
                        <div key={cat.key} className="ticket-points-cell">
                          <span className="ticket-points-label">{cat.label}</span>
                          <span className={val > 0 ? 'pts-good' : 'pts-zero'}>{val > 0 ? `+${val}` : '0'}</span>
                        </div>
                      );
                    })}
                    <div className="ticket-points-total">
                      <span>Total</span>
                      <strong className={pointsClass(p!.points.total, system.maxPerGame)}>{p!.points.total}</strong>
                    </div>
                  </div>
                </>
              )}

              <div className="ticket-footer-note">
                <span>{isPlayed ? 'Entry Pass' : 'Entry Pass'}</span>
                {isPlayed && isExact && <span className="ticket-status-stamp ticket-status-hit">Top Hit</span>}
                <button
                  className="ticket-print-btn"
                  type="button"
                  onClick={() => handlePrintTicket(ticketKey, p!.name)}
                  aria-label={`Print ticket for ${p!.name}`}
                >
                  Print Ticket
                </button>
                <span className="ticket-barcode" aria-hidden="true" />
              </div>
              <div className="ticket-audit-row">
                <span>Issuer: Prediction Office</span>
                <span>{extras.batch}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Maps a point value to a CSS class for color-coding.
 * @see Leaderboard's pointsClass for identical logic
 */
function pointsClass(points: number, max?: number): string {
  const m = max ?? 4;
  if (points >= m) return 'pts-perfect';
  if (points >= m * 0.75) return 'pts-great';
  if (points >= m * 0.5) return 'pts-good';
  if (points >= 1) return 'pts-ok';
  return 'pts-zero';
}
