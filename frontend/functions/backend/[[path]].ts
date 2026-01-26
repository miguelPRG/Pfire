export async function onRequest(context) {
  const { request, params } = context;

  const url = new URL(request.url);

  const targetUrl =
    "https://pfire-backend.onrender.com/" +
    (params.path ?? "");

  const proxyRequest = new Request(targetUrl, request);

  return fetch(proxyRequest);
}
