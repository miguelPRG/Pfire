import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./hooks/AuthContext";
import { TemaProvider } from "./hooks/TemaContext";
import App from "./components/App";
import { ApolloProvider } from "@apollo/client";
import client from "./graphql/apolloClient"; // certifica-te de que o caminho está correto

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      {/* Provedor de Autenticação! Responsável por verificar login do utilizador */}
      <TemaProvider>
        {/* Provedor do Tema! Responsável por configurar o tema. Light ou Dark */}
        <ApolloProvider client={client}>
          {/* Provedor do Apollo! Responsável por permitir comunicação com o GraphQL */}
          <App />
        </ApolloProvider>
      </TemaProvider>
    </AuthProvider>
  </React.StrictMode>
);
