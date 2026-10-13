import { lazy, Suspense, useEffect } from 'react';
import { setAudioErrorHandler } from '../audio/synth';
import { findLesson } from '../domain/curriculum';
import { isPlayable } from '../domain/unlocks';
import { ProgressProvider, useProgress } from '../data/ProgressContext';
import { LessonScreen } from '../screens/LessonScreen';
import { PathScreen } from '../screens/PathScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { Mascot } from '../ui/Mascot';
import { StatusBanner } from '../ui/StatusBanner';
import { routeToHash, useRoute, type Route } from './router';
import { ToastProvider, useToast } from './toasts';
import styles from './App.module.css';

// Only dev and e2e builds include the gallery; in production the branch is removed at build time.
const GALLERY_ENABLED = import.meta.env.DEV || import.meta.env.MODE === 'e2e';
const GalleryScreen = GALLERY_ENABLED
  ? lazy(() => import('../screens/GalleryScreen').then((m) => ({ default: m.GalleryScreen })))
  : null;

export function App() {
  return (
    <ToastProvider>
      <ProgressProvider>
        <Shell />
      </ProgressProvider>
    </ToastProvider>
  );
}

function Shell() {
  const parsed = useRoute();
  const toast = useToast();
  const state = useProgress();

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
      <main className={styles['center']}>
        <Mascot mood="encouraging" size={96} />
        <h1>We couldn't read your saved progress.</h1>
        <p>
          {/[.!?]$/.test(state.reason) ? state.reason : `${state.reason}.`} Nothing has been changed
          or deleted.
        </p>
        <button
          type="button"
          className={styles['reload']}
          onClick={() => {
            window.location.reload();
          }}
        >
          Try again
        </button>
      </main>
    );
  }

  let screen;
  if (!progress?.flags.welcomeSeen) screen = <WelcomeScreen />;
  else if (route.name === 'lesson') {
    const def = findLesson(route.lessonId);
    screen = def ? <LessonScreen key={def.id} def={def} /> : <PathScreen />;
  } else if (route.name === 'progress') screen = <PlaceholderScreen title="Progress" />;
  else if (route.name === 'settings') screen = <PlaceholderScreen title="Settings" />;
  else screen = <PathScreen />;

  return (
    <>
      <StatusBanner />
      {screen}
    </>
  );
}
