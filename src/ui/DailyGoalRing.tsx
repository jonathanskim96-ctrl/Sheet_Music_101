import { Check } from './icons';
import styles from './DailyGoalRing.module.css';

export interface DailyGoalRingProps {
  done: number;
  goal: number;
  size?: number;
}

const R = 16;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Ring that fills as lessons are finished today; green with a check when the goal is met. */
export function DailyGoalRing({ done, goal, size = 44 }: DailyGoalRingProps) {
  const fraction = goal > 0 ? Math.min(1, Math.max(0, done / goal)) : 0;
  const full = goal > 0 && done >= goal;
  return (
    <span
      className={styles['wrap']}
      role="img"
      aria-label={`Daily goal: ${String(done)} of ${String(goal)} lessons`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
        <circle className={styles['track']} cx="20" cy="20" r={R} fill="none" strokeWidth="5" />
        <circle
          className={`${styles['arc'] ?? ''} ${full ? (styles['full'] ?? '') : ''}`}
          cx="20"
          cy="20"
          r={R}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          transform="rotate(-90 20 20)"
        />
      </svg>
      <span className={styles['text']} aria-hidden="true">
        {full ? (
          <Check size={18} strokeWidth={4} className={styles['check']} />
        ) : (
          `${String(done)}/${String(goal)}`
        )}
      </span>
    </span>
  );
}
