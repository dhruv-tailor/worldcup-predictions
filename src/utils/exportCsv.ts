import type { Game, Prediction } from '../types';

export function exportGamesCsv(games: Game[]): string {
  const header = 'id;home;away;home_score;away_score\n';
  const rows = games
    .map((game) => {
      const homeScore = game.homeScore !== null ? game.homeScore : '';
      const awayScore = game.awayScore !== null ? game.awayScore : '';
      return `${game.id};${game.home};${game.away};${homeScore};${awayScore}`;
    })
    .join('\n');
  return header + rows;
}

export function exportPredictionsCsv(predictions: Prediction[]): string {
  const header = 'name;game_id;home_score;away_score\n';
  const rows = predictions
    .map((pred) => `${pred.name};${pred.gameId};${pred.homeScore};${pred.awayScore}`)
    .join('\n');
  return header + rows;
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
