import { ArrowLeft } from './icons';
import styles from './ScreenHeader.module.css';

/** Title bar for Progress and Settings, with a back button to the lessons. */
export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className={styles['bar']}>
      <button type="button" className={styles['back']} aria-label="Back" onClick={onBack}>
        <ArrowLeft size={26} aria-hidden="true" />
      </button>
      <h1 className={styles['title']}>{title}</h1>
    </header>
  );
}
