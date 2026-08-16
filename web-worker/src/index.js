// nebula-web - 静态资源托管 Worker（www.nebulavessel.com）
// 带缓存策略：hash 命名的构建产物永久缓存，HTML 短缓存

export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const url = new URL(request.url);
    const headers = new Headers(res.headers);
    if (url.pathname.startsWith("/assets/") || url.pathname === "/logo.svg") {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
    }
    return new Response(res.body, { status: res.status, headers });
  },
};
