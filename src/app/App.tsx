import { GalleryScreen } from '../screens/GalleryScreen';
import { useRoute } from './router';

const GALLERY_ENABLED = import.meta.env.DEV || import.meta.env.MODE === 'e2e';

export function App() {
  const route = useRoute();
  if (route.name === 'gallery' && GALLERY_ENABLED) return <GalleryScreen />;
  return (
    <main>
      <h1>Sheet Music 101</h1>
      <p>Coming soon.</p>
      <p data-testid="build-id">Version {__BUILD_ID__}</p>
    </main>
  );
}
