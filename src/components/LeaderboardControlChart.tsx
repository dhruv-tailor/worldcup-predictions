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
import type { Game, PlayerScore, Prediction } from '../types';
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

/**
 * Returns player names occupying the given rank (1-based) using standard ranking
 * (ties cause subsequent ranks to be skipped). Returns an empty array if the rank
 * is skipped due to ties above it.
 *
 * Examples with standings [A=10, B=10, C=8, D=7]:
 *   rank 1 → [A, B]   (tied 1st)
 *   rank 2 → []        (skipped — 2 players tied 1st, so rank 2 doesn't exist)
 *   rank 3 → [C]       (first distinct tier after the 2-way tie)
 *   rank 4 → [D]
 */
function getPlayersAtRank(standings: PlayerScore[], rank: number): string[] {
  if (standings.length === 0) return [];

  // Build distinct score tiers in descending order
  const tiers: { points: number; players: string[] }[] = [];
  for (const player of standings) {
    const last = tiers[tiers.length - 1];
    if (last && last.points === player.totalPoints) {
      last.players.push(player.name);
    } else {
      tiers.push({ points: player.totalPoints, players: [player.name] });
    }
  }

  // Walk tiers and apply standard ranking
  let currentRank = 1;
  for (const tier of tiers) {
    if (currentRank === rank) return tier.players;
    if (currentRank > rank) return []; // rank was skipped
    currentRank += tier.players.length; // skip ahead by tie count
  }
  return [];
}

interface EraLabels {
  stable: (player: string) => string;
  chaotic: string;
  goldenAge: (player: string) => string;
}

const ERA_LABELS_1ST: EraLabels = {
  stable: (p) => `${p} Dynasty 霸`,
  chaotic: 'Chaotic Era 亂世',
  goldenAge: (p) => `${p} Golden Age 盛世`,
};

const ERA_LABELS_2ND: EraLabels = {
  stable: (p) => `${p} Shadow Throne 影座`,
  chaotic: 'Rival Courts 分庭',
  goldenAge: (p) => `${p} Silver Reign 銀治`,
};

const ERA_LABELS_3RD: EraLabels = {
  stable: (p) => `${p} Outer Court 外庭`,
  chaotic: 'Border Skirmish 邊亂',
  goldenAge: (p) => `${p} Bronze Ascent 銅升`,
};

/**
 * Classifies an array of per-game chart entries into era segments
 * (Dynasty / Chaotic / Golden Age) based on how many systems each player
 * controls above the majority threshold.
 */
function computeEras(
  data: Record<string, string | number>[],
  names: string[],
  systemCount: number,
  labels: EraLabels,
): EraSegment[] {
  const computedEras: EraSegment[] = [];
  const stableThreshold = Math.floor(systemCount / 2) + 1;

  for (const entry of data) {
    const gameId = Number(entry.gameId);

    const controllersAboveThreshold: string[] = [];
    for (const name of names) {
      const count = Number(entry[name] ?? 0);
      if (count >= stableThreshold) {
        controllersAboveThreshold.push(name);
      }
    }

    const isStable = controllersAboveThreshold.length === 1;
    const stablePlayer = isStable ? controllersAboveThreshold[0] : undefined;
    const label = isStable ? labels.stable(stablePlayer!) : labels.chaotic;

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

  // Promote to Golden Age if dynasty player achieved full control at any point
  for (const era of computedEras) {
    if (era.type !== 'stable' || !era.playerName) continue;
    const playerName = era.playerName;

    const hadFullControl = data.some((entry) => {
      const gameId = Number(entry.gameId);
      if (gameId < era.startGameId || gameId > era.endGameId) return false;
      return Number(entry[playerName] ?? 0) === systemCount;
    });

    if (hadFullControl) {
      era.label = labels.goldenAge(playerName);
      era.isGoldenAge = true;
    }
  }

  return computedEras;
}

// ---------------------------------------------------------------------------
// ControlSection — renders a single placement tier (1st, 2nd, or 3rd)
// ---------------------------------------------------------------------------

interface ControlSectionProps {
  title: string;
  subtitle: string;
  chartData: Record<string, string | number>[];
  eras: EraSegment[];
  playerNames: string[];
  dynastyPlayers: Set<string>;
  systemCount: number;
}

function ControlSection({ title, subtitle, chartData, eras, playerNames, dynastyPlayers, systemCount }: ControlSectionProps) {
  const [hiddenPlayers, setHiddenPlayers] = useState<Set<string>>(new Set());
  const initializedDefaultVisibility = useRef(false);

  useEffect(() => {
    if (initializedDefaultVisibility.current) return;
    if (playerNames.length === 0) return;
    const defaultHidden = new Set(playerNames.filter((name) => !dynastyPlayers.has(name)));
    setHiddenPlayers(defaultHidden);
    initializedDefaultVisibility.current = true;
  }, [playerNames, dynastyPlayers]);

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

  const yDomainLine: [number, number] = [0, systemCount];

  return (
    <div className="leaderboard-control-chart">
      <div className="leaderboard-control-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
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

// ---------------------------------------------------------------------------
// LeaderboardControlChart — computes all 3 tiers and renders ControlSections
// ---------------------------------------------------------------------------

export default function LeaderboardControlChart({ games, predictions }: LeaderboardControlChartProps) {
  const { chartData1st, chartData2nd, chartData3rd, playerNames, eras1st, eras2nd, eras3rd } = useMemo(() => {
    const playedGames = games
      .filter((game) => game.homeScore !== null && game.awayScore !== null)
      .sort((a, b) => a.id - b.id);

    const names = Array.from(new Set(predictions.map((prediction) => prediction.name))).sort((a, b) =>
      a.localeCompare(b),
    );

    const data1st: Record<string, string | number>[] = [];
    const data2nd: Record<string, string | number>[] = [];
    const data3rd: Record<string, string | number>[] = [];
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
        return { ...currentGame, homeScore: null, awayScore: null };
      });

      const count1st = new Map<string, number>(names.map((name) => [name, 0]));
      const count2nd = new Map<string, number>(names.map((name) => [name, 0]));
      const count3rd = new Map<string, number>(names.map((name) => [name, 0]));

      for (const system of scoringSystems) {
        const standings = system.calculateStandings(gamesAtStep, predictions);
        if (standings.length === 0) continue;

        for (const player of getPlayersAtRank(standings, 1)) {
          count1st.set(player, (count1st.get(player) ?? 0) + 1);
        }
        for (const player of getPlayersAtRank(standings, 2)) {
          count2nd.set(player, (count2nd.get(player) ?? 0) + 1);
        }
        for (const player of getPlayersAtRank(standings, 3)) {
          count3rd.set(player, (count3rd.get(player) ?? 0) + 1);
        }
      }

      const base: Record<string, string | number> = {
        game: getGameLabelShort(game),
        gameLabel: `${game.home} vs ${game.away}`,
        gameId: game.id,
      };

      const entry1st = { ...base };
      const entry2nd = { ...base };
      const entry3rd = { ...base };

      for (const name of names) {
        entry1st[name] = count1st.get(name) ?? 0;
        entry2nd[name] = count2nd.get(name) ?? 0;
        entry3rd[name] = count3rd.get(name) ?? 0;
      }

      data1st.push(entry1st);
      data2nd.push(entry2nd);
      data3rd.push(entry3rd);
    }

    const systemCount = scoringSystems.length;

    return {
      chartData1st: data1st,
      chartData2nd: data2nd,
      chartData3rd: data3rd,
      playerNames: names,
      eras1st: computeEras(data1st, names, systemCount, ERA_LABELS_1ST),
      eras2nd: computeEras(data2nd, names, systemCount, ERA_LABELS_2ND),
      eras3rd: computeEras(data3rd, names, systemCount, ERA_LABELS_3RD),
    };
  }, [games, predictions]);

  const dynastyPlayers1st = useMemo(() => {
    const players = new Set<string>();
    for (const era of eras1st) {
      if (era.type === 'stable' && era.playerName) players.add(era.playerName);
    }
    return players;
  }, [eras1st]);

  const dynastyPlayers2nd = useMemo(() => {
    const players = new Set<string>();
    for (const era of eras2nd) {
      if (era.type === 'stable' && era.playerName) players.add(era.playerName);
    }
    return players;
  }, [eras2nd]);

  const dynastyPlayers3rd = useMemo(() => {
    const players = new Set<string>();
    for (const era of eras3rd) {
      if (era.type === 'stable' && era.playerName) players.add(era.playerName);
    }
    return players;
  }, [eras3rd]);

  if (chartData1st.length === 0) {
    return <div className="leaderboard-control-chart empty">The campaign has not begun yet</div>;
  }

  return (
    <div className="control-sections">
      <ControlSection
        title="戰國 The Warring States"
        subtitle="A chronicle of dominance across nine kingdoms"
        chartData={chartData1st}
        eras={eras1st}
        playerNames={playerNames}
        dynastyPlayers={dynastyPlayers1st}
        systemCount={scoringSystems.length}
      />
      <ControlSection
        title="銀座 The Silver Throne"
        subtitle="Those who dwell one step below the summit"
        chartData={chartData2nd}
        eras={eras2nd}
        playerNames={playerNames}
        dynastyPlayers={dynastyPlayers2nd}
        systemCount={scoringSystems.length}
      />
      <ControlSection
        title="銅庭 The Bronze Court"
        subtitle="Contenders circling the seat of power"
        chartData={chartData3rd}
        eras={eras3rd}
        playerNames={playerNames}
        dynastyPlayers={dynastyPlayers3rd}
        systemCount={scoringSystems.length}
      />
    </div>
  );
}
