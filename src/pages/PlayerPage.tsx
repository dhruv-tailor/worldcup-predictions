import { Navigate, useNavigate, useParams } from 'react-router';
import { useAppContext } from '../context/useAppContext';
import { scoringSystems } from '../utils/scoring';
import PlayerProfile from '../components/PlayerProfile';

export default function PlayerPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const { standings, games, predictions, selectedSystem } = useAppContext();

  const decodedName = decodeURIComponent(name ?? '');
  const player = standings.find((p) => p.name === decodedName);
  const playerNames = standings.map((p) => p.name);

  if (!player) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="player-page-wrap">
      <div className="player-controls">
        <div className="player-control">
          <label htmlFor="player-select">Player</label>
          <select
            id="player-select"
            value={player.name}
            onChange={(e) => navigate(`/player/${encodeURIComponent(e.target.value)}`)}
          >
            {playerNames.map((playerName) => (
              <option key={playerName} value={playerName}>{playerName}</option>
            ))}
          </select>
        </div>
      </div>

      <PlayerProfile
        player={player}
        games={games}
        predictions={predictions}
        selectedSystem={selectedSystem}
        systems={scoringSystems}
      />
    </div>
  );
}
