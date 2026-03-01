import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json";

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.VITE_PORT || "5173"),
    allowedHosts: [
      "castorworks.cloud",
      "www.castorworks.cloud",
      "dev.castorworks.cloud",
      "eagle.castorworks.cloud",
      "demo.castorworks.cloud" 
    ],
    hmr: {
      host: "localhost",
      port: 5173,
      protocol: "ws"
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "offline.html",
        "sw-sync.js"
      ],
      manifest: {
        name: "CastorWorks",
        short_name: "CastorWorks",
        description:
          "Professional construction project management application",
        theme_color: "#3b82f6",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "/favicon.ico",
            sizes: "64x64",
            type: "image/x-icon"
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,woff,woff2}"
        ],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/auth/, /^\/docs/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.includes("/rest/v1/translations") ||
              url.pathname.includes(
                "/rest/v1/user_preferences"
              ),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "translations-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.includes(
                "/rest/v1/config_categories"
              ) ||
              url.pathname.includes(
                "/rest/v1/config_values"
              ) ||
              url.pathname.includes(
                "/rest/v1/config_translations"
              ),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "config-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern:
              /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern:
              /\.(?:woff|woff2|ttf|eot)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern:
              /\.(?:js|css)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-assets-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern:
              /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }) => {
                    const url = new URL(request.url);
                    url.searchParams.delete("_");
                    return url.toString();
                  }
                }
              ]
            }
          },
          {
            urlPattern:
              /^https:\/\/(?!.*\.castorworks\.cloud).+\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "external-api-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 5
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    },
    dedupe: ["react", "react-dom", "react-router", "react-router-dom"]
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router", "react-router-dom", "@tanstack/react-query"]
  },
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    pool: "process",
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 30000,
    fileParallelism: false,
    sequence: {
      shuffle: false,
      concurrent: false
    }
  }
}));
