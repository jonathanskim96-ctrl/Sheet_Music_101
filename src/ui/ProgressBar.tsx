import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
}

/** A horizontal bar showing value out of max (clamped to 0–100%). */
export function ProgressBar({ value, max, label = 'Progress' }: ProgressBarProps) {
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      className={styles['track']}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, Math.max(0, value))}
    >
      <div className={styles['fill']} style={{ width: `${String(fraction * 100)}%` }} />
    </div>
  );
}
