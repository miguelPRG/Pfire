import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./hooks/AuthContext";
import { TemaProvider } from "./hooks/TemaContext";
import { ApolloProvider } from "@apollo/client/react";
import { RecaptchaProvider } from "./hooks/RecaptchaContext";
import App from "./App";
import client from "./graphql/apolloClient";

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
