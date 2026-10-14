import { CHECKPOINT_NODE } from '../domain/content';
import { Trophy } from './icons';
import styles from './CheckpointNode.module.css';

export interface CheckpointNodeProps {
  id: string;
  title: string;
  /** True once the unit before the checkpoint is finished. */
  reached: boolean;
  onPress: () => void;
}

/** The trophy on the Path between units: a test that lets the learner jump ahead. */
export function CheckpointNode({ id, title, reached, onPress }: CheckpointNodeProps) {
  return (
    <button
      type="button"
      className={styles['node']}
      data-testid={`checkpoint-${id}`}
      data-reached={reached}
      onClick={onPress}
    >
      <span className={styles['trophy']} aria-hidden="true">
        <Trophy size={30} />
      </span>
      <span className={styles['text']}>
        <span className={styles['title']}>{title}</span>
        <span className={styles['hint']}>
          {reached ? CHECKPOINT_NODE.testYourself : CHECKPOINT_NODE.jumpAhead}
        </span>
      </span>
    </button>
  );
}
