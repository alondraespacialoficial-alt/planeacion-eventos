import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

// Con VITE_FORCE_DEMO=true se quitan del HTML los enlaces a Supabase Storage (favicon, iconos y manifest).
const demoHtml = (enabled: boolean) => ({
  name: 'force-demo-html',
  transformIndexHtml(html: string) {
    if (!enabled) return html;
    return html
      .replace(/<link[^>]*supabase\.co[^>]*>\s*/gi, '')
      .replace(/<link[^>]*rel="manifest"[^>]*>\s*/gi, '');
  },
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), tailwindcss(), demoHtml(env.VITE_FORCE_DEMO?.trim().toLowerCase() === 'true')],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
