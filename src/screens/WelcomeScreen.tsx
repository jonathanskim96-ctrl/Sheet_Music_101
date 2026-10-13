import { useState } from 'react';
import { WELCOME } from '../domain/content';
import { planFlag } from '../domain/planners';
import { useCommit } from '../data/ProgressContext';
import { Button } from '../ui/Button';
import { Mascot } from '../ui/Mascot';
import styles from './WelcomeScreen.module.css';

/** First-run screen: Quaver says hello; "Let's start" records that it has been seen. */
export function WelcomeScreen() {
  const commit = useCommit();
  const [busy, setBusy] = useState(false);
  const start = () => {
    setBusy(true);
    void commit((p) => planFlag(p, 'welcomeSeen', true)).then(() => {
      setBusy(false);
    });
  };
  return (
    <main className={styles['page']}>
      <Mascot mood="happy" size={160} say={WELCOME.bubble} />
      <h1>Sheet Music 101</h1>
      <p className={styles['body']}>{WELCOME.body}</p>
      <Button fullWidth disabled={busy} onClick={start}>
        {WELCOME.button}
      </Button>
      <p className={styles['version']} data-testid="build-id">
        Version {__BUILD_ID__}
      </p>
    </main>
  );
}
