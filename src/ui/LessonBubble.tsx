import type { Ref } from 'react';
import { Check, Lock } from './icons';
import styles from './LessonBubble.module.css';

export type BubbleState = 'completed' | 'current' | 'open' | 'locked';

export interface LessonBubbleProps {
  lessonId: string;
  title: string;
  state: BubbleState;
  /** Token name of the unit colour, e.g. '--unit-2'. */
  color: string;
  /** Sideways shift in px for the zig-zag. */
  offset: number;
  onPress: () => void;
  bubbleRef?: Ref<HTMLButtonElement> | undefined;
}

const SUFFIX: Record<BubbleState, string> = {
  completed: 'completed',
  current: 'start here',
  open: 'available',
  locked: 'locked',
};

/** A round lesson button on the path: done (check), current (pulsing, "Start"), open (available but not the current one, e.g. after a checkpoint jump) or locked. */
export function LessonBubble({
  lessonId,
  title,
  state,
  color,
  offset,
  onPress,
  bubbleRef,
}: LessonBubbleProps) {
  return (
    <div className={styles['item']} style={{ transform: `translateX(${String(offset)}px)` }}>
      {state === 'current' && (
        <span className={styles['start']} aria-hidden="true">
          Start
        </span>
      )}
      <button
        ref={bubbleRef}
        type="button"
        className={`${styles['bubble'] ?? ''} ${styles[state] ?? ''}`}
        style={state === 'locked' ? undefined : { color: `var(${color})` }}
        aria-label={`${title}, ${SUFFIX[state]}`}
        aria-disabled={state === 'locked'}
        data-testid={`bubble-${lessonId}`}
        data-state={state}
        onClick={onPress}
      >
        {state === 'locked' ? (
          <Lock size={28} aria-hidden="true" />
        ) : state === 'completed' ? (
          <Check size={34} strokeWidth={4} aria-hidden="true" />
        ) : (
          <span className={styles['dot']} aria-hidden="true" />
        )}
      </button>
      <span className={styles['label']}>{title}</span>
    </div>
  );
}
