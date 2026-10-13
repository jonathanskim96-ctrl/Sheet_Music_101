import { navigate } from '../app/router';
import { Button } from '../ui/Button';
import styles from './WelcomeScreen.module.css';

/** "Coming soon" stand-in for screens that arrive in a later milestone (Progress, Settings). */
export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <main className={styles['page']}>
      <h1>{title}</h1>
      <p className={styles['body']}>Coming soon.</p>
      <Button
        fullWidth
        onClick={() => {
          navigate({ name: 'home' });
        }}
      >
        Back to the lessons
      </Button>
    </main>
  );
}
