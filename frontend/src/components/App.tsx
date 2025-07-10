import { lazy, ReactElement, Suspense, useEffect, memo } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import { useTema } from "../hooks/TemaContext";
import { Box, IconButton } from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import ResponsiveAppBar from "./ResponsiveAppBar";
import LoadingAnimation from "./LoadingAnimation";

/* Função utilitária para simular delay e visualizar animação de carregamento

function delay<T>(promise: Promise<T>, ms: number = 0): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(promise), ms);
  }).then(p => p);
}
*/

// Lazy-loaded pages
const Login = lazy(() => import("../pages/public/LoginPage"));
const Register = lazy(() => import("../pages/public/RegisterPage"));
const Home = lazy(() => import("../pages/HomePage"));
const UserManagementTable = lazy(() => import("../pages/UserManagementTable"));
const ClientManagementTable = lazy(() => import("../pages/ClientManagementTable"));
const EmailOperation = lazy(() => import("./EmailOperation"));
const NewPassword = lazy(() => import("../pages/public/NewPasswordPage"));
const AddNewClient = lazy(() => import("../pages/AddNewClientPage"));
const EditProfilePage = lazy(() => import("../pages/EditProfilePage"));
const ForgotPasswordPage = lazy(() => import("../pages/public/ForgotPasswordPage"));
const ChooseCompany = lazy(() => import("../pages/CompanySelectorPage"));
const ReportModelListPage = lazy(() => import("../pages/ReportModelListPage"));
const ReportTemplatesPage = lazy(() => import("../pages/ReportTemplatesPage"));

// Rotas que podem ser utilizados apenas depois de autenticação
const ProtectedRoute = ({ element }: { element: ReactElement }) => {
  const { user, empresa } = useAuth();

  if (user) {
    if (element.type.name === "ChooseCompanyRoute") {
      return <ChooseCompanyRoute />;
    }
    if (!empresa) {
      console.log("Empresa não selecionada, redirecionando para a seleção de empresa.");
      return <Navigate to="/choose-company" />;
    }
    return element;
  }

  console.log("Usuário não autenticado, redirecionando para a página de login.");

  return <Navigate to="/login" />;
};

// Rotas públicas, acessível sem autenticação
const PublicRoute = ({ element }: { element: ReactElement }) => {

  const { user } = useAuth();


  console.log("Rota Publica")

  return user ? <Navigate to="/" /> : element;
};

const ChooseCompanyRoute = () => {
  const { user } = useAuth();

  if (user) {
    return <ChooseCompany />;
  }

  return <Login />;
};

// Layout base
const Layout = memo(({ userId, children }: { userId: string | null; children: React.ReactNode }) => {
  return (
    <>
      {userId && <ResponsiveAppBar />}
      <Box component="main">{children}</Box>
    </>
  );
});

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
  const { user, loading } = useAuth();
  let userId = user ? user.id : null;

  if (loading) {
    return <LoadingAnimation />;
  }

  return (
    <Router>
      <Suspense fallback={<LoadingAnimation />}>
        <Layout userId={userId}>
          <Routes>
            {/*Todas as confirmações de email*/}
            <Route 
              path="/confirmation/:GLOBAL_ID/:OPERATION" 
              element={<EmailOperation/>}
            />
            {/* Restauração de palavra-passe após o pedido. Esta página é inacessivel de forma direta pelo user.*/}
            <Route path="/new-password/:GLOBAL_ID" element={<PublicRoute element={<NewPassword />} />} />
            {/*Aqui estã as rotas da página de registo*/}
            <Route path="/register" element={<PublicRoute element={<Register />} />} />
            <Route path="/register/:GLOBAL_ID" element={<PublicRoute element={<Register />} />} />
            {/* Rota de login */}
            <Route path="/login" element={<PublicRoute element={<Login />} />} />
            <Route path="/forgot-password" element={<PublicRoute element={<ForgotPasswordPage />} />} />
            <Route path="/" element={<ProtectedRoute element={<Home />} />} />
            <Route path="/users-list" element={<ProtectedRoute element={<UserManagementTable />} />} />
            <Route path="/clients-list" element={<ProtectedRoute element={<ClientManagementTable />} />} />
            <Route 
            path="/add-client" element={<ProtectedRoute element={<AddNewClient />} />} />
            <Route path="/edit-profile" element={<ProtectedRoute element={<EditProfilePage />} />} />
            <Route path="/choose-company" element={<ProtectedRoute element={<ChooseCompanyRoute />} />} />
            <Route path="/report-models" element={<ProtectedRoute element={<ReportModelListPage />} />} />
            <Route path="/report-templates" element={<ProtectedRoute element={<ReportTemplatesPage />} />} />
            <Route path="*" element={<Navigate to="/"/>} />
          </Routes>
        </Layout>
      </Suspense>
      <ThemeToggleButton />
    </Router>
  );
}

export default App;
