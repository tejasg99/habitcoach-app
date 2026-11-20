/**
 * src/api/events.ts
 *
 * "The session is over" signal. The auth middleware fires it after clearing
 * the tokens (refresh rejected, or a retried request still 401); the session
 * store listens and moves the app to the auth stack.
 *
 * A separate module so the API client and the session store don't import
 * each other.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSessionExpired(): void {
  listeners.forEach((l) => l());
}
