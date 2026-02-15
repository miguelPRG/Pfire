addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

const BACKEND_URL = "https://pmedsys.com:10000";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 🔁 Proxy para backend
    if (url.pathname.startsWith("/backend")) {
      const path = url.pathname.replace(/^\/backend\/?/, "/");
      const backendUrl = `${BACKEND_URL}${path}${url.search}`;

      const proxied = new Request(backendUrl, request);
      return fetch(proxied);
    }

    // 📦 Tenta servir asset estático
    let response = await env.ASSETS.fetch(request);

    // 🧠 Se não existir, devolve index.html (SPA fallback)
    if (response.status === 404) {
      const indexRequest = new Request(
        new URL("/index.html", request.url),
        request
      );
      return env.ASSETS.fetch(indexRequest);
    }

    return response;
  },
};
