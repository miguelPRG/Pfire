import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";
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
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "react-transition-group/TransitionGroupContext": fileURLToPath(
        new URL("./node_modules/react-transition-group/cjs/TransitionGroupContext.js", import.meta.url)
      ),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT_HASH__: JSON.stringify(commitHash),
    __APP_BRANCH__: JSON.stringify(branchName),
  },

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/tests/setup.ts"],
    include: ["src/tests/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    fileParallelism: false,
    maxWorkers: 1,
    pool: "threads",
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    server: {
      deps: {
        inline: ["@mui/material", "@mui/icons-material", "react-transition-group"],
      },
    },
  },

  optimizeDeps: {
    include: [],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    sourcemap: false,
    outDir: "dist",
    minify: "esbuild",
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
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
      // Opcional: se quiser garantir que "backend" sem barra inicial tambem seja mapeado
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
