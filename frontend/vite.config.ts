import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The browser only ever calls /api on this origin; Vite proxies it to the backend.
// This keeps the client unaware of Fake Store and avoids CORS entirely.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, '..', ''), ...process.env };
  const apiTarget = env.API_PROXY_TARGET ?? 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      host: true, // listen on all interfaces, e.g. to test from a phone on the same network
      port: 5173,
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
  };
});
