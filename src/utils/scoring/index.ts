/**
 * Scoring system registry.
 *
 * Barrel export that aggregates all scoring systems into a single array.
 * To add a new scoring system, create a new file in this directory and
 * add it to the `scoringSystems` array below.
 *
 * @module scoring
 */

import type { ScoringSystem } from '../../types';

import tedClassic from './tedClassic';
import tedPlus from './tedPlus';
import gamblers from './gamblers';
import ladder from './ladder';
import hotStreak from './hotStreak';
import equalAggregate from './equalAggregate';
import weightedAggregate from './weightedAggregate';

/** All available scoring systems, in display order for the selector dropdown. */
export const scoringSystems: ScoringSystem[] = [
  tedClassic,
  tedPlus,
  gamblers,
  ladder,
  hotStreak,
  equalAggregate,
  weightedAggregate,
];
