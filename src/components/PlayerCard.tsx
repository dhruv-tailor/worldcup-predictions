import {
  PolarAngleAxis,
  PolarGrid,
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

function formatCappedError(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-';

  const capped = Math.min(999, Math.max(0, value));
  if (capped >= 100) return String(Math.round(capped));

  const fixed = capped.toFixed(2);
  return fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export default function PlayerCard({ summary, index }: PlayerCardProps) {
  const displayPower = Math.round(summary.powerRating * 100);
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
            <p className="player-card-name-metrics">#{summary.rank} · 🔥{summary.longestStreak} · ⚡{displayPower}</p>
          </div>
        </div>

        <div className="player-card-radar">
          <ResponsiveContainer width="100%" aspect={1}>
            <RadarChart data={summary.radar} cy="47%" outerRadius="70%" margin={{ top: 6, right: 12, bottom: 16, left: 12 }}>
              <PolarGrid stroke="var(--card-grid)" strokeOpacity={0.65} />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: 'var(--card-axis)', fontSize: 7, fontWeight: 600 }}
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
