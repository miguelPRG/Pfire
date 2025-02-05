import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import CircularProgress from "@mui/material/CircularProgress";

const Login = lazy(() => import("../pages/LoginPage"));
const Home = lazy(() => import("../pages/HomePage"));

const LoginPageRoute = ({ user }: { user: any }) => {
  return user ? <Navigate to="/" /> : <Login/>;
};

const HomePageRoute = ({ user }: { user: any }) => {
  return user ? <Home /> : <Navigate to="/login" />;
};

function App(){
  const { user } = useAuth();

  return (
    <Router>
      <Suspense fallback={<CircularProgress/>}>
        <Routes>
          <Route path="/login" element={<LoginPageRoute user={user} />} />
          <Route path="/" element={<HomePageRoute user={user} />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
