import { useMemo, useState } from 'react';
import { useAppContext } from '../context/useAppContext';
import { downloadCsv, exportGamesCsv, exportPredictionsCsv } from '../utils/exportCsv';
import '../styles/pages/admin.css';

type ResultDrafts = Record<number, { home: string; away: string }>;
type BatchPredictionDrafts = Record<number, { home: string; away: string }>;

export default function AdminPage() {
  const {
    games,
    predictions,
    updateGame,
    addGame,
    updatePrediction,
    addPrediction,
    deletePrediction,
    resetData,
    setIsAdmin,
  } = useAppContext();

  const [newGameHome, setNewGameHome] = useState('');
  const [newGameAway, setNewGameAway] = useState('');
  const [newGameHomeScore, setNewGameHomeScore] = useState('');
  const [newGameAwayScore, setNewGameAwayScore] = useState('');
  const [resultDrafts, setResultDrafts] = useState<ResultDrafts>({});

  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [newPredName, setNewPredName] = useState('');
  const [newPredHome, setNewPredHome] = useState('');
  const [newPredAway, setNewPredAway] = useState('');
  const [batchPlayer, setBatchPlayer] = useState('');
  const [batchCount, setBatchCount] = useState('4');
  const [batchDraftOverrides, setBatchDraftOverrides] = useState<BatchPredictionDrafts>({});

  const upcomingGames = useMemo(
    () => games.filter((g) => g.homeScore === null).sort((a, b) => a.id - b.id),
    [games],
  );
  const selectedGame = games.find((g) => g.id === selectedGameId);
  const gamePredictions = selectedGameId
    ? predictions.filter((p) => p.gameId === selectedGameId)
    : [];
  const playerNames = useMemo(() => {
    const names = Array.from(new Set(predictions.map((p) => p.name).filter(Boolean)));
    return names.sort((a, b) => a.localeCompare(b));
  }, [predictions]);
  const requestedBatchCount = Math.max(1, parseInt(batchCount, 10) || 1);
  const upcomingBatchGames = useMemo(
    () => upcomingGames.slice(0, requestedBatchCount),
    [upcomingGames, requestedBatchCount],
  );

  const batchDrafts = useMemo(() => {
    if (!batchPlayer || upcomingBatchGames.length === 0) return {};

    const next: BatchPredictionDrafts = {};
    for (const game of upcomingBatchGames) {
      const existing = predictions.find((p) => p.name === batchPlayer && p.gameId === game.id);
      const override = batchDraftOverrides[game.id];
      next[game.id] = {
        home: override?.home ?? (existing ? String(existing.homeScore) : ''),
        away: override?.away ?? (existing ? String(existing.awayScore) : ''),
      };
    }

    return next;
  }, [batchPlayer, upcomingBatchGames, predictions, batchDraftOverrides]);

  const handleAddGame = () => {
    if (!newGameHome.trim() || !newGameAway.trim()) return;
    const homeScore = newGameHomeScore ? parseInt(newGameHomeScore, 10) : null;
    const awayScore = newGameAwayScore ? parseInt(newGameAwayScore, 10) : null;
    addGame({
      home: newGameHome,
      away: newGameAway,
      homeScore,
      awayScore,
    });
    setNewGameHome('');
    setNewGameAway('');
    setNewGameHomeScore('');
    setNewGameAwayScore('');
  };

  const handleUpdateScore = (gameId: number) => {
    const game = games.find((currentGame) => currentGame.id === gameId);
    const draft = resultDrafts[gameId] ?? {
      home: game?.homeScore !== null && game?.homeScore !== undefined ? String(game.homeScore) : '',
      away: game?.awayScore !== null && game?.awayScore !== undefined ? String(game.awayScore) : '',
    };
    const hs = draft.home.trim() !== '' ? parseInt(draft.home, 10) : null;
    const as = draft.away.trim() !== '' ? parseInt(draft.away, 10) : null;
    updateGame(gameId, hs, as);
  };

  const handleResultDraftChange = (gameId: number, side: 'home' | 'away', value: string) => {
    setResultDrafts((prev) => ({
      ...prev,
      [gameId]: {
        ...(prev[gameId] ?? { home: '', away: '' }),
        [side]: value,
      },
    }));
  };

  const handleAddPrediction = () => {
    if (!newPredName.trim() || selectedGameId === null) return;
    const homeScore = parseInt(newPredHome, 10) || 0;
    const awayScore = parseInt(newPredAway, 10) || 0;
    addPrediction({
      name: newPredName,
      gameId: selectedGameId,
      homeScore,
      awayScore,
    });
    setNewPredName('');
    setNewPredHome('');
    setNewPredAway('');
  };

  const handleBatchDraftChange = (gameId: number, side: 'home' | 'away', value: string) => {
    setBatchDraftOverrides((prev) => ({
      ...prev,
      [gameId]: {
        ...(prev[gameId] ?? { home: '', away: '' }),
        [side]: value,
      },
    }));
  };

  const handleSaveBatchPredictions = () => {
    const playerName = batchPlayer.trim();
    if (!playerName || upcomingBatchGames.length === 0) return;

    for (const game of upcomingBatchGames) {
      const draft = batchDrafts[game.id] ?? { home: '', away: '' };
      const homeRaw = draft.home.trim();
      const awayRaw = draft.away.trim();

      if (homeRaw === '' || awayRaw === '') continue;

      const homeScore = parseInt(homeRaw, 10);
      const awayScore = parseInt(awayRaw, 10);
      if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue;

      const existing = predictions.find((p) => p.name === playerName && p.gameId === game.id);
      if (existing) {
        updatePrediction(playerName, game.id, homeScore, awayScore);
      } else {
        addPrediction({ name: playerName, gameId: game.id, homeScore, awayScore });
      }
    }
  };

  const handleExportGames = () => {
    const csv = exportGamesCsv(games);
    downloadCsv(csv, 'games.csv');
  };

  const handleExportPredictions = () => {
    const csv = exportPredictionsCsv(predictions);
    downloadCsv(csv, 'predictions.csv');
  };

  const handleReset = () => {
    if (
      confirm(
        'Are you sure? This will reset all data to the original CSV values and clear localStorage.'
      )
    ) {
      resetData();
    }
  };

  const handleDisableAdmin = () => {
    setIsAdmin(false);
  };

  return (
    <div className="admin-page">
      <h1>Admin Panel</h1>

      <section className="admin-section">
        <h2>Add New Game</h2>
        <div className="form-group">
          <div className="form-row">
            <label>
              Home Team
              <input
                type="text"
                value={newGameHome}
                onChange={(e) => setNewGameHome(e.target.value)}
                placeholder="e.g., Brazil"
              />
            </label>
            <label>
              Away Team
              <input
                type="text"
                value={newGameAway}
                onChange={(e) => setNewGameAway(e.target.value)}
                placeholder="e.g., Germany"
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Home Score (optional)
              <input
                type="number"
                value={newGameHomeScore}
                onChange={(e) => setNewGameHomeScore(e.target.value)}
                placeholder="0"
              />
            </label>
            <label>
              Away Score (optional)
              <input
                type="number"
                value={newGameAwayScore}
                onChange={(e) => setNewGameAwayScore(e.target.value)}
                placeholder="0"
              />
            </label>
          </div>
        </div>
        <button onClick={handleAddGame} className="btn btn-primary">
          Add Game
        </button>
      </section>

      <section className="admin-section">
        <h2>Enter Results ({upcomingGames.length} unplayed games)</h2>
        {upcomingGames.length === 0 ? (
          <p>No upcoming games.</p>
        ) : (
          <div className="results-table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Home</th>
                  <th>Score</th>
                  <th>Away</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {upcomingGames.map((game) => {
                  const draft = resultDrafts[game.id] ?? {
                    home: game.homeScore !== null ? String(game.homeScore) : '',
                    away: game.awayScore !== null ? String(game.awayScore) : '',
                  };
                  return (
                    <tr key={game.id}>
                      <td className="results-game-label">#{game.id}</td>
                      <td>{game.home}</td>
                      <td>
                        <div className="result-score-inputs">
                          <input
                            className="result-input"
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={draft.home}
                            onChange={(e) => handleResultDraftChange(game.id, 'home', e.target.value)}
                            aria-label={`Home score for game ${game.id}`}
                          />
                          <span> - </span>
                          <input
                            className="result-input"
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={draft.away}
                            onChange={(e) => handleResultDraftChange(game.id, 'away', e.target.value)}
                            aria-label={`Away score for game ${game.id}`}
                          />
                        </div>
                      </td>
                      <td>{game.away}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleUpdateScore(game.id)}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Manage Predictions</h2>

        <div className="batch-predictions-shell">
          <h3>Batch by Player (Next X Games)</h3>
          <div className="form-group">
            <div className="form-row">
              <label>
                Player
                <select value={batchPlayer} onChange={(e) => { setBatchPlayer(e.target.value); setBatchDraftOverrides({}); }}>
                  <option value="">Select player</option>
                  {playerNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Next X Games
                <select value={batchCount} onChange={(e) => { setBatchCount(e.target.value); setBatchDraftOverrides({}); }}>
                  {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {batchPlayer.trim() ? (
            upcomingBatchGames.length > 0 ? (
              <div className="batch-table-wrap">
                <table className="batch-table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Fixture</th>
                      <th>Prediction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingBatchGames.map((game) => {
                      const draft = batchDrafts[game.id] ?? { home: '', away: '' };
                      return (
                        <tr key={`batch-${game.id}`}>
                          <td className="results-game-label">#{game.id}</td>
                          <td>{game.home} vs {game.away}</td>
                          <td>
                            <div className="result-score-inputs">
                              <input
                                className="result-input"
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={draft.home}
                                onChange={(e) => handleBatchDraftChange(game.id, 'home', e.target.value)}
                                aria-label={`Batch home score for game ${game.id}`}
                              />
                              <span> - </span>
                              <input
                                className="result-input"
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={draft.away}
                                onChange={(e) => handleBatchDraftChange(game.id, 'away', e.target.value)}
                                aria-label={`Batch away score for game ${game.id}`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="batch-empty">No upcoming games available.</p>
            )
          ) : (
            <p className="batch-empty">Choose a player to edit the next X games in one batch.</p>
          )}

          <div className="button-group">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveBatchPredictions}
              disabled={!batchPlayer.trim() || upcomingBatchGames.length === 0}
            >
              Save Batch Predictions
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>
            Select Game
            <select
              value={selectedGameId || ''}
              onChange={(e) => setSelectedGameId(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">-- Choose a game --</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  Game {g.id}: {g.home} vs {g.away}
                  {g.homeScore !== null && ` (${g.homeScore}-${g.awayScore})`}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedGame && (
          <>
            <h3>
              Predictions for Game {selectedGame.id}: {selectedGame.home} vs {selectedGame.away}
            </h3>
            <div className="predictions-list">
              {gamePredictions.length === 0 ? (
                <p>No predictions for this game.</p>
              ) : (
                <table className="predictions-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Score</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gamePredictions.map((pred) => (
                      <tr key={`${pred.name}-${pred.gameId}`}>
                        <td>{pred.name}</td>
                        <td>
                          <input
                            type="number"
                            value={pred.homeScore}
                            onChange={(e) => {
                              updatePrediction(
                                pred.name,
                                pred.gameId,
                                parseInt(e.target.value, 10) || 0,
                                pred.awayScore,
                              );
                            }}
                          />
                          <span className="prediction-score-sep">vs</span>
                          <input
                            type="number"
                            value={pred.awayScore}
                            onChange={(e) => {
                              updatePrediction(
                                pred.name,
                                pred.gameId,
                                pred.homeScore,
                                parseInt(e.target.value, 10) || 0,
                              );
                            }}
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => deletePrediction(pred.name, pred.gameId)}
                            className="btn btn-sm btn-danger"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="form-group">
              <h4>Add Prediction</h4>
              <div className="form-row">
                <label>
                  Player Name
                  <input
                    type="text"
                    value={newPredName}
                    onChange={(e) => setNewPredName(e.target.value)}
                    placeholder="Player name"
                  />
                </label>
                <label>
                  Home Score
                  <input
                    type="number"
                    value={newPredHome}
                    onChange={(e) => setNewPredHome(e.target.value)}
                    placeholder="0"
                  />
                </label>
              </div>
              <div className="form-row form-row-single">
                <label>
                  Away Score
                  <input
                    type="number"
                    value={newPredAway}
                    onChange={(e) => setNewPredAway(e.target.value)}
                    placeholder="0"
                  />
                </label>
              </div>
              <button onClick={handleAddPrediction} className="btn btn-primary">
                Add Prediction
              </button>
            </div>
          </>
        )}
      </section>

      <section className="admin-section">
        <h2>Data Management</h2>
        <div className="button-group">
          <button onClick={handleDisableAdmin} className="btn btn-secondary">
            Disable Admin Mode
          </button>
          <button onClick={handleExportGames} className="btn btn-secondary">
            Export Games CSV
          </button>
          <button onClick={handleExportPredictions} className="btn btn-secondary">
            Export Predictions CSV
          </button>
          <button onClick={handleReset} className="btn btn-danger">
            Reset to Original
          </button>
        </div>
        <p className="info-text">
          <strong>Note:</strong> Changes are automatically saved to your browser local storage. Export CSVs to
          commit changes back to the repository.
        </p>
      </section>
    </div>
  );
}
