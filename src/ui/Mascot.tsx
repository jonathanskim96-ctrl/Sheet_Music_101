import styles from './Mascot.module.css';

export type MascotMood = 'idle' | 'happy' | 'encouraging' | 'celebrating';

export interface MascotProps {
  mood?: MascotMood;
  size?: 48 | 96 | 160;
  /** Optional speech bubble shown above Quaver. */
  say?: string;
}

/** "Quaver", the eighth-note mascot. Never looks sad: a wrong answer gets `encouraging`. */
export function Mascot({ mood = 'idle', size = 96, say }: MascotProps) {
  const open = mood === 'happy' || mood === 'celebrating';
  const mouth =
    mood === 'celebrating'
      ? 'M36 104 Q50 132 64 104 Z'
      : mood === 'happy'
        ? 'M40 106 Q50 124 60 106 Z'
        : mood === 'encouraging'
          ? 'M44 109 Q50 113 56 109'
          : 'M42 108 Q50 116 58 108';
  const animation = mood === 'happy' || mood === 'celebrating' ? styles[mood] : undefined;
  return (
    <div className={styles['wrap']}>
      {say !== undefined && <div className={styles['bubble']}>{say}</div>}
      <svg
        className={animation}
        viewBox="0 0 120 140"
        width={size}
        height={(size * 140) / 120}
        role="img"
        aria-label={`Quaver the music note, ${mood}`}
        data-testid="mascot"
        data-mood={mood}
      >
        <g transform={mood === 'encouraging' ? 'rotate(8 50 100)' : undefined}>
          <line
            className={styles['stem']}
            x1="81"
            y1="100"
            x2="81"
            y2="16"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path className={styles['flag']} d="M81 16 C98 28 116 40 108 72 C104 54 96 48 81 44 Z" />
          {mood === 'celebrating' && (
            <>
              <line
                className={styles['arm']}
                x1="18"
                y1="96"
                x2="6"
                y2="70"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <line
                className={styles['arm']}
                x1="64"
                y1="82"
                x2="62"
                y2="56"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </>
          )}
          <ellipse className={styles['head']} cx="50" cy="100" rx="34" ry="28" />
          <circle className={styles['eye']} cx="39" cy="93" r="7" />
          <circle className={styles['eye']} cx="61" cy="93" r="7" />
          <circle className={styles['pupil']} cx="41" cy="94" r="3.5" />
          <circle className={styles['pupil']} cx="63" cy="94" r="3.5" />
          <circle className={styles['cheek']} cx="28" cy="108" r="5" />
          <circle className={styles['cheek']} cx="72" cy="108" r="5" />
          <path
            className={open ? styles['mouthOpen'] : styles['mouth']}
            d={mouth}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}
