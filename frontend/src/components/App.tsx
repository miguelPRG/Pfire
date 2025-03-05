import { lazy, ReactElement, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import { useTema } from "../hooks/TemaContext";
import CircularProgress from "@mui/material/CircularProgress";
import { Box, IconButton } from "@mui/material";
//import Footer from "./Footer";
import { MdBrightness4, MdBrightness7 } from "react-icons/md";

// Carregar as páginas e os componentes de forma lazy
const Login = lazy(() => import("../pages/LoginPage"));
const Home = lazy(() => import("../pages/HomePage"));
const Header = lazy(() => import("./Header"))

interface RouteProps {
  user: unknown;
  element: ReactElement;
  loading?: boolean;
}

const ProtectedRoute = ({ user, element, loading }: RouteProps) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }
  return user ? element : <Navigate to="/login" />;
};

const PublicRoute = ({ user, element }: Omit<RouteProps, "loading">) => {
  return user ? <Navigate to="/" /> : element;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <>
      {!isLoginPage && <Header />}
      <Box component="main">{children}</Box>
      {/*!isLoginPage && <Footer />*/}
    </>
  );
};

const ThemeToggleButton = () => {
  const { darkMode, toggleTheme } = useTema();

  const handleThemeChange = () => {
    // Usa requestAnimationFrame para melhorar o desempenho da alteração visual
    requestAnimationFrame(() => {
      document.documentElement.classList.toggle("dark-mode", !darkMode);
    });

    // Alterna o tema no estado React
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
      {darkMode ? <MdBrightness7 /> : <MdBrightness4 />}
    </IconButton>
  );
};

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Suspense
        fallback={
          <Box display="flex" justifyContent="center" alignItems="center">
            <CircularProgress />
          </Box>
        }
      >
        <Router>
          <Layout>
            <Routes>
              <Route path="/login" element={<PublicRoute user={user} element={<Login />} />} />
              <Route path="/" element={<ProtectedRoute user={user} element={<Home />} loading={loading} />} />
              <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
            </Routes>
          </Layout>
        </Router>
      </Suspense>
      {/* Botão de alternância de tema, fora do Router para evitar re-renderizações */}
      <ThemeToggleButton />
    </>
  );
}

export default App;