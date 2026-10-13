import { lazy, Suspense, useEffect } from 'react';
import { routeToHash, useRoute, type Route } from './router';

// Only dev and e2e builds include the gallery; in production the branch is removed at build time.
const GALLERY_ENABLED = import.meta.env.DEV || import.meta.env.MODE === 'e2e';
const GalleryScreen = GALLERY_ENABLED
  ? lazy(() => import('../screens/GalleryScreen').then((m) => ({ default: m.GalleryScreen })))
  : null;

export function App() {
  const parsed = useRoute();
  const route: Route = parsed.name === 'gallery' && !GalleryScreen ? { name: 'home' } : parsed;
  const hash = routeToHash(route);
  // SPEC 7.2: unknown routes redirect to #/, so the address bar never keeps a bad hash.
  useEffect(() => {
    const current = window.location.hash;
    if (current !== '' && current !== hash) window.history.replaceState(null, '', hash);
  }, [hash, parsed]);
  if (route.name === 'gallery' && GalleryScreen) {
    return (
      <Suspense fallback={<p>Loading…</p>}>
        <GalleryScreen />
      </Suspense>
    );
  }
  return (
    <main>
      <h1>Sheet Music 101</h1>
      <p>Coming soon.</p>
      <p data-testid="build-id">Version {__BUILD_ID__}</p>
    </main>
  );
}
