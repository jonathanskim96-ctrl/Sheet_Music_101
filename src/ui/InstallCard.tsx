import { INSTALL_CARD } from '../domain/content';
import { Button } from './Button';
import { Download, Share } from './icons';
import styles from './NudgeCard.module.css';

export interface InstallCardProps {
  /** iPhone/iPad: show the Share → Add to Home Screen steps instead of a button. */
  ios: boolean;
  /** The browser offered an install prompt: show "Install". */
  canPrompt: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

/** Asks the learner to add the app to the home screen, where its data is kept safe (SPEC 5.3). */
export function InstallCard({ ios, canPrompt, onInstall, onDismiss }: InstallCardProps) {
  return (
    <section className={styles['card']} data-testid="install-card" aria-labelledby="install-title">
      <div className={styles['head']}>
        {ios ? (
          <Share size={28} aria-hidden="true" className={styles['icon']} />
        ) : (
          <Download size={28} aria-hidden="true" className={styles['icon']} />
        )}
        <h2 id="install-title" className={styles['title']}>
          {INSTALL_CARD.title}
        </h2>
      </div>
      <p className={styles['body']}>
        {INSTALL_CARD.body}
        {ios && ` ${INSTALL_CARD.iosExtra}`}
      </p>
      <div className={styles['buttons']}>
        {canPrompt && !ios && <Button onClick={onInstall}>{INSTALL_CARD.install}</Button>}
        <Button variant="ghost" onClick={onDismiss}>
          {INSTALL_CARD.dismiss}
        </Button>
      </div>
    </section>
  );
}
