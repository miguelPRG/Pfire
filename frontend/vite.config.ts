import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import pkg from "./package.json" with { type: "json" };
import { execSync } from "node:child_process";

const commitHash = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
})();

const branchName = (() => {
  if (process.env.CI_COMMIT_REF_NAME) {
    return process.env.CI_COMMIT_REF_NAME;
  }

  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
})();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT_HASH__: JSON.stringify(commitHash),
    __APP_BRANCH__: JSON.stringify(branchName),
  },

  test: {
    globals: true,
    environment: "jsdom",
    // Sempre que forem criados novos ficheiros de teste, estes devem ser adicionados neste array
    setupFiles: [],
    include: ["src/tests/**/*.{test,spec}.{js,ts,jsx,tsx}"], // 👈 define a pasta dos testes aqui
  },

  optimizeDeps: {
    include: [], // Remova o @tailwindConfig da otimização
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    sourcemap: false, // Desativa sourcemaps em produção
    outDir: "dist",
    minify: "esbuild", // Minificação rápida
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Mapeia tanto "/backend" quanto "backend" (sem barra)
      "^/backend": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/?backend/, ""),
      },
      // Proxy para rotas de /user (payment, etc)
      "^/user": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Opcional: se quiser garantir que "backend" sem barra inicial também seja mapeado
      "^backend": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^backend/, ""),
      },
    },
    watch: {
      usePolling: true,
    },
  },
});
