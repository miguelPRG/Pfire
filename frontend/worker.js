export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1️⃣ Proxy para /backend
    if (url.pathname.startsWith("/backend") || url.pathname.startsWith("backend")) {
      const proxiedPath = url.pathname.replace(/^\/backend/, "");
      const proxiedUrl = `https://pfire.pmedsys.com${proxiedPath}${url.search}`;

      return fetch(proxiedUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    }
  },
};
