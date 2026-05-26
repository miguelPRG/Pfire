import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./hooks/AuthContext";
import { TemaProvider } from "./hooks/TemaContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecaptchaProvider } from "./hooks/RecaptchaContext";
import App from "./App";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

function loadRecaptcha(siteKey: string) {
  const id = "recaptcha-v3";
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.defer = true;
  script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  document.head.appendChild(script);
}

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});
if (siteKey) {
  console.log("Carregando reCAPTCHA v3 com a chave do site: ", siteKey);
  loadRecaptcha(siteKey);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TemaProvider>
      <RecaptchaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
          {/**/} {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </RecaptchaProvider>
    </TemaProvider>
  </React.StrictMode>
);
