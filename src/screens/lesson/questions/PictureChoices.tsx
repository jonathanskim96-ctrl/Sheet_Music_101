import type { ReactNode } from 'react';
import styles from './questions.module.css';

export interface PictureOption {
  /** What a screen reader says; never reveals the answer ("Top rhythm", "1-beat note"). */
  name: string;
  picture: ReactNode;
  state?: 'correct' | 'wrong';
}

/** Full-width buttons that each hold a picture of music; the right and the tapped one get an outline. */
export function PictureChoices({
  options,
  onPick,
  row = false,
}: {
  options: readonly PictureOption[];
  onPick: (index: 0 | 1 | 2) => void;
  /** Side by side instead of stacked (short pictures such as single notes). */
  row?: boolean;
}) {
  return (
    <div
      className={row ? styles['pictureRow'] : styles['pictures']}
      role="group"
      aria-label="Choose an answer"
    >
      {options.map((o, i) => (
        <button
          key={o.name}
          type="button"
          className={styles['picture']}
          aria-label={o.name}
          data-option-index={i}
          data-state={o.state}
          onClick={() => {
            if (i === 0 || i === 1 || i === 2) onPick(i);
          }}
        >
          {o.picture}
        </button>
      ))}
    </div>
  );
}
