import { lazy, ReactElement, Suspense, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import { useTema } from "../hooks/TemaContext";
import CircularProgress from "@mui/material/CircularProgress";
import { Box, IconButton } from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import ResponsiveAppBar from "./ResponsiveAppBar";

// Lazy-loaded pages
const Login = lazy(() => import("../pages/LoginPage"));
const Register = lazy(() => import("../pages/RegisterPage"));
const Home = lazy(() => import("../pages/HomePage"));
const UserManagementTable = lazy(() => import("../pages/UserManagementTable"));
const ClientManagementTable = lazy(
  () => import("../pages/ClientManagementTable"),
);
const EmailOperation = lazy(() => import("../components/EmailOperation"));
const AddNewClient = lazy(() => import("../pages/AddNewClientPage"));
const EditProfilePage = lazy(() => import("../pages/EditProfilePage"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage"));
const ChooseCompany = lazy(() => import("../pages/CompanySelectorPage"));

// Rotas protegidas
interface RouteProps {
  user: unknown;
  empresaId: string | null;
  element: ReactElement;
}

const ProtectedRoute = ({ user,empresaId, element }: RouteProps) => {
  
  if (user){
    if (!empresaId){
      return <ChooseCompany/>;
    }
    return element
  }
  
  return <Navigate to="/login" />;
};

const PublicRoute = ({ user,empresaId,element }: RouteProps) => {
  return user ? (
    <ProtectedRoute user={user} empresaId={empresaId} element={<Home/>} />
  ) : (
    element
  );
}

// Layout base
const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  return (
    <>
      {!loading && user && <ResponsiveAppBar />}
      <Box component="main">{children}</Box>
    </>
  );
};

// Botão de troca de tema
const ThemeToggleButton = () => {
  const { darkMode, toggleTheme, isChanging } = useTema();

  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem("scrollPosition");
    if (savedScrollPosition) {
      window.scrollTo(0, parseInt(savedScrollPosition, 10));
      sessionStorage.removeItem("scrollPosition");
    }
  }, [darkMode]);

  return (
    <IconButton
      disabled={isChanging}
      onClick={() => {
        sessionStorage.setItem("scrollPosition", window.scrollY.toString());
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

// 🚀 App principal
function App() {
  const { user, loading,empresaId } = useAuth();

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
              path="/:GLOBAL_ID/:OPERATION"
              element={<EmailOperation/>}
            />
            <Route
              path="/login"
              element={<PublicRoute user={user} empresaId={empresaId} element={<Login />} />}
            />
            <Route
              path="/register"
              element={<PublicRoute user={user} empresaId={empresaId} element={<Register />} />}
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute user={user} empresaId={empresaId} element={<ForgotPasswordPage />} />
              }
            />
            <Route
              path="/"
              element={<ProtectedRoute user={user} empresaId={empresaId} element={<Home />} />}
            />
            <Route
              path="/users-list"
              element={
                <ProtectedRoute user={user} empresaId={empresaId} element={<UserManagementTable />} />
              }
            />
            <Route
              path="/clients-list"
              element={
                <ProtectedRoute
                  user={user}
                  empresaId={empresaId}
                  element={<ClientManagementTable />}
                />
              }
            />
            <Route
              path="/add-client"
              element={
                <ProtectedRoute user={user} empresaId={empresaId} element={<AddNewClient />} />
              }
            />
            <Route
              path="/edit-profile"
              element={
                <ProtectedRoute user={user} empresaId={empresaId} element={<EditProfilePage />} />
              }
            />
            <Route
              path="/choose-company"
              element={
                <ProtectedRoute user={user} empresaId={empresaId} element={<ChooseCompany />} />
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
