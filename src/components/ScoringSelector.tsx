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
            {system.name}
          </option>
        ))}
      </select>
      <span className="scoring-desc">{selected.description}</span>
    </div>
  );
}
