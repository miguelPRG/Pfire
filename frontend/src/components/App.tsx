import { lazy, ReactElement, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
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
const ClientManagementTable = lazy(() => import("../pages/ClientManagementTable"));
const EmailOperation = lazy(() => import("../components/EmailOperation"));
const NewPassword = lazy(() => import("../pages/NewPasswordPage"));
const AddNewClient = lazy(() => import("../pages/AddNewClientPage"));
const EditProfilePage = lazy(() => import("../pages/EditProfilePage"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage"));
const ChooseCompany = lazy(() => import("../pages/CompanySelectorPage"));

// Rotas protegidas
interface RouteProps {
  user: unknown;
  empresa: unknown;
  element: ReactElement;
}

const ProtectedRoute = ({ user,empresa, element }: RouteProps) => {
  
  if (user){
    if (!empresa){
      return <ChooseCompany/>;
    }
    return element;
  }

  return <Navigate to="/login" />;
};

const PublicRoute = ({ user,empresa,element }: RouteProps) => {
  return user ? (
    <ProtectedRoute user={user} empresa={empresa} element={<Home/>} />
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
        "&:hover": {
          backgroundColor: (theme) => theme.palette.primary.dark,
        },
      }}
    >
      {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
    </IconButton>
  );
};

// 🚀 App principal
function App() {
  const { user, loading ,empresa} = useAuth();
  

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
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
              path="confirmation/:GLOBAL_ID/:OPERATION"
              element={<PublicRoute user = {user} empresa = {empresa} element = {<EmailOperation/>}/>}
            />
            <Route
              path="/new-password/:GLOBAL_ID/"
              element={<PublicRoute user={user} empresa={empresa} element={<NewPassword/>}/>}
            />
            <Route
              path="/login"
              element={<PublicRoute user={user} empresa={empresa} element={<Login />} />}
            />
            <Route path="/login" element={<PublicRoute user={user} empresa={empresa} element={<Login />} />} />
            <Route
              path="/register"
              element={<PublicRoute user={user} empresa={empresa} element={<Register />} />}
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute user={user} empresa={empresa} element={<ForgotPasswordPage />} />
              }
            />
            <Route
              path="/"
              element={<ProtectedRoute user={user} empresa={empresa} element={<Home />} />}
            />
            <Route path="/" element={<ProtectedRoute user={user} empresa={empresa} element={<Home />} />} />
            <Route
              path="/users-list"
              element={
                <ProtectedRoute user={user} empresa={empresa} element={<UserManagementTable />} />
              }
            />
            <Route
              path="/clients-list"
              element={
                <ProtectedRoute
                  user={user}
                  empresa={empresa}
                  element={<ClientManagementTable />}
                />
              }
            />
            <Route
              path="/add-client"
              element={
                <ProtectedRoute user={user} empresa={empresa} element={<AddNewClient />} />
              }
            />
            <Route
              path="/edit-profile"
              element={
                <ProtectedRoute user={user} empresa={empresa} element={<EditProfilePage />} />
              }
            />
            <Route
              path="/choose-company"
              element={
                <ProtectedRoute user={user} empresa={empresa} element={<ChooseCompany/>} />
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
