import { lazy, ReactElement, Suspense } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import { useTema } from "../hooks/TemaContext";
import CircularProgress from "@mui/material/CircularProgress";
import { Box, IconButton } from "@mui/material";
//import Footer from "./Footer";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

const Login = lazy(() => import("../pages/LoginPage"));
const Register = lazy(() => import("../pages/RegisterPage")); // Adiciona a importação da página de registro
const CadastroEmpresa = lazy(() => import("../pages/CadastroEmpresaPage")); // Adiciona a importação da página de cadastro da empresa
const Home = lazy(() => import("../pages/HomePage"));
const Header = lazy(() => import("./Header"));

interface RouteProps {
  user: unknown;
  element: ReactElement;
}

const ProtectedRoute = ({ user, element }: RouteProps) => {
  return user ? element : <Navigate to="/login" />;
};

const PublicRoute = ({ user, element }: RouteProps) => {
  return user ? <Navigate to="/" /> : element;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const isLoginPage = location.pathname === "/login";

  return (
    <>
      {!isLoginPage && !loading && user && <Header />}
      <Box component="main">{children}</Box>
    </>
  );
};

const ThemeToggleButton = () => {
  const { darkMode, toggleTheme } = useTema();

  const handleThemeChange = () => {
    requestAnimationFrame(() => {
      document.documentElement.classList.toggle("dark-mode", !darkMode);
    });
    toggleTheme();
  };

  return (
    <IconButton
      onClick={handleThemeChange}
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        backgroundColor: (theme) => theme.palette.primary.main,
        color: "white",
        boxShadow: 3,
        "&:hover": { backgroundColor: (theme) => theme.palette.primary.dark },
      }}
    >
      {darkMode ? <LightModeIcon /> : <DarkModeIcon />}{" "}
      {/*Modificado para MUI*/}
    </IconButton>
  );
};

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Router>
        <Suspense>
          <Layout>
            <Routes>
              <Route
                path="/login"
                element={<PublicRoute user={user} element={<Login />} />}
              />
              <Route
                path="/register"
                element={<PublicRoute user={user} element={<Register />} />}
              />{" "}
              {/* Adiciona a rota de registro */}
              <Route
                path="/cadastro-empresa"
                element={
                  <PublicRoute user={user} element={<CadastroEmpresa />} />
                }
              />{" "}
              {/* Adiciona a rota de cadastro da empresa */}
              <Route
                path="/"
                element={<ProtectedRoute user={user} element={<Home />} />}
              />
              <Route
                path="*"
                element={<Navigate to={user ? "/" : "/login"} />}
              />
            </Routes>
          </Layout>
        </Suspense>
        <ThemeToggleButton />
      </Router>
    </>
  );
}

export default App;
