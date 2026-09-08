import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export const devStartOptions = {
  onUnhandledRequest(req: Request) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      console.warn('[MSW] Unhandled:', req.method, url.pathname);
    }
    // /api/ 외 요청은 조용히 통과
  },
  quiet: false,
};
