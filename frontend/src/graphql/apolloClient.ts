import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
  link: new HttpLink({ uri: "/backend/graphql" }), // atualiza se necessário
  cache: new InMemoryCache(),
});

export default client;
