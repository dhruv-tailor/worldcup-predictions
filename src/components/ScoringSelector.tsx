import type { ScoringSystem } from '../types';

interface ScoringSelectorProps {
  /** All available scoring systems */
  systems: ScoringSystem[];
  /** The currently active scoring system */
  selected: ScoringSystem;
  /** Callback when the user picks a different system */
  onSelect: (system: ScoringSystem) => void;
}

/**
 * Dropdown selector for switching between scoring systems.
 *
 * Renders a `<select>` populated from the systems array, with the
 * selected system's description shown alongside. The dropdown options
 * auto-populate from the scoring system registry — adding a new system
 * to the array in `scoring.ts` automatically makes it available here.
 */
export default function ScoringSelector({ systems, selected, onSelect }: ScoringSelectorProps) {
  const systemEmoji = (name: string) => {
    if (name === 'Ted Classic') return '🎯';
    if (name === 'Ted+') return '⭐';
    if (name === "Gambler's") return '🎰';
    if (name === '$5 Bets') return '💵';
    if (name === 'Ladder') return '🪜';
    if (name === 'Hot Streak') return '🔥';
    if (name === 'Participation Trophy') return '🏅';
    if (name === 'Equal Aggregate') return '⚖️';
    if (name === 'Weighted Aggregate') return '🏆';
    return '⚽';
  };

  return (
    <div className="scoring-selector">
      <label htmlFor="scoring-system">Scoring System:</label>
      <select
        id="scoring-system"
        value={selected.name}
        onChange={(e) => {
          const system = systems.find((s) => s.name === e.target.value);
          if (system) onSelect(system);
        }}
      >
        {systems.map((system) => (
          <option key={system.name} value={system.name}>
            {systemEmoji(system.name)} {system.name}
          </option>
        ))}
      </select>
      <span className="scoring-desc">{systemEmoji(selected.name)} {selected.description}</span>
    </div>
  );
}
