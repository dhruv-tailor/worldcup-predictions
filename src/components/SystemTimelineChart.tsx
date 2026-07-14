import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { getPlayerColor } from '../utils/playerColors';
import type { SystemTimeline } from '../utils/timelines';

interface SystemTimelineChartProps {
  timeline: SystemTimeline;
  visiblePlayers: Set<string>;
}

export default function SystemTimelineChart({ timeline, visiblePlayers }: SystemTimelineChartProps) {
  if (timeline.chartData.length === 0) {
    return null;
  }

  const activePlayers = timeline.playerNames.filter((name) => visiblePlayers.has(name));

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

  return (
    <article className="timeline-card" aria-label={`${timeline.systemName} timeline`}>
      <header className="timeline-card-header">
        <h3>{timeline.systemName}</h3>
        <p>{timeline.isElo ? 'ELO trajectory over played games' : timeline.description}</p>
      </header>
      {activePlayers.length === 0 && (
        <p className="timeline-card-empty">No players selected. Use filters above to show players.</p>
      )}
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={timeline.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="game" tick={{ fontSize: 12, fill: 'var(--text)' }} />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--text)' }}
            domain={timeline.isElo ? ['dataMin - 10', 'dataMax + 10'] : [0, 'auto']}
          />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={labelFormatter} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {activePlayers.map((name) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={getPlayerColor(name)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </article>
  );
}
