import type { Game, PlayerScore, Prediction, ScoringSystem } from '../types';
import { getGameLabelShort } from './flags';

export interface SystemTimeline {
  systemName: string;
  description: string;
  isElo: boolean;
  playerNames: string[];
  chartData: Record<string, string | number>[];
}

function buildSingleTimeline(system: ScoringSystem, games: Game[], predictions: Prediction[]): SystemTimeline {
  const isElo = system.name === 'Ladder';
  const standings = system.calculateStandings(games, predictions);
  const playedGames = games
    .filter((g) => g.homeScore !== null && g.awayScore !== null)
    .sort((a, b) => a.id - b.id);

  const playerNames = standings.map((s) => s.name);
  const byName = new Map<string, PlayerScore>(standings.map((player) => [player.name, player]));
  const running = new Map<string, number>();

  for (const name of playerNames) {
    running.set(name, isElo ? 1000 : 0);
  }

  const chartData: Record<string, string | number>[] = [];

  for (const game of playedGames) {
    const entry: Record<string, string | number> = {
      game: getGameLabelShort(game),
      gameLabel: `${game.home} vs ${game.away}`,
      gameId: game.id,
    };

    for (const name of playerNames) {
      const player = byName.get(name);
      const breakdown = player?.gameBreakdowns.find((gb) => gb.gameId === game.id);
      const delta = breakdown?.points.total ?? 0;
      const next = (running.get(name) ?? (isElo ? 1000 : 0)) + delta;
      running.set(name, next);
      entry[name] = next;
    }

    chartData.push(entry);
  }

  return {
    systemName: system.name,
    description: system.description,
    isElo,
    playerNames,
    chartData,
  };
}

export function buildSystemTimelines(
  systems: ScoringSystem[],
  games: Game[],
  predictions: Prediction[],
): SystemTimeline[] {
  return systems.map((system) => buildSingleTimeline(system, games, predictions));
}
