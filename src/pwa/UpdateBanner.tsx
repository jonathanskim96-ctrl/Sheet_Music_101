import { Button } from '../ui/Button';
import { useUpdateReady } from './register';
import styles from './UpdateBanner.module.css';

/** "A new version is ready." with Reload. Never reloads by itself (it could interrupt a lesson). */
export function UpdateBanner() {
  const ready = useUpdateReady();
  if (!ready) return null;
  return (
    <div className={styles['banner']} role="status" data-testid="update-banner">
      <span>A new version is ready.</span>
      <Button
        variant="secondary"
        onClick={() => {
          window.location.reload();
        }}
      >
        Reload
      </Button>
    </div>
  );
}
