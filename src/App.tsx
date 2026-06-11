import { useMemo, useState } from 'react'
import { parseGames, parsePredictions } from './utils/parseData'
import { scoringSystems, calculateStandings } from './utils/scoring'
import Leaderboard from './components/Leaderboard'
import GameCard from './components/GameCard'
import ScoringSelector from './components/ScoringSelector'
import './App.css'

function App() {
  const games = useMemo(() => parseGames(), [])
  const predictions = useMemo(() => parsePredictions(), [])

  const [selectedSystem, setSelectedSystem] = useState(scoringSystems[0])
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)

  const standings = useMemo(
    () => calculateStandings(games, predictions, selectedSystem),
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
          onClose={() => setSelectedGameId(null)}
        />
      ) : (
        <Leaderboard
          standings={standings}
          games={games}
          onSelectGame={setSelectedGameId}
        />
      )}
    </div>
  )
}

export default App
