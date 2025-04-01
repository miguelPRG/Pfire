import { lazy, ReactElement, Suspense, useEffect } from "react";
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
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import ResponsiveAppBar from "./ResponsiveAppBar";

const Login = lazy(() => import("../pages/LoginPage"));
const Register = lazy(() => import("../pages/RegisterPage"));
const CadastroEmpresa = lazy(() => import("../pages/CadastroEmpresaPage"));
const Home = lazy(() => import("../pages/HomePage"));
const UserManagementTable = lazy(() => import("../pages/UserManagementTable"));
const EmpresasPage = lazy(() => import("../pages/EmpresasPage"));
const ClientManagementTable = lazy(
  () => import("../pages/ClientManagementTable"),
);
const AddNewClient = lazy(() => import("../pages/AddNewClientPage"));

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
      {!isLoginPage && !loading && user && <ResponsiveAppBar />}
      <Box component="main">{children}</Box>
    </>
  );
};

const ThemeToggleButton = () => {
  const { darkMode, toggleTheme } = useTema();

  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem("scrollPosition");
    if (savedScrollPosition) {
      window.scrollTo(0, parseInt(savedScrollPosition, 10));
      sessionStorage.removeItem("scrollPosition");
    }
  }, [darkMode]);

  return (
    <IconButton
      onClick={() => {
        sessionStorage.setItem("scrollPosition", window.scrollY.toString()); // Salva a posição antes de mudar o tema
        toggleTheme();
      }}
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
      {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
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
    <Router>
      <Suspense fallback={<CircularProgress />}>
        <Layout>
          <Routes>
            <Route
              path="/login"
              element={<PublicRoute user={user} element={<Login />} />}
            />
            <Route
              path="/register"
              element={<PublicRoute user={user} element={<Register />} />}
            />
            <Route
              path="/cadastro-empresa"
              element={
                <PublicRoute user={user} element={<CadastroEmpresa />} />
              }
            />
            <Route
              path="/"
              element={<ProtectedRoute user={user} element={<Home />} />}
            />
            <Route
              path="/UserManagementTable"
              element={
                <ProtectedRoute user={user} element={<UserManagementTable />} />
              }
            />
            <Route
              path="/ClientManagementTable"
              element={
                <ProtectedRoute
                  user={user}
                  element={<ClientManagementTable />}
                />
              }
            />
            <Route
              path="/AddNewClientPage"
              element={
                <ProtectedRoute user={user} element={<AddNewClient />} />
              }
            />

            <Route
              path="/EmpresasPage"
              element={
                <ProtectedRoute user={user} element={<EmpresasPage />} />
              }
            />
            <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
          </Routes>
        </Layout>
      </Suspense>
      <ThemeToggleButton />
    </Router>
  );
}

export default App;
