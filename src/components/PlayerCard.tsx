import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import type { PlayerCardSummary } from '../utils/playerRadarStats';
import { getFlag } from '../utils/flags';
import { getPlayerAvatar } from '../utils/playerAvatars';

interface PlayerCardProps {
  summary: PlayerCardSummary;
  index: number;
}

interface RadarAxisTickProps {
  x?: number | string;
  y?: number | string;
  textAnchor?: 'start' | 'middle' | 'end' | 'inherit';
  payload?: {
    value: string;
  };
}

function toTwoDigitRating(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(99, Math.max(0, Math.round(value)));
}

function toLetterGrade(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

function RadarAxisTick({
  x = 0,
  y = 0,
  textAnchor = 'middle',
  payload,
  ratings,
}: RadarAxisTickProps & {
  ratings: Map<string, { score: number; grade: string }>;
}) {
  const tickX = typeof x === 'string' ? Number(x) : x;
  const tickY = typeof y === 'string' ? Number(y) : y;
  const axis = payload?.value ?? '';
  const rating = ratings.get(axis);

  return (
    <text x={tickX} y={tickY} textAnchor={textAnchor} fill="var(--card-axis)">
      <tspan x={tickX} dy="0" fontSize={7} fontWeight={700}>{axis}</tspan>
      {rating ? (
        <tspan x={tickX} dy="1.05em" fontSize={6} fontWeight={800} fill="var(--card-text)">
          {rating.score} {rating.grade}
        </tspan>
      ) : null}
    </text>
  );
}

function formatCappedError(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-';

  const capped = Math.min(999, Math.max(0, value));
  if (capped >= 100) return String(Math.round(capped));

  const fixed = capped.toFixed(2);
  return fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export default function PlayerCard({ summary, index }: PlayerCardProps) {
  const displayPowerScore = toTwoDigitRating(summary.powerRating);
  const displayPowerGrade = toLetterGrade(displayPowerScore);
  const radarRatings = summary.radar.reduce((acc, datum) => {
    const score = toTwoDigitRating(datum.value);
    acc.set(datum.axis, { score, grade: toLetterGrade(score) });
    return acc;
  }, new Map<string, { score: number; grade: string }>());
  const avatarSrc = getPlayerAvatar(summary.playerName);
  const avatarTierClass =
    summary.rank === 1
      ? 'avatar-tier-legend'
      : summary.rank <= 3
        ? 'avatar-tier-epic'
        : summary.rank <= 6
          ? 'avatar-tier-rare'
          : 'avatar-tier-common';
  const frameTierClass =
    summary.rank === 1
      ? 'frame-legendary'
      : summary.rank <= 3
        ? 'frame-epic'
        : summary.rank <= 6
          ? 'frame-rare'
          : 'frame-common';

  return (
    <article
      className={`player-card-wrap ${summary.rank <= 3 ? `podium-${summary.rank}` : ''}`}
      style={{ animationDelay: `${index * 65}ms` }}
    >
      <section className={`player-card-face player-card-front player-card-single ${frameTierClass}`}>
        <div className="player-card-header-row">
          <div className={`player-card-avatar ${avatarTierClass}`}>
            {avatarSrc ? (
              <img
                className="player-card-avatar-image"
                src={avatarSrc}
                alt={`${summary.playerName} avatar`}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span aria-hidden="true">#{summary.rank}</span>
            )}
          </div>
          <div className="player-card-namegroup">
            <h3>{summary.playerName}</h3>
            <p className="player-card-name-metrics">#{summary.rank} · 🔥{summary.longestStreak} · 🎯{summary.exactCount}</p>
          </div>
          <div className="player-card-ovr-badge" aria-label={`Overall ${displayPowerScore} ${displayPowerGrade}`}>
            <span className="player-card-ovr-label">OVR</span>
            <strong className="player-card-ovr-score">{displayPowerScore}</strong>
            <span className="player-card-ovr-grade">{displayPowerGrade}</span>
          </div>
        </div>

        <div className="player-card-radar">
          <ResponsiveContainer width="100%" aspect={1}>
            <RadarChart data={summary.radar} cy="46%" outerRadius="66%" margin={{ top: 8, right: 16, bottom: 22, left: 16 }}>
              <PolarGrid stroke="var(--card-grid)" strokeOpacity={0.65} />
              <PolarRadiusAxis
                domain={[0, 100]}
                ticks={[25, 50, 75, 100]}
                tick={{ fill: 'var(--card-axis)', fontSize: 6, opacity: 0.42 }}
                axisLine={false}
                tickLine={false}
                angle={88}
              />
              <PolarAngleAxis
                dataKey="axis"
                tick={(props) => <RadarAxisTick {...props} ratings={radarRatings} />}
              />
              <Radar
                name={summary.playerName}
                dataKey="value"
                stroke="var(--card-radar-stroke)"
                fill="var(--card-radar-fill)"
                fillOpacity={0.56}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="player-card-bottom-grid">
          <div className="player-card-stat-cell">
            <span>Win/Exact %</span>
            <strong>{summary.winnerPct}% / {summary.exactPct}%</strong>
          </div>
          <div className="player-card-stat-cell">
            <span>Error (Avg/H/A)</span>
            <strong>
              {formatCappedError(summary.avgError)} / {formatCappedError(summary.homeAvgError)} / {formatCappedError(summary.awayAvgError)}
            </strong>
          </div>

          <div className="player-card-role-box face" aria-label="Face team">
            <span className="player-card-role-label">Face</span>
            <strong className="player-card-role-flag">{summary.bestTeam ? getFlag(summary.bestTeam) : '-'}</strong>
          </div>

          <div className="player-card-role-box heel" aria-label="Heel team">
            <span className="player-card-role-label">Heel</span>
            <strong className="player-card-role-flag">{summary.worstTeam ? getFlag(summary.worstTeam) : '-'}</strong>
          </div>
        </div>
      </section>
    </article>
  );
}
