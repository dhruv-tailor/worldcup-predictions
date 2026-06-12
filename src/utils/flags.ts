import type { Game } from '../types';

const countryFlags: Record<string, string> = {
  'Algeria': '🇩🇿',
  'Argentina': '🇦🇷',
  'Australia': '🇦🇺',
  'Austria': '🇦🇹',
  'Belgium': '🇧🇪',
  'Bosnia and Herzegovina': '🇧🇦',
  'Brazil': '🇧🇷',
  'Cabo Verde': '🇨🇻',
  'Canada': '🇨🇦',
  'Colombia': '🇨🇴',
  'Croatia': '🇭🇷',
  'Curacao': '🇨🇼',
  'Czechia': '🇨🇿',
  'DR Congo': '🇨🇩',
  'Ecuador': '🇪🇨',
  'Equador': '🇪🇨',
  'Egypt': '🇪🇬',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Ghana': '🇬🇭',
  'Haiti': '🇭🇹',
  'Iran': '🇮🇷',
  'Iraq': '🇮🇶',
  'Ivory Coast': '🇨🇮',
  'Japan': '🇯🇵',
  'Jordan': '🇯🇴',
  'Mexico': '🇲🇽',
  'Morocco': '🇲🇦',
  'Netherlands': '🇳🇱',
  'New Zealand': '🇳🇿',
  'Norway': '🇳🇴',
  'Panama': '🇵🇦',
  'Paraguay': '🇵🇾',
  'Portugal': '🇵🇹',
  'Qatar': '🇶🇦',
  'Saudi Arabia': '🇸🇦',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Senegal': '🇸🇳',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  'Spain': '🇪🇸',
  'Sweden': '🇸🇪',
  'Switzerland': '🇨🇭',
  'Tunisia': '🇹🇳',
  'Turkey': '🇹🇷',
  'Uruguay': '🇺🇾',
  'USA': '🇺🇸',
  'Uzbekistan': '🇺🇿',
};

export function getFlag(country: string): string {
  return countryFlags[country] ?? country;
}

/** Compact label for tight spaces (e.g. leaderboard columns): "🇲🇽 🇿🇦" */
export function getGameLabelShort(game: Game): string {
  return `${getFlag(game.home)} ${getFlag(game.away)}`;
}

/** Full label with trophy next to winner: "🇲🇽 🏆 vs 🇿🇦" */
export function getGameLabel(game: Game): string {
  const homeWon = game.homeScore != null && game.awayScore != null && game.homeScore > game.awayScore;
  const awayWon = game.homeScore != null && game.awayScore != null && game.awayScore > game.homeScore;
  return `${getFlag(game.home)}${homeWon ? ' 🏆' : ''} vs ${awayWon ? '🏆 ' : ''}${getFlag(game.away)}`;
}
