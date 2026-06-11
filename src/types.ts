export interface Game {
  id: number;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface Prediction {
  name: string;
  gameId: number;
  homeScore: number;
  awayScore: number;
}

export interface PointBreakdown {
  winner: number;
  goalDifference: number;
  exactScore: number;
  total: number;
}

export interface GameBreakdown {
  gameId: number;
  prediction: Prediction;
  points: PointBreakdown;
}

export interface PlayerScore {
  name: string;
  totalPoints: number;
  gameBreakdowns: GameBreakdown[];
}

export type ScoringFunction = (game: Game, prediction: Prediction) => PointBreakdown;

export interface ScoringSystem {
  name: string;
  description: string;
  calculate: ScoringFunction;
}
