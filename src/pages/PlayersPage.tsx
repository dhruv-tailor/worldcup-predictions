import { useCallback, useMemo, useRef, useState } from 'react';
import PlayerCard from '../components/PlayerCard';
import { useAppContext } from '../context/useAppContext';
import { scoringSystems } from '../utils/scoring';
import type { PlayerCardRarity } from '../utils/playerRadarStats';
import { buildPlayerCardSummaries } from '../utils/playerRadarStats';

type SortBy = 'rank' | 'name' | 'power';
type RarityFilter = 'all' | PlayerCardRarity;

export default function PlayersPage() {
  const { games, predictions } = useAppContext();
  const gridRef = useRef<HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('rank');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');

  const cardSummaries = useMemo(
    () => buildPlayerCardSummaries({ games, predictions, systems: scoringSystems }),
    [games, predictions],
  );

  const visibleCards = useMemo(() => {
    const filtered =
      rarityFilter === 'all'
        ? cardSummaries
        : cardSummaries.filter((card) => card.rarity === rarityFilter);

    const sorted = [...filtered];
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.playerName.localeCompare(b.playerName));
    } else if (sortBy === 'power') {
      sorted.sort((a, b) => b.powerRating - a.powerRating || a.rank - b.rank);
    } else {
      sorted.sort((a, b) => a.rank - b.rank);
    }

    return sorted;
  }, [cardSummaries, rarityFilter, sortBy]);

  const handleExportCards = useCallback(async () => {
    if (!gridRef.current || isExporting || visibleCards.length === 0) return;

    setIsExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(gridRef.current, {
        backgroundColor: '#f0e9d6',
        pixelRatio: 3,
      });
      const link = document.createElement('a');
      const filterSuffix = rarityFilter === 'all' ? 'all' : rarityFilter;
      link.download = `player-cards-${filterSuffix}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, rarityFilter, visibleCards.length]);

  const tierCounts = useMemo(() => {
    return cardSummaries.reduce(
      (acc, card) => {
        acc[card.rarity] += 1;
        return acc;
      },
      {
        legendary: 0,
        epic: 0,
        rare: 0,
        common: 0,
      },
    );
  }, [cardSummaries]);

  return (
    <div className="players-gallery-page">
      <header className="players-gallery-header">
        <div>
          <p className="players-gallery-kicker">Player Collection</p>
          <h2>Player Trading Cards</h2>
          <p>
            One card per player. Radar axes are scoring systems and rankings are computed overall.
          </p>
        </div>
        <div className="players-gallery-meta">
          <span>Total Cards: {cardSummaries.length}</span>
          <span>Legendary: {tierCounts.legendary}</span>
          <span>Epic: {tierCounts.epic}</span>
        </div>
      </header>

      <section className="players-gallery-controls" aria-label="Player card filters">
        <label>
          Sort
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)}>
            <option value="rank">Rank</option>
            <option value="name">Name</option>
            <option value="power">Power Rating</option>
          </select>
        </label>
        <label>
          Tier
          <select value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value as RarityFilter)}>
            <option value="all">All</option>
            <option value="legendary">Legendary</option>
            <option value="epic">Epic</option>
            <option value="rare">Rare</option>
            <option value="common">Common</option>
          </select>
        </label>
        <button
          type="button"
          className="players-print-btn export-btn"
          onClick={handleExportCards}
          disabled={isExporting || visibleCards.length === 0}
          title="Export cards as PNG"
        >
          {isExporting ? <><span className="spinner" />Exporting…</> : 'Export Cards PNG'}
        </button>
      </section>

      <section className="players-card-grid" aria-label="Player trading cards" ref={gridRef}>
        {visibleCards.map((card, index) => (
          <PlayerCard key={card.playerName} summary={card} index={index} />
        ))}
      </section>
    </div>
  );
}
