// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  vite: {
    // Pre-bundle the complete Sanity client graph so CommonJS packages are exposed as ESM.
    optimizeDeps: {
      include: [
        "sanity",
        "@sanity/vision",
        "@sanity/ui",
        "react-is",
        "react/compiler-runtime",
        "react-compiler-runtime",
        "debug",
        "void-elements",
        "use-sync-external-store",
        "styled-components",
      ],
    },
    // Sanity's shim subpath imports a CommonJS file with named ESM syntax.
    resolve: {
      alias: {
        "use-sync-external-store/shim/index.js": fileURLToPath(
          new URL("./src/lib/compat/use-sync-external-store-shim.ts", import.meta.url),
        ),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
      allowedHosts: [".ngrok-free.dev"],
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false,
        },
        "/storage": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false,
        },
      },
      hmr: {
        protocol: "wss",
        host: "modular-nickname-disburse.ngrok-free.dev",
        clientPort: 443,
      },
    },    // Keep the heavy Studio graph out of the SSR/Worker build.
    ssr: {
      optimizeDeps: {
        exclude: ["sanity", "@sanity/vision"],
      },
    },
  },
});
