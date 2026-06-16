/**
 * Line chart showing cumulative player scores over sequential games.
 *
 * Each line represents a player, with the X-axis being game IDs (sequential)
 * and the Y-axis being the cumulative point total up to that game.
 * For the Ladder (ELO) system, the Y-axis shows the ELO rating instead.
 *
 * Only played games are plotted. Players are colored with a fixed palette
 * so colors remain consistent when switching scoring systems.
 */

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { PlayerScore, Game, ScoringSystem } from '../types';
import { getGameLabelShort } from '../utils/flags';

interface ScoreChartProps {
  /** Sorted player standings from the active scoring system */
  standings: PlayerScore[];
  /** All games (used to label the X-axis and filter to played games) */
  games: Game[];
  /** The active scoring system (used to detect ELO mode) */
  system: ScoringSystem;
}

type ChartType = 'line' | 'bar';

/** Fixed color palette for up to 12 players */
const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe',
  '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57',
  '#8dd1e1', '#e6194b',
];

export default function ScoreChart({ standings, games, system }: ScoreChartProps) {
  const isElo = system.name === 'Ladder';
  const [chartType, setChartType] = useState<ChartType>('line');
  const [hiddenPlayers, setHiddenPlayers] = useState<Set<string>>(new Set());

  const { chartData, playerNames } = useMemo(() => {
    const playedGames = games
      .filter((g) => g.homeScore !== null)
      .sort((a, b) => a.id - b.id);

    // Get player names sorted by final standing (best first)
    const names = standings.map((s) => s.name);

    // Build chart data: one entry per game, with cumulative score per player
    const data: Record<string, string | number>[] = [];

    // For ELO, we track running rating; for others, cumulative sum
    const running = new Map<string, number>();
    for (const name of names) {
      running.set(name, isElo ? 1000 : 0);
    }

    for (const game of playedGames) {
      const entry: Record<string, string | number> = {
        game: getGameLabelShort(game),
        gameLabel: `${game.home} vs ${game.away}`,
      };

      for (const name of names) {
        const player = standings.find((s) => s.name === name);
        const breakdown = player?.gameBreakdowns.find((gb) => gb.gameId === game.id);
        const delta = breakdown?.points.total ?? 0;

        const prev = running.get(name)!;
        const next = prev + delta;
        running.set(name, next);
        entry[name] = next;
      }

      data.push(entry);
    }

    return { chartData: data, playerNames: names };
  }, [standings, games, system, isElo]);

  if (chartData.length === 0) {
    return <div className="score-chart empty">No games played yet</div>;
  }

  const togglePlayer = (name: string) => {
    setHiddenPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const visiblePlayers = playerNames.filter((n) => !hiddenPlayers.has(n));

  const tooltipStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 13,
  };

  const labelFormatter: NonNullable<TooltipProps['labelFormatter']> = (label, payload) => {
    const item = payload?.[0]?.payload;
    return item?.gameLabel ? `${label}: ${item.gameLabel}` : label;
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 20, bottom: 5, left: 0 },
    };

    const xAxis = (
      <XAxis dataKey="game" tick={{ fontSize: 12, fill: 'var(--text)' }} />
    );
    const yAxis = (
      <YAxis
        tick={{ fontSize: 12, fill: 'var(--text)' }}
        domain={isElo ? ['dataMin - 10', 'dataMax + 10'] : [0, 'auto']}
      />
    );
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />;
    const tooltip = (
      <Tooltip contentStyle={tooltipStyle} labelFormatter={labelFormatter} />
    );
    const legend = <Legend wrapperStyle={{ fontSize: 13 }} />;

    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}{legend}
          {visiblePlayers.map((name) => (
            <Bar key={name} dataKey={name} fill={COLORS[playerNames.indexOf(name) % COLORS.length]} opacity={0.85} />
          ))}
        </BarChart>
      );
    }

    return (
      <LineChart {...commonProps}>
        {grid}{xAxis}{yAxis}{tooltip}{legend}
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
    );
  };

  return (
    <div className="score-chart">
      <div className="score-chart-header">
        <h3>{isElo ? 'ELO Rating Over Time' : 'Cumulative Score Over Time'}</h3>
        <div className="chart-controls">
          {(['line', 'area', 'bar'] as ChartType[]).map((t) => (
            <button
              key={t}
              className={`chart-type-btn ${chartType === t ? 'active' : ''}`}
              onClick={() => setChartType(t)}
            >
              {t === 'line' ? '📈 Line' : '📶 Bar'}
            </button>
          ))}
        </div>
      </div>
      <div className="player-toggles">
        {playerNames.map((name) => (
          <button
            key={name}
            className={`player-toggle-btn ${hiddenPlayers.has(name) ? 'hidden-player' : ''}`}
            style={{ borderColor: COLORS[playerNames.indexOf(name) % COLORS.length], color: COLORS[playerNames.indexOf(name) % COLORS.length] }}
            onClick={() => togglePlayer(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={350}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
