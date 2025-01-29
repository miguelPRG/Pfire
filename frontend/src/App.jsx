import {lazy, useEffect } from 'react';
import {Routes,Route,useLocation} from 'react-router-dom';
import './css/style.css';
import './charts/ChartjsConfig';

// Import pages
const Dashboard = lazy(() => import('./pages/Dashboard'));


function App() {

  const location = useLocation();

  useEffect(() => {
    document.querySelector('html').style.scrollBehavior = 'auto'
    window.scroll({ top: 0 })
    document.querySelector('html').style.scrollBehavior = ''

    Teste()

  }, [location.pathname]); // triggered on route change

  return (
    <>
      <Routes>
        <Route exact path="/" element={<Dashboard />} />
      </Routes>
    </>
  );
}

function Teste() {
  fetch('/backend/examples')
    .then(response => {
      // Verifica se a resposta foi bem-sucedida
      if (!response.ok) {
        throw new Error(`Erro na resposta: ${response.statusText}`);
      }

      // Verifica se a resposta é JSON
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        return response.json(); // Processa o JSON
      } else {
        throw new Error('A resposta não é JSON');
      }
    })
    .then(data => {
      // Verifica se o dado retornado é vazio
      if (Array.isArray(data) && data.length === 0) {
        console.warn('A resposta é um array vazio.');
      } else {
        console.log('Dados recebidos:', data); // Log do JSON retornado
      }
    })
    .catch(error => {
      console.error('Erro:', error.message); // Tratamento de erro com mensagem detalhada
    });
}

export default App;
