import { defineConfig } from 'vite';

const gatewayUrl = process.env.VITE_GATEWAY_URL ?? 'http://localhost:8090';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target: gatewayUrl, changeOrigin: true },
      '/stream': { target: gatewayUrl, changeOrigin: true },
      '/notify': { target: gatewayUrl, changeOrigin: true },
    },
  },
});
