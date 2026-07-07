/**
 * Represents a single World Cup match.
 * Scores are null for games that haven't been played yet.
 */
export interface Game {
  /** Unique sequential game identifier — games are played in ID order */
  id: number;
  /** Home team name */
  home: string;
  /** Away team name */
  away: string;
  /** Home team's final score, or null if the game hasn't been played */
  homeScore: number | null;
  /** Away team's final score, or null if the game hasn't been played */
  awayScore: number | null;
  /**
   * Penalty shootout result, only set when the game ended in a draw and went to penalties.
   * 'W' = home team won the shootout, 'L' = home team lost.
   */
  homeWin?: 'W' | 'L' | null;
}

/**
 * A single player's predicted score for a specific game.
 */
export interface Prediction {
  /** Player name */
  name: string;
  /** References {@link Game.id} */
  gameId: number;
  /** Predicted home team score */
  homeScore: number;
  /** Predicted away team score */
  awayScore: number;
  /**
   * Predicted penalty shootout winner, only relevant when predicting a draw score.
   * 'W' = home team wins the shootout, 'L' = home team loses.
   */
  homeWin?: 'W' | 'L' | null;
}

/**
 * A player's pre-tournament pick for tournament champion.
 */
export interface FinalWinnerPrediction {
  /** Player name */
  name: string;
  /** Predicted champion nation */
  nation: string;
}

/**
 * Points earned for a single game under a specific scoring system.
 * Uses a flexible `categories` map so each scoring system can define
 * its own breakdown keys (e.g. "winner", "goalDifference", "streakBonus").
 */
export interface PointBreakdown {
  /** Per-category point values — keys are defined by each {@link ScoringSystem}'s `categoryLabels` */
  categories: Record<string, number>;
  /** Sum of all category values */
  total: number;
}

/**
 * Links a player's prediction for a specific game to the points they earned.
 */
export interface GameBreakdown {
  /** The game this breakdown is for */
  gameId: number;
  /** The player's original prediction */
  prediction: Prediction;
  /** Points earned under the active scoring system */
  points: PointBreakdown;
}

/**
 * Aggregated score for a single player across all games.
 */
export interface PlayerScore {
  /** Player name */
  name: string;
  /** Cumulative points (or final ELO rating for Ladder mode) */
  totalPoints: number;
  /** Total points before final winner side-pot bonus is applied */
  basePoints?: number;
  /** Pre-tournament champion pick from final_winner_predictions.csv */
  finalWinnerPick?: string | null;
  /** Whether the player's champion pick matched the actual champion */
  pickedChampion?: boolean;
  /** Side-pot bonus awarded for picking the champion */
  finalWinnerBonus?: number;
  /** Per-game point breakdowns, ordered by game ID */
  gameBreakdowns: GameBreakdown[];
  /** Current consecutive correct-winner streak (Hot Streak only) */
  currentStreak?: number;
  /** Longest consecutive correct-winner streak achieved (Hot Streak only) */
  longestStreak?: number;
  /** Number of exact score/result predictions (Ted Classic, Ted+, Ted28) */
  exactCount?: number;
  /** Percentage of played games with correct winner prediction (Ted Classic) */
  winnerPct?: number;
  /** Number of games scoring maximum points (Ted+, Ted28, Participation Trophy) */
  perfectCount?: number;
  /** Highest uniqueness multiplier achieved on a correct prediction (Gambler's) */
  bestMultiplier?: number;
  /** Average uniqueness multiplier across correct predictions (Gambler's) */
  avgMultiplier?: number;
  /** Highest ELO rating ever achieved (Ladder) */
  peakRating?: number;
  /** Lowest ELO rating ever reached (Ladder) */
  lowestRating?: number;
  /** Percentage of games where player beat the crowd average (Black Sheep) */
  crowdBeatPct?: number;
  /** Average edge over the crowd across all games (Black Sheep) */
  avgEdge?: number;
  /** Base system with highest average normalized score (Aggregates) */
  bestSystem?: string;
  /** Base system with lowest average normalized score (Aggregates) */
  worstSystem?: string;
}

/**
 * Maps a scoring category key to its display label for the UI.
 * Used to dynamically render column headers in the GameCard detail view.
 */
export interface CategoryLabel {
  /** Internal key matching a key in {@link PointBreakdown.categories} */
  key: string;
  /** Human-readable column header (e.g. "Winner", "GD", "Streak") */
  label: string;
}

/**
 * Defines a complete scoring system with its own calculation logic.
 *
 * Each system owns its full `calculateStandings` pipeline, allowing
 * stateful systems (Ladder, Hot Streak) and context-aware systems
 * (Gambler's) alongside simple per-game systems (Ted Classic, Margins).
 */
export interface ScoringSystem {
  /** Display name shown in the scoring selector dropdown */
  name: string;
  /** Short description of the scoring rules */
  description: string;
  /** Defines the point breakdown columns rendered in the game detail view */
  categoryLabels: CategoryLabel[];
  /** Maximum points achievable per game — used to scale color thresholds in the UI */
  maxPerGame?: number;
  /**
   * Computes the full leaderboard standings for all players.
   * @param games - All games (played and unplayed), will be processed in ID order
   * @param predictions - All player predictions across all games
   * @returns Sorted array of player scores (descending by total points)
   */
  calculateStandings: (games: Game[], predictions: Prediction[]) => PlayerScore[];
}
