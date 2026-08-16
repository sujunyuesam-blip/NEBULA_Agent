import { defineConfig } from "vite";

// 开发环境：/api 代理到本地 Worker（wrangler dev --port 8787）
// 生产环境：Cloudflare Pages 构建产物中的 API_BASE 使用环境变量注入
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/healthz": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2020",
    outDir: "dist",
  },
  define: {
    // 生产 API 地址：保持原域名 api.nebulavessel.com
    // 如需覆盖：构建时设置环境变量 VITE_API_BASE
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE || ""),
  },
});
