import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { AuthProvider } from './hooks/AuthContext';
import { TemaProvider } from './hooks/TemaContext';
import App from './components/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TemaProvider>{/*Provedor do Tema! Responsável por configurar o tema. Light ou Dark */}
      <AuthProvider>{/*Provedor de Autenticação! Responsável por verificar login do utilizador*/}
        <App/>
      </AuthProvider>
    </TemaProvider>
  </React.StrictMode>,
);
