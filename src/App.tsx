import { useEffect, useMemo, useState } from 'react'
import { parseGames, parsePredictions } from './utils/parseData'
import { scoringSystems } from './utils/scoring'
import Leaderboard from './components/Leaderboard'
import CategoryBreakdown from './components/CategoryBreakdown'
import GameCard from './components/GameCard'
import ScoringSelector from './components/ScoringSelector'
import ScoreChart from './components/ScoreChart'
import UpcomingGames from './components/UpcomingGames'
import './App.css'

function App() {
  const games = useMemo(() => parseGames(), [])
  const predictions = useMemo(() => parsePredictions(), [])

  const [selectedSystem, setSelectedSystem] = useState(scoringSystems[0])
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

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
        <button
          className="theme-toggle"
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <ScoringSelector
        systems={scoringSystems}
        selected={selectedSystem}
        onSelect={setSelectedSystem}
      />

      {selectedGame ? (
        <GameCard
          game={selectedGame}
          games={games}
          standings={standings}
          system={selectedSystem}
          onClose={() => setSelectedGameId(null)}
          onSelectGame={setSelectedGameId}
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
          <UpcomingGames
            games={games}
            predictions={predictions}
          />
        </>
      )}
    </div>
  )
}

export default App
