addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

const BACKEND_URL = "https://pmedsys.com:10000";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Proxy para o backend quando começa com /backend
    if (url.pathname.startsWith("/backend")) {
      const path = url.pathname.replace(/^\/backend\/?/, "/");
      const backendUrl = `${BACKEND_URL}${path}${url.search}`;

      // Clona a request original para o backend
      const proxied = new Request(backendUrl, request);
      return fetch(proxied);
    }

    // Serve os assets (./dist) pelo binding de assets do Wrangler v4
    return env.ASSETS.fetch(request);
  },
};
