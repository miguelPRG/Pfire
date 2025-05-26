import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./hooks/AuthContext";
import { TemaProvider } from "./hooks/TemaContext";
import App from "./components/App";
import { ApolloProvider } from "@apollo/client";
import client from "./graphql/apolloClient"; // certifica-te de que o caminho está correto

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <AuthProvider>
        <TemaProvider>
          <App />
        </TemaProvider>
      </AuthProvider>
    </ApolloProvider>
  </React.StrictMode>
);
