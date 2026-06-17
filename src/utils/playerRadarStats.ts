import type { Game, PlayerScore, Prediction, ScoringSystem } from '../types';
import type { CrossSystemRank } from './playerStats';
import { getPlayerAccuracy } from './playerStats';

export type PlayerCardRarity = 'legendary' | 'epic' | 'rare' | 'common';

export interface PlayerRadarDatum {
  axis: string;
  systemName: string;
  value: number;
}

export interface PlayerCardSummary {
  playerName: string;
  rank: number;
  totalPlayers: number;
  rarity: PlayerCardRarity;
  cardNumber: number;
  bestSystemName: string;
  bestSystemRank: number;
  winnerPct: number;
  exactPct: number;
  avgError: number;
  homeAvgError: number;
  awayAvgError: number;
  bestTeam: string | null;
  worstTeam: string | null;
  worstTeamError: number | null;
  currentStreak: number;
  longestStreak: number;
  gamesSinceLastExact: number | null;
  powerRating: number;
  archetype: string;
  radar: PlayerRadarDatum[];
  crossSystem: CrossSystemRank[];
}

interface BuildSummariesOptions {
  games: Game[];
  predictions: Prediction[];
  systems: ScoringSystem[];
}

interface PerPlayerInterim {
  playerName: string;
  averageRank: number;
  powerRating: number;
  bestSystemName: string;
  bestSystemRank: number;
  winnerPct: number;
  exactPct: number;
  avgError: number;
  homeAvgError: number;
  awayAvgError: number;
  bestTeam: string | null;
  worstTeam: string | null;
  worstTeamError: number | null;
  currentStreak: number;
  longestStreak: number;
  gamesSinceLastExact: number | null;
  archetype: string;
  radar: PlayerRadarDatum[];
  crossSystem: CrossSystemRank[];
}

const systemLabelMap: Record<string, string> = {
  'Ted Classic': 'Classic',
  'Ted+': 'Ted+',
  "Gambler's": 'Gambler',
  '$5 Bets': '$5 Bets',
  Ladder: 'Ladder',
  'Hot Streak': 'Streak',
  'Participation Trophy': 'Trophy',
  'Equal Aggregate': 'EqAgg',
  'Weighted Aggregate': 'WtAgg',
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(value * 100) / 100;

function rarityForRank(rank: number): PlayerCardRarity {
  if (rank === 1) return 'legendary';
  if (rank <= 3) return 'epic';
  if (rank <= 6) return 'rare';
  return 'common';
}

function resolveArchetype(radar: PlayerRadarDatum[]): string {
  const sorted = [...radar].sort((a, b) => b.value - a.value);
  const topSystem = sorted[0]?.systemName ?? '';
  const secondarySystem = sorted[1]?.systemName ?? '';
  const topValue = sorted[0]?.value ?? 0;

  if (topSystem === 'Ted+' || topSystem === 'Participation Trophy') return 'The Sniper';
  if (topSystem === "Gambler's" || topSystem === '$5 Bets') return 'The Maverick';
  if (topSystem === 'Ladder') return 'The Climber';
  if (topSystem === 'Hot Streak') return 'The Heater';
  if (topSystem === 'Equal Aggregate' || topSystem === 'Weighted Aggregate') return 'The Analyst';
  if (topSystem === 'Ted Classic') return 'The Fundamentals';

  if (topValue >= 80 && secondarySystem === 'Ladder') return 'The Tactician';
  return 'The Wild Card';
}

function keyStatForSystem(systemName: string, player: PlayerScore | undefined): string {
  if (!player) return '-';

  if (systemName === 'Ted Classic' && player.winnerPct != null) return `${player.winnerPct}% win`;
  if (systemName === 'Ted+' && player.perfectCount != null) return `${player.perfectCount} perfect`;
  if (systemName === "Gambler's" && player.bestMultiplier != null) return `best x${player.bestMultiplier}`;
  if (systemName === 'Ladder' && player.peakRating != null) return `peak ${player.peakRating}`;
  if (systemName === 'Hot Streak' && player.longestStreak != null) return `best ${player.longestStreak}`;
  if (systemName === 'Participation Trophy' && player.exactCount != null) return `${player.exactCount} exact`;
  if (player.bestSystem && (systemName === 'Equal Aggregate' || systemName === 'Weighted Aggregate')) {
    return `${player.bestSystem} best`;
  }

  return '-';
}

function rankPercentile(rank: number, totalPlayers: number): number {
  if (totalPlayers <= 1) return 100;
  return clamp((1 - (rank - 1) / (totalPlayers - 1)) * 100);
}

function getGamesSinceLastExact(player: PlayerScore, games: Game[]): number | null {
  const gameById = new Map(games.map((g) => [g.id, g]));
  const playedBreakdowns = player.gameBreakdowns
    .filter((entry) => {
      const game = gameById.get(entry.gameId);
      return game?.homeScore !== null && game?.awayScore !== null;
    })
    .sort((a, b) => b.gameId - a.gameId);

  if (playedBreakdowns.length === 0) return null;

  let since = 0;
  for (const entry of playedBreakdowns) {
    const game = gameById.get(entry.gameId);
    if (!game || game.homeScore === null || game.awayScore === null) continue;

    const isExact =
      entry.prediction.homeScore === game.homeScore &&
      entry.prediction.awayScore === game.awayScore;

    if (isExact) return since;
    since += 1;
  }

  return since;
}

export function buildPlayerCardSummaries({
  games,
  predictions,
  systems,
}: BuildSummariesOptions): PlayerCardSummary[] {
  const standingsBySystem = systems.map((system) => ({
    systemName: system.name,
    standings: system.calculateStandings(games, predictions),
  }));

  const totalPlayers = Math.max(...standingsBySystem.map((entry) => entry.standings.length), 0);
  if (totalPlayers === 0) return [];

  const baselineMap = new Map(standingsBySystem[0].standings.map((entry) => [entry.name, entry]));
  const hotStreakMap = new Map(
    (standingsBySystem.find((entry) => entry.systemName === 'Hot Streak')?.standings ?? []).map((entry) => [
      entry.name,
      entry,
    ]),
  );

  const rankMapBySystem = new Map<string, Map<string, { rank: number; player: PlayerScore | undefined }>>();
  for (const systemEntry of standingsBySystem) {
    const map = new Map<string, { rank: number; player: PlayerScore | undefined }>();
    systemEntry.standings.forEach((player, index) => {
      map.set(player.name, { rank: index + 1, player });
    });
    rankMapBySystem.set(systemEntry.systemName, map);
  }

  const players = Array.from(new Set(predictions.map((entry) => entry.name))).sort((a, b) =>
    a.localeCompare(b),
  );

  const interim: PerPlayerInterim[] = players.map((playerName) => {
    const baseline = baselineMap.get(playerName);
    if (!baseline) {
      const emptyRadar = systems.map((system) => ({
        axis: systemLabelMap[system.name] ?? system.name,
        systemName: system.name,
        value: 0,
      }));

      return {
        playerName,
        averageRank: totalPlayers,
        powerRating: 0,
        bestSystemName: '-',
        bestSystemRank: totalPlayers,
        winnerPct: 0,
        exactPct: 0,
        avgError: 0,
        homeAvgError: 0,
        awayAvgError: 0,
        bestTeam: null,
        worstTeam: null,
        worstTeamError: null,
        currentStreak: 0,
        longestStreak: 0,
        gamesSinceLastExact: null,
        archetype: 'The Wild Card',
        radar: emptyRadar,
        crossSystem: systems.map((system) => ({
          systemName: system.name,
          rank: totalPlayers,
          totalPoints: 0,
          keyStat: '-',
        })),
      };
    }

    const accuracy = getPlayerAccuracy(baseline, games);
    const hotStreakPlayer = hotStreakMap.get(playerName);

    const crossSystem: CrossSystemRank[] = systems.map((system) => {
      const rankEntry = rankMapBySystem.get(system.name)?.get(playerName);
      return {
        systemName: system.name,
        rank: rankEntry?.rank ?? totalPlayers,
        totalPoints: rankEntry?.player?.totalPoints ?? 0,
        keyStat: keyStatForSystem(system.name, rankEntry?.player),
      };
    });

    const radar: PlayerRadarDatum[] = crossSystem.map((entry) => ({
      axis: systemLabelMap[entry.systemName] ?? entry.systemName,
      systemName: entry.systemName,
      value: round(rankPercentile(entry.rank, totalPlayers)),
    }));

    const averageRank =
      crossSystem.reduce((sum, entry) => sum + entry.rank, 0) / Math.max(crossSystem.length, 1);

    const powerRating = round(radar.reduce((sum, entry) => sum + entry.value, 0) / Math.max(radar.length, 1));

    const bestSystem = crossSystem.reduce((best, current) => {
      if (!best) return current;
      if (current.rank < best.rank) return current;
      if (current.rank === best.rank && current.totalPoints > best.totalPoints) return current;
      return best;
    }, crossSystem[0]);

    return {
      playerName,
      averageRank,
      powerRating,
      bestSystemName: bestSystem?.systemName ?? '-',
      bestSystemRank: bestSystem?.rank ?? totalPlayers,
      winnerPct: accuracy.winnerPct,
      exactPct: accuracy.exactPct,
      avgError: accuracy.avgError,
      homeAvgError: accuracy.homeAvgError,
      awayAvgError: accuracy.awayAvgError,
      bestTeam: accuracy.bestTeam,
      worstTeam: accuracy.worstTeam,
      worstTeamError: accuracy.worstTeamError,
      currentStreak: hotStreakPlayer?.currentStreak ?? 0,
      longestStreak: hotStreakPlayer?.longestStreak ?? 0,
      gamesSinceLastExact: getGamesSinceLastExact(baseline, games),
      archetype: resolveArchetype(radar),
      radar,
      crossSystem,
    };
  });

  const sortedByComposite = [...interim].sort((a, b) => {
    if (a.averageRank !== b.averageRank) return a.averageRank - b.averageRank;
    if (a.powerRating !== b.powerRating) return b.powerRating - a.powerRating;
    return a.playerName.localeCompare(b.playerName);
  });

  return sortedByComposite.map((entry, index) => {
    const rank = index + 1;
    return {
      playerName: entry.playerName,
      rank,
      totalPlayers,
      rarity: rarityForRank(rank),
      cardNumber: rank,
      bestSystemName: entry.bestSystemName,
      bestSystemRank: entry.bestSystemRank,
      winnerPct: entry.winnerPct,
      exactPct: entry.exactPct,
      avgError: entry.avgError,
      homeAvgError: entry.homeAvgError,
      awayAvgError: entry.awayAvgError,
      bestTeam: entry.bestTeam,
      worstTeam: entry.worstTeam,
      worstTeamError: entry.worstTeamError,
      currentStreak: entry.currentStreak,
      longestStreak: entry.longestStreak,
      gamesSinceLastExact: entry.gamesSinceLastExact,
      powerRating: entry.powerRating,
      archetype: entry.archetype,
      radar: entry.radar,
      crossSystem: entry.crossSystem,
    };
  });
}
