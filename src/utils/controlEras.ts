import type { PlayerScore } from '../types';

export interface EraSegment {
  label: string;
  startGameId: number;
  endGameId: number;
  type: 'stable' | 'chaotic';
  playerName?: string;
  isGoldenAge?: boolean;
  dynastyIndex?: number;
}

export interface EraLabels {
  stable: (player: string) => string;
  chaotic: string;
  goldenAge: (player: string) => string;
}

export interface ControlRankSnapshot {
  gameId: number;
  top1: Set<string>;
  top2: Set<string>;
  top3: Set<string>;
}

export type GoldenAgeBand = 'top1' | 'top2' | 'top3';

function toRoman(n: number): string {
  const numerals: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  for (const [value, numeral] of numerals) {
    while (n >= value) {
      result += numeral;
      n -= value;
    }
  }
  return result;
}

export function getPlayersAtRank(standings: PlayerScore[], rank: number): string[] {
  if (standings.length === 0) return [];

  const tiers: { points: number; players: string[] }[] = [];
  for (const player of standings) {
    const last = tiers[tiers.length - 1];
    if (last && last.points === player.totalPoints) {
      last.players.push(player.name);
    } else {
      tiers.push({ points: player.totalPoints, players: [player.name] });
    }
  }

  let currentRank = 1;
  for (const tier of tiers) {
    if (currentRank === rank) return tier.players;
    if (currentRank > rank) return [];
    currentRank += tier.players.length;
  }
  return [];
}

function playerHasBandWithinEra(
  rankSnapshots: ControlRankSnapshot[],
  playerName: string,
  startGameId: number,
  endGameId: number,
  goldenAgeBand: GoldenAgeBand,
): boolean {
  return rankSnapshots.some((snapshot) => {
    if (snapshot.gameId < startGameId || snapshot.gameId > endGameId) {
      return false;
    }
    return snapshot[goldenAgeBand].has(playerName);
  });
}

export function computeEras(
  data: Record<string, string | number>[],
  names: string[],
  systemCount: number,
  labels: EraLabels,
  rankSnapshots: ControlRankSnapshot[],
  goldenAgeBand: GoldenAgeBand,
): EraSegment[] {
  const computedEras: EraSegment[] = [];
  const stableThreshold = Math.floor(systemCount / 2) + 1;
  const playerDynastyIndex = new Map<string, number>();

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
    const previous = computedEras[computedEras.length - 1];

    const sameEra =
      !!previous &&
      previous.type === (isStable ? 'stable' : 'chaotic') &&
      ((isStable && previous.playerName === stablePlayer) || (!isStable && !previous.playerName));

    if (sameEra) {
      previous.endGameId = gameId;
      continue;
    }

    let dynastyIndex: number | undefined;
    if (isStable && stablePlayer) {
      const index = (playerDynastyIndex.get(stablePlayer) ?? 0) + 1;
      playerDynastyIndex.set(stablePlayer, index);
      dynastyIndex = index;
    }

    computedEras.push({
      label: isStable ? labels.stable(stablePlayer!) : labels.chaotic,
      startGameId: gameId,
      endGameId: gameId,
      type: isStable ? 'stable' : 'chaotic',
      playerName: stablePlayer,
      isGoldenAge: false,
      dynastyIndex,
    });
  }

  const totalDynasties = new Map<string, number>();
  for (const era of computedEras) {
    if (era.type === 'stable' && era.playerName) {
      totalDynasties.set(era.playerName, (totalDynasties.get(era.playerName) ?? 0) + 1);
    }
  }

  const displayName = (playerName: string, dynastyIndex: number | undefined): string => {
    const total = totalDynasties.get(playerName) ?? 1;
    if (total > 1 && dynastyIndex !== undefined) {
      return `${playerName} ${toRoman(dynastyIndex)}`;
    }
    return playerName;
  };

  for (const era of computedEras) {
    if (era.type !== 'stable' || !era.playerName) continue;
    era.label = labels.stable(displayName(era.playerName, era.dynastyIndex));
  }

  for (const era of computedEras) {
    if (era.type !== 'stable' || !era.playerName) continue;

    const hadRequiredPlacementBand = playerHasBandWithinEra(
      rankSnapshots,
      era.playerName,
      era.startGameId,
      era.endGameId,
      goldenAgeBand,
    );

    if (hadRequiredPlacementBand) {
      era.label = labels.goldenAge(displayName(era.playerName, era.dynastyIndex));
      era.isGoldenAge = true;
    }
  }

  return computedEras;
}