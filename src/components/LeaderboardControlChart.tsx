import { useMemo, useState } from 'react';
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
import { getPlayerColor } from '../utils/playerColors';
import { scoringSystems } from '../utils/scoring';
import type { ControlRankSnapshot, EraLabels, EraSegment } from '../utils/controlEras';
import { computeEras, getPlayersAtRank } from '../utils/controlEras';

interface LeaderboardControlChartProps {
  games: Game[];
  predictions: Prediction[];
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
  const [hiddenPlayers, setHiddenPlayers] = useState<Set<string>>(
    () => new Set(playerNames.filter((name) => !dynastyPlayers.has(name))),
  );

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
              borderColor: getPlayerColor(name),
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
              stroke={getPlayerColor(name)}
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
    const rankSnapshots: ControlRankSnapshot[] = [];
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
      const allTop1 = new Map<string, number>(names.map((name) => [name, 0]));
      const allTop2 = new Map<string, number>(names.map((name) => [name, 0]));
      const allTop3 = new Map<string, number>(names.map((name) => [name, 0]));

      for (const system of scoringSystems) {
        const standings = system.calculateStandings(gamesAtStep, predictions);
        if (standings.length === 0) continue;

        const rank1Players = getPlayersAtRank(standings, 1);
        const rank2Players = getPlayersAtRank(standings, 2);
        const rank3Players = getPlayersAtRank(standings, 3);

        for (const player of rank1Players) {
          count1st.set(player, (count1st.get(player) ?? 0) + 1);
          allTop1.set(player, (allTop1.get(player) ?? 0) + 1);
          allTop2.set(player, (allTop2.get(player) ?? 0) + 1);
          allTop3.set(player, (allTop3.get(player) ?? 0) + 1);
        }
        for (const player of rank2Players) {
          count2nd.set(player, (count2nd.get(player) ?? 0) + 1);
          allTop2.set(player, (allTop2.get(player) ?? 0) + 1);
          allTop3.set(player, (allTop3.get(player) ?? 0) + 1);
        }
        for (const player of rank3Players) {
          count3rd.set(player, (count3rd.get(player) ?? 0) + 1);
          allTop3.set(player, (allTop3.get(player) ?? 0) + 1);
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

      rankSnapshots.push({
        gameId: game.id,
        top1: new Set(names.filter((name) => (allTop1.get(name) ?? 0) === scoringSystems.length)),
        top2: new Set(names.filter((name) => (allTop2.get(name) ?? 0) === scoringSystems.length)),
        top3: new Set(names.filter((name) => (allTop3.get(name) ?? 0) === scoringSystems.length)),
      });
    }

    const systemCount = scoringSystems.length;

    return {
      chartData1st: data1st,
      chartData2nd: data2nd,
      chartData3rd: data3rd,
      playerNames: names,
      eras1st: computeEras(data1st, names, systemCount, ERA_LABELS_1ST, rankSnapshots, 'top1'),
      eras2nd: computeEras(data2nd, names, systemCount, ERA_LABELS_2ND, rankSnapshots, 'top2'),
      eras3rd: computeEras(data3rd, names, systemCount, ERA_LABELS_3RD, rankSnapshots, 'top3'),
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
        subtitle={`A chronicle of dominance across ${scoringSystems.length} kingdoms`}
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
