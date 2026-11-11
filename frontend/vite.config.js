import { defineConfig, loadEnv, createLogger } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000';

  const logger = createLogger();
  const originalError = logger.error.bind(logger);
  let lastConnRefusedWarn = 0;

  logger.error = (msg, options) => {
    const err = options?.error;
    const errCode = err?.code || (Array.isArray(err?.errors) ? err.errors[0]?.code : undefined);
    const isProxyMsg =
      typeof msg === 'string' &&
      (msg.includes('ws proxy error') ||
        msg.includes('ws proxy socket error') ||
        msg.includes('http proxy error'));

    if (isProxyMsg) {
      if (errCode === 'ECONNABORTED' || errCode === 'ECONNRESET' || errCode === 'EPIPE') {
        return;
      }
      if (errCode === 'ECONNREFUSED') {
        const now = Date.now();
        if (now - lastConnRefusedWarn > 10000) {
          lastConnRefusedWarn = now;
          logger.warn(
            `Backend server not reachable at ${proxyTarget} (ECONNREFUSED). Make sure the backend is running.`,
            { timestamp: true }
          );
        }
        return;
      }
    }

    originalError(msg, options);
  };

  return {
    customLogger: logger,
    plugins: [react()],
    server: {
      host: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: proxyTarget,
          ws: true,
          changeOrigin: true
        }
      },
    },
  };
})
