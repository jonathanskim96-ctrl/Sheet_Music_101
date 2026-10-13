import { lazy, Suspense, useEffect, useState } from 'react';
import { setAudioErrorHandler } from '../audio/synth';
import { findLesson } from '../domain/curriculum';
import { isPlayable } from '../domain/unlocks';
import { ProgressProvider, createProgressStore, useProgress } from '../data/ProgressContext';
import { UpdateBanner } from '../pwa/UpdateBanner';
import { BrokenDataScreen } from '../screens/BrokenDataScreen';
import { LessonScreen } from '../screens/LessonScreen';
import { PathScreen } from '../screens/PathScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { Mascot } from '../ui/Mascot';
import { StatusBanner } from '../ui/StatusBanner';
import { ErrorBoundary } from './ErrorBoundary';
import { routeToHash, useRoute, type Route } from './router';
import { ToastProvider, useToast } from './toasts';
import styles from './App.module.css';

// Only dev and e2e builds include the gallery; in production the branch is removed at build time.
const GALLERY_ENABLED = import.meta.env.DEV || import.meta.env.MODE === 'e2e';
const GalleryScreen = GALLERY_ENABLED
  ? lazy(() => import('../screens/GalleryScreen').then((m) => ({ default: m.GalleryScreen })))
  : null;

export function App() {
  // Created here so the error screen can still offer a backup of the last good progress.
  const [store] = useState(createProgressStore);
  return (
    <ErrorBoundary lastGoodProgress={() => store.lastGoodProgress()}>
      <ToastProvider>
        <ProgressProvider store={store}>
          <Shell />
        </ProgressProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

function errorMessage(value: unknown): string {
  if (value instanceof Error && value.message !== '') return value.message;
  if (typeof value === 'string' && value !== '') return value;
  return 'unknown error';
}

function Shell() {
  const parsed = useRoute();
  const toast = useToast();
  const state = useProgress();

  // Anything that escapes a handler is shown, never swallowed (SPEC 7.10).
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      toast(`Something went wrong: ${errorMessage(e.error ?? e.message)}`, 'error');
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      toast(`Something went wrong: ${errorMessage(e.reason)}`, 'error');
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [toast]);

  // Sound problems never break a lesson; the learner is told once.
  useEffect(() => {
    setAudioErrorHandler(() => {
      toast("Sound isn't available right now.");
    });
    return () => {
      setAudioErrorHandler(undefined);
    };
  }, [toast]);

  const loaded = state.status === 'ready' || state.status === 'unavailable';
  const progress = loaded ? state.progress : null;

  // Routes the build can't show (yet) go home; so does a locked or unknown lesson (SPEC 7.2).
  let route: Route = parsed;
  if (parsed.name === 'gallery' && !GalleryScreen) route = { name: 'home' };
  else if (parsed.name !== 'gallery') {
    if (progress && !progress.flags.welcomeSeen) route = { name: 'home' };
    else if (parsed.name === 'lesson') {
      if (progress && !isPlayable(progress, parsed.lessonId)) route = { name: 'home' };
    } else if (parsed.name === 'review' || parsed.name === 'checkpoint') {
      route = { name: 'home' }; // arrive in M6
    }
  }
  const hash = routeToHash(route);
  useEffect(() => {
    const current = window.location.hash;
    if (progress === null && parsed.name !== 'gallery') return; // wait until we know what is allowed
    if (current !== '' && current !== hash) window.history.replaceState(null, '', hash);
  }, [hash, parsed, progress]);

  if (route.name === 'gallery' && GalleryScreen) {
    return (
      <Suspense fallback={<p>Loading…</p>}>
        <GalleryScreen />
      </Suspense>
    );
  }
  if (state.status === 'loading') {
    return (
      <main className={styles['center']}>
        <Mascot mood="idle" size={96} />
        <p>Loading…</p>
      </main>
    );
  }
  if (state.status === 'broken') {
    return (
      <>
        <UpdateBanner />
        <BrokenDataScreen reason={state.reason} />
      </>
    );
  }

  let screen;
  // The Path shows the storage warning and save error as its own top card (SPEC 7.2).
  let banner = true;
  if (!progress?.flags.welcomeSeen) screen = <WelcomeScreen />;
  else if (route.name === 'lesson') {
    const def = findLesson(route.lessonId);
    screen = def ? <LessonScreen key={def.id} def={def} /> : <PathScreen />;
    banner = def !== undefined;
  } else if (route.name === 'progress') screen = <ProgressScreen />;
  else if (route.name === 'settings') screen = <SettingsScreen />;
  else {
    screen = <PathScreen />;
    banner = false;
  }

  return (
    <>
      <UpdateBanner />
      {banner && <StatusBanner />}
      {screen}
    </>
  );
}
