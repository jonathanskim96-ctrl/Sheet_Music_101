import { Star } from './icons';
import styles from './LevelStars.module.css';

export interface LevelStarsProps {
  /** Levels completed (0–3). */
  level: number;
  /** How many levels the unit has: 3, or 1 for units 1 and 11. */
  max: number;
  /** 'light' on a unit-colour background, 'normal' on the page. */
  tone?: 'light' | 'normal';
}

/** A row of stars, one filled per completed level. */
export function LevelStars({ level, max, tone = 'normal' }: LevelStarsProps) {
  return (
    <span
      className={`${styles['stars'] ?? ''} ${tone === 'light' ? (styles['light'] ?? '') : ''}`}
      role="img"
      aria-label={`${String(level)} of ${String(max)} ${max === 1 ? 'star' : 'stars'}`}
      data-testid="level-stars"
      data-level={level}
    >
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={20}
          aria-hidden="true"
          className={i < level ? styles['on'] : styles['off']}
        />
      ))}
    </span>
  );
}
