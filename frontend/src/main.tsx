import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./hooks/AuthContext";
import { TemaProvider } from "./hooks/TemaContext";
import { ApolloProvider } from "@apollo/client/react";
import { RecaptchaProvider } from "./hooks/RecaptchaContext";
import App from "./App";
import client from "./graphql/apolloClient";

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
if (siteKey) {
  console.log("Carregando reCAPTCHA v3 com a chave do site: ", siteKey);
  loadRecaptcha(siteKey);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TemaProvider>
      <RecaptchaProvider>
        <ApolloProvider client={client}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ApolloProvider>
      </RecaptchaProvider>
    </TemaProvider>
  </React.StrictMode>
);
