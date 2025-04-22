import { ApolloClient, InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
  uri: "http://localhost:8000/graphql", // atualiza se necessário
  cache: new InMemoryCache(),
  credentials: "include", // importante se estiveres a usar cookies para autenticação
});

export default client;
