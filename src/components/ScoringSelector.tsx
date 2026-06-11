import type { ScoringSystem } from '../types';

interface ScoringSelectorProps {
  systems: ScoringSystem[];
  selected: ScoringSystem;
  onSelect: (system: ScoringSystem) => void;
}

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
