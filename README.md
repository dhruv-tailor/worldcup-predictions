# World Cup Predictions

A React app for tracking and scoring World Cup prediction competitions among friends. Supports 7 different scoring systems — from simple point-based to ELO ratings — with a live leaderboard, per-game breakdowns, and a score-over-time chart.

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **PapaParse** — CSV parsing
- **Recharts** — score chart visualization
- Dark-mode-only UI

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
```

## Data Files

All data lives in `src/data/` as semicolon-delimited CSVs.

**games.csv** — schedule and results:

```
id;home;away;home_score;away_score
1;Mexico;South Africa;;
2;South Korea;Czechia;;
3;Germany;Japan;2;1
```

Leave `home_score` and `away_score` empty for unplayed games.

**predictions.csv** — one row per player per game:

```
name;game_id;home_score;away_score
Raf;1;1;0
Didi;1;3;0
```

## Scoring Systems

| System | Type | Description |
|--------|------|-------------|
| **Ted Classic** | Simple | +2 correct winner, +1 goal difference, +1 exact score (max 4) |
| **Ted+** | Simple | Enhanced: +2/+3 winner (draws harder), +1 GD, +1 total goals, +2 exact (max 7) |
| **Gambler's** | Context-Aware | Uniqueness multiplier — bold predictions score more |
| **Ladder (ELO)** | Stateful | Chess-style ELO ratings, pairwise head-to-head per game |
| **Hot Streak** | Stateful | Ted Classic base + escalating bonus for consecutive correct winners |
| **Equal Aggregate** | Meta | Min-max normalized average across all 5 base systems |
| **Weighted Aggregate** | Meta | Weighted normalized average (Gam ×2, Lad ×1.5, HS ×1.5, TC ×1, T+ ×1) |

## Adding a Scoring System

1. Create a new file in `src/utils/scoring/` implementing the `ScoringSystem` interface
2. Add it to the `scoringSystems` array in `src/utils/scoring/index.ts`
3. If it's a base system, add it to both aggregate files as well

## Documentation

Open `docs.html` in a browser for full scoring rules, architecture details, and data format reference.
