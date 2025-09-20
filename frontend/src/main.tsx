import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./hooks/AuthContext";
import { TemaProvider } from "./hooks/TemaContext";
import App from "./App";
import { ApolloProvider } from "@apollo/client/react";
import client from "./graphql/apolloClient";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TemaProvider>
      <ApolloProvider client={client}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ApolloProvider>
    </TemaProvider>
  </React.StrictMode>
);
