import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

// Con VITE_FORCE_DEMO=true el HTML usa un logo local ficticio en lugar de Supabase Storage y se quita el manifest.
const demoHtml = (enabled: boolean) => ({
  name: 'force-demo-html',
  transformIndexHtml(html: string) {
    if (!enabled) return html;
    return html
      .replace(/https:\/\/[a-z0-9-]+\.supabase\.co\/[^"'\s]*/gi, '/demo-logo.svg')
      .replace(/<link[^>]*rel="manifest"[^>]*>\s*/gi, '');
  },
});

// Rama con demo obligatorio en Vercel: solo coincide con ese nombre exacto, nunca con main ni otras ramas.
const DEMO_ONLY_BRANCH = 'feat/invitaciones-plantilla-v2';

// Antes de cargar el entorno, en esa rama se fuerza demo y se vacian las credenciales de Supabase heredadas.
if (process.env.VERCEL_GIT_COMMIT_REF === DEMO_ONLY_BRANCH) {
  process.env.VITE_FORCE_DEMO = 'true';
  process.env.VITE_SUPABASE_URL = '';
  process.env.VITE_SUPABASE_ANON_KEY = '';
}

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
