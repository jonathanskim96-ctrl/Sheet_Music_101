import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'lesson'; lessonId: string }
  | { name: 'checkpoint'; checkpointId: string }
  | { name: 'review' }
  | { name: 'progress' }
  | { name: 'settings' }
  | { name: 'gallery' };

// Ids come from the URL, so only the characters real ids use are accepted.
const ID_RE = /^[A-Za-z0-9-]{1,40}$/;

/** Turns a location hash such as '#/lesson/u2-l1' into a Route; anything unknown is home. */
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  const parts = path.split('/').filter((part, i) => !(i === 0 && part === ''));
  const [first, second, ...rest] = parts;
  if (first === undefined) return { name: 'home' };
  const noExtra = second === undefined && rest.length === 0;
  switch (first) {
    case 'review':
      return noExtra ? { name: 'review' } : { name: 'home' };
    case 'progress':
      return noExtra ? { name: 'progress' } : { name: 'home' };
    case 'settings':
      return noExtra ? { name: 'settings' } : { name: 'home' };
    case 'gallery':
      return noExtra ? { name: 'gallery' } : { name: 'home' };
    case 'lesson':
      return second !== undefined && rest.length === 0 && ID_RE.test(second)
        ? { name: 'lesson', lessonId: second }
        : { name: 'home' };
    case 'checkpoint':
      return second !== undefined && rest.length === 0 && ID_RE.test(second)
        ? { name: 'checkpoint', checkpointId: second }
        : { name: 'home' };
    default:
      return { name: 'home' };
  }
}

/** The location hash for a Route (inverse of parseHash). */
export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'lesson':
      return `#/lesson/${route.lessonId}`;
    case 'checkpoint':
      return `#/checkpoint/${route.checkpointId}`;
    case 'review':
      return '#/review';
    case 'progress':
      return '#/progress';
    case 'settings':
      return '#/settings';
    case 'gallery':
      return '#/gallery';
    default: {
      const never: never = route;
      return never;
    }
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
  };
}

function snapshot(): string {
  return window.location.hash;
}

/** The current route; re-renders when the hash changes. */
export function useRoute(): Route {
  return parseHash(useSyncExternalStore(subscribe, snapshot));
}

/** Go to a route by changing the hash (no page load). */
export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}
