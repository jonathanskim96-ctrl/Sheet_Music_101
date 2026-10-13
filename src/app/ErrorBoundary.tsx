import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import type { Progress } from '../domain/progress';
import { exportBackup } from '../data/files';
import { Button } from '../ui/Button';
import { Mascot } from '../ui/Mascot';
import styles from './App.module.css';

export interface ErrorBoundaryProps {
  /** The store's last good progress, for "Save a backup" (null if nothing was loaded). */
  lastGoodProgress: () => Progress | null;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// React only offers error boundaries as class components.
/** Catches a crash anywhere below and shows a calm screen with Reload and Save a backup. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('The app crashed', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;
    return <ErrorScreen message={error.message} progress={this.props.lastGoodProgress()} />;
  }
}

function ErrorScreen({ message, progress }: { message: string; progress: Progress | null }) {
  const [saveNote, setSaveNote] = useState<string | null>(null);
  return (
    <main className={styles['center']} data-testid="error-screen">
      <Mascot mood="encouraging" size={96} />
      <h1>Something went wrong.</h1>
      <pre className={styles['message']}>{message}</pre>
      <div className={styles['buttons']}>
        <Button
          fullWidth
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload
        </Button>
        {progress && (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              exportBackup(progress, new Date()).then(
                (outcome) => {
                  if (outcome !== 'cancelled') setSaveNote('Backup saved.');
                },
                (e: unknown) => {
                  setSaveNote(
                    `Something went wrong: ${e instanceof Error ? e.message : 'unknown error'}`,
                  );
                },
              );
            }}
          >
            Save a backup
          </Button>
        )}
      </div>
      {saveNote !== null && <p role="status">{saveNote}</p>}
    </main>
  );
}
