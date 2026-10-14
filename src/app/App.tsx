import { lazy, Suspense, useEffect, useState } from 'react';
import { setAudioErrorHandler } from '../audio/synth';
import { somethingWentWrong } from '../domain/content';
import { findCheckpoint, findLesson } from '../domain/curriculum';
import { isAvailable, reviewAvailable } from '../domain/unlocks';
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

function Shell() {
  const parsed = useRoute();
  const toast = useToast();
  const state = useProgress();

  // Anything that escapes a handler is shown, never swallowed (SPEC 7.10).
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Browser noise (ResizeObserver loops, "Script error." from extensions) has no error object.
      if (e.error === null || e.error === undefined) {
        console.warn('Ignored a window error without an error object:', e.message);
        return;
      }
      toast(somethingWentWrong(e.error), 'error');
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      toast(somethingWentWrong(e.reason), 'error');
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

  // A locked or unknown lesson, or a review with too few cards, goes home (SPEC 7.2).
  let route: Route = parsed;
  if (parsed.name === 'gallery' && !GalleryScreen) route = { name: 'home' };
  else if (parsed.name !== 'gallery') {
    if (progress && !progress.flags.welcomeSeen) route = { name: 'home' };
    else if (parsed.name === 'lesson') {
      // isAvailable also says yes to checkpoint ids, which have their own route.
      const known = findLesson(parsed.lessonId) !== undefined;
      if (!known || (progress && !isAvailable(progress, parsed.lessonId))) route = { name: 'home' };
    } else if (parsed.name === 'review') {
      if (progress && !reviewAvailable(progress)) route = { name: 'home' };
    } else if (parsed.name === 'checkpoint') {
      if (!findCheckpoint(parsed.checkpointId)) route = { name: 'home' };
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
    screen = def ? <LessonScreen key={def.id} source={{ kind: 'lesson', def }} /> : <PathScreen />;
    banner = def !== undefined;
  } else if (route.name === 'checkpoint') {
    const checkpoint = findCheckpoint(route.checkpointId);
    screen = checkpoint ? (
      <LessonScreen key={checkpoint.id} source={{ kind: 'checkpoint', checkpoint }} />
    ) : (
      <PathScreen />
    );
    banner = checkpoint !== undefined;
  } else if (route.name === 'review')
    screen = <LessonScreen key="review" source={{ kind: 'review' }} />;
  else if (route.name === 'progress') screen = <ProgressScreen />;
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
