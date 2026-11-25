/**
 * src/features/notifications/registrar.ts
 *
 * Registers this phone for push, as pure logic with injected dependencies (the
 * real ones are in push.ts).
 *
 *   supported? -> permission granted? -> Android channel -> Expo token
 *              -> remember the token -> POST /notifications/register-token
 *
 * Nothing here may ever break the app: a failure is dropped, and the next app
 * start (or return to the foreground) tries again.
 *
 * Logout can happen at any point of that chain, so:
 *  - the token is stored BEFORE the POST. If the answer is lost, logout still
 *    knows which token to unregister (unregistering an unknown one is harmless).
 *  - stop() makes a run that has not reached the POST give up.
 *  - settled() lets logout wait for a POST already on its way, so "register"
 *    cannot reach the server after "unregister".
 */

export type RegistrarDeps = {
  /** A physical device, outside Expo Go, with an EAS project id. */
  isSupported(): boolean;
  /** Reads the permission. Never asks for it. */
  isAllowed(): Promise<boolean>;
  /** Must run before the token is requested. Android only. */
  prepareChannel(): Promise<void>;
  getToken(): Promise<string>;
  saveToken(token: string): Promise<void>;
  /** POST /notifications/register-token. Throws ApiError. */
  register(token: string, signal: AbortSignal): Promise<void>;
};

export function createRegistrar(deps: RegistrarDeps) {
  // Each stop() starts a new era; a run from an older era is stale.
  let era = 0;
  let running: Promise<void> | null = null;
  let posting: Promise<void> | null = null;
  let controller = new AbortController();
  let registered = false;

  async function run(mine: number, signal: AbortSignal): Promise<void> {
    if (!deps.isSupported() || !(await deps.isAllowed())) return;
    await deps.prepareChannel();
    const token = await deps.getToken();
    if (mine !== era) return;

    const post = (async () => {
      await deps.saveToken(token);
      if (mine !== era) return;
      await deps.register(token, signal);
      if (mine === era) registered = true;
    })();
    posting = post;
    try {
      await post;
    } finally {
      if (posting === post) posting = null;
    }
  }

  /** Register now. Calls made while one is running share it. Never throws. */
  function start(): Promise<void> {
    if (running) return running;
    const current: Promise<void> = run(era, controller.signal)
      .catch(() => undefined)
      .finally(() => {
        if (running === current) running = null;
      });
    running = current;
    return current;
  }

  /** Register unless this session already did (used when returning to the foreground). */
  async function startIfNeeded(): Promise<void> {
    if (!registered) await start();
  }

  /** The session is ending: no new POST, and the next start() begins afresh. */
  function stop(): void {
    era += 1;
    registered = false;
    running = null;
  }

  /** Resolves once a POST already under way has finished. Never throws. */
  async function settled(): Promise<void> {
    await posting?.catch(() => undefined);
  }

  /** Cancel a POST that is still under way. */
  function abort(): void {
    controller.abort();
    controller = new AbortController();
  }

  return { start, startIfNeeded, stop, settled, abort };
}
