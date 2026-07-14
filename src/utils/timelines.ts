import type { Game, PlayerScore, Prediction, ScoringSystem } from '../types';
import { getGameLabelShort } from './flags';

export type PitStopType = 'position-change' | 'leader-change';

export interface TimelinePitStop {
  type: PitStopType;
  gameId: number;
  game: string;
  gameLabel: string;
  playerName?: string;
  magnitude: number;
  detail: string;
}

export interface TimelineFastestLap {
  name: string;
  avgPointsPerGame: number;
}

export interface TimelineKeyMarker {
  label: string;
  topCount: number;
  gameId: number;
  game: string;
  gameLabel: string;
  summary: string;
}

export interface TimelineStabilityMarker {
  gameId: number;
  game: string;
  gameLabel: string;
  remainingChurnScore: number;
  maxRemainingShift: number;
  summary: string;
}

export interface TimingTowerEntry {
  name: string;
  position: number;
  total: number;
  gapToAbove: number;
  isFastestLap: boolean;
}

export interface SystemTimeline {
  systemName: string;
  description: string;
  isElo: boolean;
  playerNames: string[];
  chartData: Record<string, string | number>[];
  pitStops: TimelinePitStop[];
  keyMarkers: TimelineKeyMarker[];
  stabilityMarker: TimelineStabilityMarker | null;
  fastestLap: TimelineFastestLap | null;
  timingTower: TimingTowerEntry[];
}

interface StabilityCandidate {
  index: number;
  remainingChurnScore: number;
  maxRemainingShift: number;
}

function buildPositionMap(ranking: string[]): Map<string, number> {
  return new Map(ranking.map((name, index) => [name, index]));
}

function scoreRemainingChurn(
  rankingsPerGame: string[][],
  playerNames: string[],
  candidateIndex: number,
): StabilityCandidate {
  const finalRanking = rankingsPerGame[rankingsPerGame.length - 1] ?? [];
  const finalPositions = buildPositionMap(finalRanking);
  const candidateRanking = rankingsPerGame[candidateIndex] ?? [];
  const candidatePositions = buildPositionMap(candidateRanking);
  let remainingChurnScore = 0;
  let maxRemainingShift = 0;

  for (let futureIndex = candidateIndex + 1; futureIndex < rankingsPerGame.length; futureIndex += 1) {
    const futurePositions = buildPositionMap(rankingsPerGame[futureIndex]);

    for (const name of playerNames) {
      const futurePosition = futurePositions.get(name);
      const finalPosition = finalPositions.get(name);
      const candidatePosition = candidatePositions.get(name);
      if (futurePosition == null || finalPosition == null || candidatePosition == null) continue;

      const shiftToFinal = Math.abs(futurePosition - finalPosition);
      const shiftFromCandidate = Math.abs(futurePosition - candidatePosition);
      const weight = finalPosition < 3 ? 2 : 1;
      remainingChurnScore += shiftToFinal * weight;
      maxRemainingShift = Math.max(maxRemainingShift, shiftFromCandidate);
    }
  }

  return {
    index: candidateIndex,
    remainingChurnScore,
    maxRemainingShift,
  };
}

function topSliceMatches(left: string[], right: string[], topCount: number): boolean {
  for (let index = 0; index < topCount; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

export function findTimelineKeyMarker(
  rankingsPerGame: string[][],
  playedGames: Game[],
  playerNames: string[],
  requestedTopCount: number,
): TimelineKeyMarker | null {
  if (playedGames.length < 3 || rankingsPerGame.length !== playedGames.length) {
    return null;
  }

  const topCount = Math.min(requestedTopCount, playerNames.length);
  let selectedCandidateIndex = rankingsPerGame.length - 1;

  for (let candidateIndex = 1; candidateIndex < rankingsPerGame.length; candidateIndex += 1) {
    const candidateRanking = rankingsPerGame[candidateIndex] ?? [];
    let remainsStable = true;

    for (let futureIndex = candidateIndex + 1; futureIndex < rankingsPerGame.length; futureIndex += 1) {
      const futureRanking = rankingsPerGame[futureIndex] ?? [];
      if (!topSliceMatches(candidateRanking, futureRanking, topCount)) {
        remainsStable = false;
        break;
      }
    }

    if (remainsStable) {
      selectedCandidateIndex = candidateIndex;
      break;
    }
  }

  const game = playedGames[selectedCandidateIndex];
  const label = requestedTopCount === 1 ? 'Top 1' : `Top ${requestedTopCount}`;

  return {
    label,
    topCount: requestedTopCount,
    gameId: game.id,
    game: getGameLabelShort(game),
    gameLabel: `${game.home} vs ${game.away}`,
    summary: `${label} unchanged from this point onward.`,
  };
}

export function findTimelineStabilityMarker(
  rankingsPerGame: string[][],
  playedGames: Game[],
  playerNames: string[],
): TimelineStabilityMarker | null {
  if (playedGames.length < 3 || rankingsPerGame.length !== playedGames.length) {
    return null;
  }

  const churnThreshold = Math.ceil(playerNames.length * 1.5);
  let selectedCandidate: StabilityCandidate | null = null;

  for (let candidateIndex = 1; candidateIndex < rankingsPerGame.length - 1; candidateIndex += 1) {
    const candidate = scoreRemainingChurn(rankingsPerGame, playerNames, candidateIndex);
    if (candidate.maxRemainingShift <= 2 && candidate.remainingChurnScore <= churnThreshold) {
      selectedCandidate = candidate;
      break;
    }
  }

  const fallbackCandidate = scoreRemainingChurn(rankingsPerGame, playerNames, rankingsPerGame.length - 1);
  const resolvedCandidate = selectedCandidate ?? fallbackCandidate;
  const game = playedGames[resolvedCandidate.index];

  return {
    gameId: game.id,
    game: getGameLabelShort(game),
    gameLabel: `${game.home} vs ${game.away}`,
    remainingChurnScore: resolvedCandidate.remainingChurnScore,
    maxRemainingShift: resolvedCandidate.maxRemainingShift,
    summary:
      selectedCandidate == null
        ? 'Placements only fully settled near the finish.'
        : 'Top order mostly settled here; only minor swaps remained after this point.',
  };
}

function buildTimelineKeyMarkers(
  rankingsPerGame: string[][],
  playedGames: Game[],
  playerNames: string[],
): TimelineKeyMarker[] {
  return [10, 5, 3, 1]
    .filter((topCount, index, array) => topCount <= playerNames.length && array.indexOf(topCount) === index)
    .map((topCount) => findTimelineKeyMarker(rankingsPerGame, playedGames, playerNames, topCount))
    .filter((marker): marker is TimelineKeyMarker => marker != null);
}

function buildSingleTimeline(system: ScoringSystem, games: Game[], predictions: Prediction[]): SystemTimeline {
  const isElo = system.name === 'Ladder';
  const standings = system.calculateStandings(games, predictions);
  const playedGames = games
    .filter((g) => g.homeScore !== null && g.awayScore !== null)
    .sort((a, b) => a.id - b.id);

  const playerNames = standings.map((s) => s.name);
  const byName = new Map<string, PlayerScore>(standings.map((player) => [player.name, player]));
  const deltaByPlayer = new Map<string, Map<number, number>>();
  const running = new Map<string, number>();
  const perPlayerDeltas = new Map<string, number[]>();

  for (const name of playerNames) {
    running.set(name, isElo ? 1000 : 0);
    perPlayerDeltas.set(name, []);
    const player = byName.get(name);
    const deltas = new Map<number, number>();
    for (const breakdown of player?.gameBreakdowns ?? []) {
      deltas.set(breakdown.gameId, breakdown.points.total);
    }
    deltaByPlayer.set(name, deltas);
  }

  const chartData: Record<string, string | number>[] = [];

  for (const game of playedGames) {
    const entry: Record<string, string | number> = {
      game: getGameLabelShort(game),
      gameLabel: `${game.home} vs ${game.away}`,
      gameId: game.id,
    };

    for (const name of playerNames) {
      const delta = deltaByPlayer.get(name)?.get(game.id) ?? 0;
      perPlayerDeltas.get(name)?.push(delta);
      const next = (running.get(name) ?? (isElo ? 1000 : 0)) + delta;
      running.set(name, next);
      entry[name] = next;
    }

    chartData.push(entry);
  }

  let fastestLap: TimelineFastestLap | null = null;
  if (playedGames.length > 0 && playerNames.length > 0) {
    const ranked = playerNames
      .map((name) => {
        const deltas = perPlayerDeltas.get(name) ?? [];
        const sum = deltas.reduce((total, delta) => total + delta, 0);
        return { name, avg: sum / playedGames.length };
      })
      .sort((a, b) => b.avg - a.avg || a.name.localeCompare(b.name));

    fastestLap = {
      name: ranked[0].name,
      avgPointsPerGame: ranked[0].avg,
    };
  }

  const pitStops: TimelinePitStop[] = [];

  const rankingsPerGame = chartData.map((entry) => {
    return [...playerNames].sort((a, b) => {
      const valueA = Number(entry[a] ?? 0);
      const valueB = Number(entry[b] ?? 0);
      return valueB - valueA || a.localeCompare(b);
    });
  });

  const keyMarkers = buildTimelineKeyMarkers(rankingsPerGame, playedGames, playerNames);
  const stabilityMarker = findTimelineStabilityMarker(rankingsPerGame, playedGames, playerNames);

  // Pit-stop markers: position jumps and leader changes.
  for (let i = 1; i < rankingsPerGame.length; i += 1) {
    const previousRanking = rankingsPerGame[i - 1];
    const currentRanking = rankingsPerGame[i];
    const game = playedGames[i];
    const gameLabel = `${game.home} vs ${game.away}`;
    const gameShort = getGameLabelShort(game);

    const previousPos = new Map(previousRanking.map((name, index) => [name, index]));
    const currentPos = new Map(currentRanking.map((name, index) => [name, index]));

    for (const name of playerNames) {
      const from = previousPos.get(name);
      const to = currentPos.get(name);
      if (from == null || to == null) continue;
      const shift = Math.abs(from - to);

      if (shift >= 3) {
        pitStops.push({
          type: 'position-change',
          gameId: game.id,
          game: gameShort,
          gameLabel,
          playerName: name,
          magnitude: shift,
          detail: `P${from + 1} to P${to + 1}`,
        });
      }
    }

    if (previousRanking[0] !== currentRanking[0]) {
      pitStops.push({
        type: 'leader-change',
        gameId: game.id,
        game: gameShort,
        gameLabel,
        playerName: currentRanking[0],
        magnitude: 1,
        detail: `${previousRanking[0]} to ${currentRanking[0]}`,
      });
    }
  }

  const lastEntry = chartData[chartData.length - 1];
  const timingTower: TimingTowerEntry[] = playerNames.map((name, index) => {
    const total = Number(lastEntry?.[name] ?? 0);
    const aboveTotal = index > 0 ? Number(lastEntry?.[playerNames[index - 1]] ?? 0) : total;
    return {
      name,
      position: index + 1,
      total,
      gapToAbove: Math.max(0, aboveTotal - total),
      isFastestLap: fastestLap?.name === name,
    };
  });

  return {
    systemName: system.name,
    description: system.description,
    isElo,
    playerNames,
    chartData,
    pitStops,
    keyMarkers,
    stabilityMarker,
    fastestLap,
    timingTower,
  };
}

export function buildSystemTimelines(
  systems: ScoringSystem[],
  games: Game[],
  predictions: Prediction[],
): SystemTimeline[] {
  return systems.map((system) => buildSingleTimeline(system, games, predictions));
}
