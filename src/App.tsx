import { useMemo, useState } from 'react'
import { parseGames, parsePredictions } from './utils/parseData'
import { scoringSystems } from './utils/scoring'
import Leaderboard from './components/Leaderboard'
import CategoryBreakdown from './components/CategoryBreakdown'
import GameCard from './components/GameCard'
import ScoringSelector from './components/ScoringSelector'
import ScoreChart from './components/ScoreChart'
import './App.css'

/**
 * Root application component for the World Cup Predictions calculator.
 *
 * Manages the top-level state:
 * - Which scoring system is active (from the dropdown)
 * - Which game is selected for detail view (or null for leaderboard)
 *
 * Data flow:
 * 1. CSVs are parsed once on mount via `useMemo` → `games[]` and `predictions[]`
 * 2. Standings are recalculated whenever the scoring system changes
 * 3. The active system's `calculateStandings` method handles all scoring logic
 * 4. Either the Leaderboard or GameCard is rendered based on selection state
 */
function App() {
  const games = useMemo(() => parseGames(), [])
  const predictions = useMemo(() => parsePredictions(), [])

  const [selectedSystem, setSelectedSystem] = useState(scoringSystems[0])
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)

  const standings = useMemo(
    () => selectedSystem.calculateStandings(games, predictions),
    [games, predictions, selectedSystem]
  )

  const selectedGame = selectedGameId !== null
    ? games.find((g) => g.id === selectedGameId) ?? null
    : null

  const playedCount = games.filter((g) => g.homeScore !== null).length

  return (
    <div className="app">
      <header className="app-header">
        <h1>⚽ World Cup Predictions</h1>
        <p className="subtitle">
          {playedCount} of {games.length} games played
        </p>
      </header>

      <ScoringSelector
        systems={scoringSystems}
        selected={selectedSystem}
        onSelect={setSelectedSystem}
      />

      {selectedGame ? (
        <GameCard
          game={selectedGame}
          standings={standings}
          system={selectedSystem}
          onClose={() => setSelectedGameId(null)}
        />
      ) : (
        <>
          <Leaderboard
            standings={standings}
            games={games}
            system={selectedSystem}
            onSelectGame={setSelectedGameId}
          />
          <CategoryBreakdown
            games={games}
            predictions={predictions}
          />
          <ScoreChart
            standings={standings}
            games={games}
            system={selectedSystem}
          />
        </>
      )}
    </div>
  )
}

export default App
