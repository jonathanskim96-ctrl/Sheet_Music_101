import { LevelStars } from './LevelStars';
import styles from './UnitHeader.module.css';

export interface UnitHeaderProps {
  n: number;
  title: string;
  subtitle: string;
  /** Token name of the unit colour, e.g. '--unit-2'. */
  color: string;
  /** Level stars: completed levels out of the unit's levels. */
  stars?: { level: number; max: number };
  /** "Level 2" / "Level 3" buttons for the levels the learner can start. */
  levels?: readonly { level: 2 | 3; onPress: () => void }[];
}

/** Coloured banner that starts each unit on the path. */
export function UnitHeader({ n, title, subtitle, color, stars, levels = [] }: UnitHeaderProps) {
  return (
    <header className={styles['header']} style={{ background: `var(${color})` }}>
      <div className={styles['top']}>
        <p className={styles['kicker']}>Unit {n}</p>
        {stars && <LevelStars level={stars.level} max={stars.max} tone="light" />}
      </div>
      <h2 className={styles['title']}>{title}</h2>
      <p className={styles['subtitle']}>{subtitle}</p>
      {levels.length > 0 && (
        <div className={styles['levels']}>
          {levels.map(({ level, onPress }) => (
            <button
              key={level}
              type="button"
              className={styles['levelButton']}
              style={{ color: `var(${color})` }}
              data-testid={`unit-${String(n)}-level-${String(level)}`}
              onClick={onPress}
            >
              Level {level}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
