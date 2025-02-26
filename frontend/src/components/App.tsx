import { lazy, ReactElement, Suspense} from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import CircularProgress from "@mui/material/CircularProgress";

// Carregamento sob demanda das páginas
const Login = lazy(() => import("../pages/LoginPage"));
const Home = lazy(() => import("../pages/HomePage"));

interface RouteProps {
  user: any; // Seria interessante tipar isso com algo mais específico do que 'any'
  element: ReactElement;
  loading: boolean;
}

const ProtectedRoute = ({ user, element, loading }: RouteProps) => {
  
  while(loading)
  {
    return null
  }

  return user ? element : <Navigate to="/login" />;
};

const PublicRoute = ({ user, element, loading }: RouteProps) => {

  return user ? <Navigate to="/" /> : element;
};

function App() {
  const { user, loading } = useAuth(); // Usamos o hook aqui uma única vez

  // Verificando se o estado de autenticação foi carregado
  if(loading){
      return <CircularProgress/>
  }

  return (
    <Suspense fallback={<CircularProgress />}> {/* Suspense envolve o Router */}
      <Router>
        <Routes>
          <Route path="/" element={<ProtectedRoute user={user} element={<Home />} loading={loading} />} />
          <Route path="/login" element={<PublicRoute user={user} element={<Login />} loading={loading} />} />
        </Routes>
      </Router>
    </Suspense>
  );
}

export default App;
