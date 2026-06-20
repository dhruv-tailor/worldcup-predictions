import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { Game, Prediction } from '../types';
import { getGameLabelShort } from '../utils/flags';
import { scoringSystems } from '../utils/scoring';

interface LeaderboardControlChartProps {
  games: Game[];
  predictions: Prediction[];
}

interface EraSegment {
  label: string;
  startGameId: number;
  endGameId: number;
  type: 'stable' | 'chaotic';
  playerName?: string;
  isGoldenAge?: boolean;
}

const COLORS = [
  '#c23b22', '#2e8b57', '#8a6b00', '#6b4226', '#1a3a5c',
  '#8fbc8f', '#cc5500', '#8b4513', '#7b2d8b', '#191970',
  '#8c5b2a', '#2f4f4f',
];

export default function LeaderboardControlChart({ games, predictions }: LeaderboardControlChartProps) {
  const [hiddenPlayers, setHiddenPlayers] = useState<Set<string>>(new Set());
  const initializedDefaultVisibility = useRef(false);

  const { chartData, playerNames, eras } = useMemo(() => {
    const playedGames = games
      .filter((game) => game.homeScore !== null && game.awayScore !== null)
      .sort((a, b) => a.id - b.id);

    const names = Array.from(new Set(predictions.map((prediction) => prediction.name))).sort((a, b) =>
      a.localeCompare(b),
    );

    const data: Record<string, string | number>[] = [];
    const includedGameIds = new Set<number>();

    for (const game of playedGames) {
      includedGameIds.add(game.id);

      const gamesAtStep = games.map((currentGame) => {
        if (currentGame.homeScore === null || currentGame.awayScore === null) {
          return currentGame;
        }

        if (includedGameIds.has(currentGame.id)) {
          return currentGame;
        }

        return {
          ...currentGame,
          homeScore: null,
          awayScore: null,
        };
      });

      const controlCountByPlayer = new Map<string, number>(names.map((name) => [name, 0]));

      for (const system of scoringSystems) {
        const standings = system.calculateStandings(gamesAtStep, predictions);
        if (standings.length === 0) continue;

        const topPoints = standings[0].totalPoints;
        const leaders = standings.filter((player) => player.totalPoints === topPoints);

        for (const leader of leaders) {
          controlCountByPlayer.set(leader.name, (controlCountByPlayer.get(leader.name) ?? 0) + 1);
        }
      }

      const entry: Record<string, string | number> = {
        game: getGameLabelShort(game),
        gameLabel: `${game.home} vs ${game.away}`,
        gameId: game.id,
      };

      for (const name of names) {
        entry[name] = controlCountByPlayer.get(name) ?? 0;
      }

      data.push(entry);
    }

    const computedEras: EraSegment[] = [];
    const stableThreshold = Math.floor(scoringSystems.length / 2) + 1;

    for (const entry of data) {
      const gameId = Number(entry.gameId);

      let controllersAboveThreshold: string[] = [];
      for (const name of names) {
        const count = Number(entry[name] ?? 0);
        if (count >= stableThreshold) {
          controllersAboveThreshold.push(name);
        }
      }

      const isStable = controllersAboveThreshold.length === 1;
      const stablePlayer = isStable ? controllersAboveThreshold[0] : undefined;
      const label = isStable ? `${stablePlayer} Dynasty 霸` : 'Chaotic Era 亂世';

      const previous = computedEras[computedEras.length - 1];
      if (!previous) {
        computedEras.push({
          label,
          startGameId: gameId,
          endGameId: gameId,
          type: isStable ? 'stable' : 'chaotic',
          playerName: stablePlayer,
          isGoldenAge: false,
        });
        continue;
      }

      const sameEra =
        previous.type === (isStable ? 'stable' : 'chaotic') &&
        ((isStable && previous.playerName === stablePlayer) || (!isStable && !previous.playerName));

      if (sameEra) {
        previous.endGameId = gameId;
      } else {
        computedEras.push({
          label,
          startGameId: gameId,
          endGameId: gameId,
          type: isStable ? 'stable' : 'chaotic',
          playerName: stablePlayer,
          isGoldenAge: false,
        });
      }
    }

    for (const era of computedEras) {
      if (era.type !== 'stable' || !era.playerName) continue;
      const playerName = era.playerName;

      const hadFullControl = data.some((entry) => {
        const gameId = Number(entry.gameId);
        if (gameId < era.startGameId || gameId > era.endGameId) return false;
        return Number(entry[playerName] ?? 0) === scoringSystems.length;
      });

      if (hadFullControl) {
        era.label = `${playerName} Golden Age 盛世`;
        era.isGoldenAge = true;
      }
    }

    return { chartData: data, playerNames: names, eras: computedEras };
  }, [games, predictions]);

  const dynastyPlayers = useMemo(() => {
    const players = new Set<string>();
    for (const era of eras) {
      if (era.type === 'stable' && era.playerName) {
        players.add(era.playerName);
      }
    }
    return players;
  }, [eras]);

  useEffect(() => {
    if (initializedDefaultVisibility.current) return;
    if (playerNames.length === 0) return;

    const defaultHidden = new Set(playerNames.filter((name) => !dynastyPlayers.has(name)));
    setHiddenPlayers(defaultHidden);
    initializedDefaultVisibility.current = true;
  }, [playerNames, dynastyPlayers]);

  if (chartData.length === 0) {
    return <div className="leaderboard-control-chart empty">The campaign has not begun yet</div>;
  }

  const togglePlayer = (name: string) => {
    setHiddenPlayers((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const visiblePlayers = playerNames.filter((name) => !hiddenPlayers.has(name));

  const tooltipStyle = {
    background: 'linear-gradient(165deg, #f4e6c6, #e7d3aa)',
    border: '1px solid #8b5a2b',
    borderRadius: 4,
    boxShadow: '0 8px 18px rgba(43, 31, 20, 0.35)',
    color: '#2d2014',
    fontSize: 13,
    fontFamily: '"Noto Serif SC", "Times New Roman", serif',
  };

  const labelFormatter: NonNullable<TooltipProps['labelFormatter']> = (label, payload) => {
    const item = payload?.[0]?.payload;
    return item?.gameLabel ? `${label}: ${item.gameLabel}` : label;
  };

  const yDomainLine: [number, number] = [0, scoringSystems.length];

  return (
    <div className="leaderboard-control-chart">
      <div className="leaderboard-control-header">
        <div>
          <h3>戰國 The Warring States</h3>
          <p>A chronicle of dominance across nine kingdoms</p>
        </div>
      </div>

      <div className="control-eras" aria-label="Control eras">
        {eras.map((era) => (
          <span
            key={`${era.type}-${era.startGameId}-${era.endGameId}-${era.playerName ?? 'chaotic'}`}
            className={`era-chip ${era.isGoldenAge ? 'golden' : era.type}`}
          >
            {era.label} (G{era.startGameId}-G{era.endGameId})
          </span>
        ))}
      </div>

      <div className="player-toggles">
        {playerNames.map((name) => (
          <button
            key={name}
            className={`player-toggle-btn ${hiddenPlayers.has(name) ? 'hidden-player' : ''}`}
            style={{
              borderColor: COLORS[playerNames.indexOf(name) % COLORS.length],
            }}
            onClick={() => togglePlayer(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="game" tick={{ fontSize: 12, fill: 'var(--text)' }} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--text)' }} domain={yDomainLine} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={labelFormatter} />
          <Legend wrapperStyle={{ fontSize: 13 }} />

          {visiblePlayers.map((name) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={COLORS[playerNames.indexOf(name) % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
