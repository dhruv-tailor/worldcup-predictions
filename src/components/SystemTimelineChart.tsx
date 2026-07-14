import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { SVGProps } from 'react';
import { getPlayerColor } from '../utils/playerColors';
import type { SystemTimeline } from '../utils/timelines';
import TimingTower from './TimingTower';

interface SystemTimelineChartProps {
  timeline: SystemTimeline;
  visiblePlayers: Set<string>;
  sectorIndex: number;
}

const KEY_MARKER_COLORS: Record<number, string> = {
  10: '#51a8ff',
  5: '#ffd447',
  3: '#ff9b42',
  1: '#e24747',
};

function buildStarPoints(outerRadius: number, innerRadius: number): string {
  const points: string[] = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = (-90 + index * 36) * (Math.PI / 180);
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

const STAR_POINTS = buildStarPoints(7, 3.2);

interface MarkerStarShapeProps extends SVGProps<SVGPolygonElement> {
  cx?: number;
  cy?: number;
  fillColor: string;
  lift: number;
}

function MarkerStarShape({ cx, cy, fillColor, lift }: MarkerStarShapeProps) {
  if (cx == null || cy == null) {
    return null;
  }

  return (
    <g transform={`translate(${cx}, ${cy - lift})`}>
      <polygon points={STAR_POINTS} fill={fillColor} stroke="rgba(255,255,255,0.4)" strokeWidth={0.8} />
    </g>
  );
}

export default function SystemTimelineChart({ timeline, visiblePlayers, sectorIndex }: SystemTimelineChartProps) {
  const [isMarkerKeyExpanded, setIsMarkerKeyExpanded] = useState(false);

  if (timeline.chartData.length === 0) {
    return null;
  }

  const latestGameId = Number(timeline.chartData[timeline.chartData.length - 1]?.gameId ?? 0);

  const activePlayers = timeline.playerNames.filter((name) => visiblePlayers.has(name));
  const activeOrAllPlayers = activePlayers.length > 0 ? activePlayers : timeline.playerNames;
  const chartRowsByGameId = new Map(
    timeline.chartData.map((row) => [Number(row.gameId), row]),
  );
  const visiblePitStops = timeline.pitStops.filter((stop) =>
    !stop.playerName || visiblePlayers.has(stop.playerName),
  );
  const markerStops = [...visiblePitStops].sort((a, b) => {
    if (a.gameId !== b.gameId) return a.gameId - b.gameId;

    const typeOrder = (type: string) => {
      if (type === 'leader-change') return 0;
      if (type === 'position-change') return 1;
      return 2;
    };

    return typeOrder(a.type) - typeOrder(b.type);
  });

  const numberedStops = markerStops.reduce<Array<(typeof markerStops)[number] & { markerNumber: number }>>(
    (acc, stop) => {
      const previous = acc[acc.length - 1];
      const markerNumber = previous && previous.gameId === stop.gameId ? previous.markerNumber : acc.length === 0
        ? 1
        : previous.markerNumber + 1;

      acc.push({
        ...stop,
        markerNumber,
      });

      return acc;
    },
    [],
  );

  const markerLines = numberedStops.filter(
    (stop, index, array) => index === array.findIndex((candidate) => candidate.gameId === stop.gameId),
  );
  const keyMarkerEntries = timeline.keyMarkers
    .filter((marker) => marker.gameId !== latestGameId)
    .map((marker) => ({
      ...marker,
      color: KEY_MARKER_COLORS[marker.topCount] ?? 'var(--f1-yellow)',
      markerNumber: numberedStops.find((stop) => stop.gameId === marker.gameId)?.markerNumber ?? null,
    }));
  const stabilityMarker = timeline.stabilityMarker?.gameId === latestGameId ? null : timeline.stabilityMarker;
  const keyMarkerLiftByGame = new Map<number, number>();
  const keyMarkerDots = keyMarkerEntries
    .map((marker) => {
      const row = chartRowsByGameId.get(marker.gameId);
      if (!row) {
        return null;
      }

      const topVisibleValue = activeOrAllPlayers.reduce((maxValue, playerName) => {
        const value = Number(row[playerName] ?? Number.NEGATIVE_INFINITY);
        return Math.max(maxValue, value);
      }, Number.NEGATIVE_INFINITY);

      if (!Number.isFinite(topVisibleValue)) {
        return null;
      }

      const currentLift = keyMarkerLiftByGame.get(marker.gameId) ?? 16;
      keyMarkerLiftByGame.set(marker.gameId, currentLift + 14);

      return {
        ...marker,
        yValue: topVisibleValue,
        lift: currentLift,
      };
    })
    .filter((marker): marker is NonNullable<typeof marker> => marker != null);
  const stabilityMarkerDot = (() => {
    if (!stabilityMarker) {
      return null;
    }

    const row = chartRowsByGameId.get(stabilityMarker.gameId);
    if (!row) {
      return null;
    }

    const topVisibleValue = activeOrAllPlayers.reduce((maxValue, playerName) => {
      const value = Number(row[playerName] ?? Number.NEGATIVE_INFINITY);
      return Math.max(maxValue, value);
    }, Number.NEGATIVE_INFINITY);

    if (!Number.isFinite(topVisibleValue)) {
      return null;
    }

    const lift = (keyMarkerLiftByGame.get(stabilityMarker.gameId) ?? 16) + 14;
    return {
      ...stabilityMarker,
      yValue: topVisibleValue,
      lift,
    };
  })();

  const totalMarkers = markerLines.length;

  const markerKeyEntries = numberedStops.reduce<
    Array<{
      markerNumber: number;
      gameId: number;
      game: string;
      gameLabel: string;
      leaderChanges: string[];
      positionChanges: string[];
    }>
  >((acc, stop) => {
    const previous = acc[acc.length - 1];
    const isSameMarker = previous && previous.markerNumber === stop.markerNumber;

    if (!isSameMarker) {
      acc.push({
        markerNumber: stop.markerNumber,
        gameId: stop.gameId,
        game: stop.game,
        gameLabel: stop.gameLabel,
        leaderChanges: stop.type === 'leader-change' ? [stop.detail] : [],
        positionChanges: stop.type === 'position-change' ? [`${stop.playerName ?? 'A driver'} (${stop.detail})`] : [],
      });
      return acc;
    }

    if (stop.type === 'leader-change') {
      previous.leaderChanges.push(stop.detail);
    } else {
      previous.positionChanges.push(`${stop.playerName ?? 'A driver'} (${stop.detail})`);
    }

    return acc;
  }, []);

  const keyEntries = isMarkerKeyExpanded
    ? markerKeyEntries
    : markerKeyEntries.filter((entry) => entry.markerNumber > Math.max(0, totalMarkers - 10));

  const tooltipStyle = {
    background: 'var(--f1-bg-panel)',
    border: '1px solid var(--f1-border)',
    borderRadius: 6,
    fontSize: 13,
    color: 'var(--f1-text)',
  };

  const labelFormatter: NonNullable<TooltipProps['labelFormatter']> = (label, payload) => {
    const item = payload?.[0]?.payload;
    return item?.gameLabel ? `${label}: ${item.gameLabel}` : label;
  };

  return (
    <article className="timeline-card" aria-label={`${timeline.systemName} timeline`}>
      <header className="timeline-card-header">
        <p className="timeline-kicker">TELEMETRY FEED</p>
        <h3>{timeline.systemName}</h3>
        <p>
          <span className="timeline-sector-tag">SECTOR {sectorIndex}</span>
          {timeline.isElo ? ' ELO trajectory over played games' : ` ${timeline.description}`}
        </p>
      </header>
      {activePlayers.length === 0 && (
        <p className="timeline-card-empty">No players selected. Use filters above to show players.</p>
      )}
      <div className="timeline-chart-shell">
        <ResponsiveContainer width="100%" height={520}>
          <LineChart data={timeline.chartData} margin={{ top: 92, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--f1-border)" />
              <XAxis dataKey="game" tick={{ fontSize: 12, fill: 'var(--f1-text)' }} />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--f1-text)' }}
                domain={timeline.isElo ? ['dataMin - 10', 'dataMax + 10'] : [0, 'auto']}
              />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={labelFormatter} />
              {markerLines.map((stop) => {
                const markerColor =
                  stop.type === 'position-change' ? 'var(--f1-green)' : 'var(--f1-red)';

                return (
                  <ReferenceLine
                    key={`${stop.type}-${stop.gameId}-${stop.playerName ?? 'leader'}`}
                    x={stop.game}
                    stroke={markerColor}
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                    label={{
                      value: `${stop.markerNumber}`,
                      fill: markerColor,
                      position: 'top',
                      fontSize: 10,
                      offset: 12,
                    }}
                  />
                );
              })}
              {activePlayers.map((name) => {
                const isFastestLap = timeline.fastestLap?.name === name;
                return (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={getPlayerColor(name)}
                    strokeWidth={isFastestLap ? 3 : 2}
                    style={isFastestLap ? { filter: `drop-shadow(0 0 5px ${getPlayerColor(name)})` } : undefined}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                );
              })}
              {keyMarkerDots.map((marker) => (
                <ReferenceDot
                  key={`key-marker-${marker.topCount}-${marker.gameId}`}
                  x={marker.game}
                  y={marker.yValue}
                  ifOverflow="extendDomain"
                  r={0}
                  shape={<MarkerStarShape fillColor={marker.color} lift={marker.lift} />}
                />
              ))}
              {stabilityMarkerDot && (
                <ReferenceDot
                  x={stabilityMarkerDot.game}
                  y={stabilityMarkerDot.yValue}
                  ifOverflow="extendDomain"
                  r={0}
                  shape={<MarkerStarShape fillColor="#a15cff" lift={stabilityMarkerDot.lift} />}
                />
              )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="timeline-secondary-row">
        <div className="timeline-marker-key" aria-label="Marker key">
          {keyMarkerEntries.length > 0 && (
            <div className="timeline-key-marker-panel" aria-label="Key marker">
              <p className="timeline-key-marker-label">Key markers</p>
              <div className="timeline-key-marker-list">
                {stabilityMarker && (
                  <div className="timeline-key-marker-row">
                    <span className="timeline-key-marker-badge timeline-key-marker-badge-stability">Mostly stable</span>
                    <span className="timeline-key-marker-game">
                      {stabilityMarker.game} ({stabilityMarker.gameLabel})
                    </span>
                  </div>
                )}
                {keyMarkerEntries.map((marker) => (
                  <div key={`key-marker-panel-${marker.topCount}`} className="timeline-key-marker-row">
                    <span
                      className="timeline-key-marker-badge"
                      style={{ borderColor: marker.color, color: marker.color }}
                    >
                      {marker.label}
                    </span>
                    <span className="timeline-key-marker-game">
                      {marker.game} ({marker.gameLabel})
                    </span>
                    {marker.markerNumber != null && (
                      <span className="timeline-key-marker-chip">Marker {marker.markerNumber}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="timeline-marker-key-head">
            <h4>Marker Key</h4>
            {totalMarkers > 10 && (
              <button
                type="button"
                className="timeline-marker-toggle"
                onClick={() => setIsMarkerKeyExpanded((previous) => !previous)}
              >
                {isMarkerKeyExpanded ? 'Show latest 10' : `Show all ${totalMarkers}`}
              </button>
            )}
          </div>
          {markerKeyEntries.length === 0 ? (
            <p className="timeline-marker-empty">No pit-stop markers for visible drivers.</p>
          ) : (
            <ol>
              {keyEntries.map((entry) => {
                const details: string[] = [];
                if (entry.leaderChanges.length > 0) {
                  details.push(`👑 lead change: ${entry.leaderChanges.join('; ')}`);
                }
                if (entry.positionChanges.length > 0) {
                  details.push(`↕ position jumps: ${entry.positionChanges.join('; ')}`);
                }

                return (
                  <li key={`key-${entry.gameId}`}>
                    <span className="timeline-marker-number">{entry.markerNumber}</span>
                    <span className="timeline-marker-detail">
                      {entry.game} ({entry.gameLabel}): {details.join(' | ')}.
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <TimingTower entries={timeline.timingTower} visiblePlayers={visiblePlayers} maxRows={10} />
      </div>
    </article>
  );
}
