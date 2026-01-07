import { useState } from "react";
import {
  useTheme,
  useScrollTrigger,
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Menu,
  Avatar,
  Tooltip,
  MenuItem,
  Typography,
  Badge,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "../hooks/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import Sidebar from "./Sidebar";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import BusinessIcon from "@mui/icons-material/Business";
import LogoutIcon from "@mui/icons-material/Logout";
import "../assets/styles/ResponsiveAppBar.css";

interface NavLinkProps {
  onClick: () => void;
  children: React.ReactNode;
  sx?: object;
}

const NavLink = ({ onClick, children, sx = {} }: NavLinkProps) => (
  <Typography
    variant="body1"
    sx={{
      cursor: "pointer",
      color: "inherit",
      textDecoration: "none",
      fontWeight: 500,
      "&:hover": { textDecoration: "underline" },
      ...sx,
    }}
    onClick={onClick}
  >
    {children}
  </Typography>
);

function ResponsiveAppBar() {
  const { logout, empresa, user } = useAuth();
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();

  const openUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };
  const closeUserMenu = () => {
    setAnchorElUser(null);
  };
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
  });

  const userSettings = [
    {
      label: "Perfil",
      icon: <AccountCircleIcon fontSize="small" sx={{ mr: 1 }} />,
      action: () => navigate("/edit-profile"),
    },
    {
      label: "Mudar de empresa",
      icon: <BusinessIcon fontSize="small" sx={{ mr: 1 }} />,
      action: () => navigate("/choose-company"),
    },
    {
      label: "Logout",
      icon: <LogoutIcon fontSize="small" sx={{ mr: 1 }} />,
      action: () => {
        logout();
      },
    },
  ];

  return (
    <Box component={"header"}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <AppBar
        position="fixed"
        elevation={trigger ? 4 : 0}
        sx={{
          backgroundColor: theme.palette.primary.main,
          borderRadius: 0,
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            minHeight: 54,
            px: { xs: 1, sm: 2, md: 3 },
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {/* Box 1: Sidebar + Logo */}
          <Box sx={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
            {empresa && (
              <IconButton onClick={toggleSidebar} color="inherit" sx={{ marginRight: 2 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                component="img"
                src={logo}
                alt="Logo"
                sx={{
                  cursor: "pointer",
                  height: 40,
                  transform: { xs: "scale(2.1)", sm: "scale(2.75)", md: "scale(2.8)" },
                  transformOrigin: "left center",
                  mr: 2,
                  ml: 2,
                }}
                onClick={() => navigate("/")}
              />
              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  letterSpacing: ".2rem",
                  color: "inherit",
                  textDecoration: "none",
                  fontSize: { xs: "1.2rem", sm: "1.8rem", md: "2.0rem" },
                  ml: { xs: 1.65, sm: 3.4, md: 3.8 },
                  cursor: "pointer",
                }}
                onClick={() => navigate("/")}
              >
                PFIRE
              </Typography>
            </Box>
          </Box>

          {/* Box 2: Menu de navegação */}
          <div className="nav-links">
            <Box
              component="nav"
              sx={{
                display: "flex",
                alignItems: "center",
                flex: "1 1 auto",
                justifyContent: "center",
                ml: 2,
                mr: 2,
                gap: 5.5,
              }}
            >
              <NavLink onClick={() => navigate("/report-models")} sx={{ ml: 2 }}>
                Modelos
              </NavLink>
              <NavLink onClick={() => navigate("/clients-list")}>Clientes</NavLink>
              <NavLink onClick={() => navigate("/plans")}>Planos</NavLink>
              {empresa?.isAdmin && <NavLink onClick={() => navigate("/users-list")}>Funcionários</NavLink>}
            </Box>
          </div>

          {/* Box 3: Assinatura (base64 circular) + Nome do usuário, alinhados à direita */}
          <Box sx={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
            <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Typography
                variant="body2"
                sx={{
                  color: "inherit",
                  fontWeight: 500,
                  textAlign: "right",
                  display: { xs: "none", lg: "block" },
                }}
              >
                {user?.nome}
              </Typography>
              <Tooltip title="Abrir configurações">
                <IconButton onClick={openUserMenu} sx={{ p: 0 }}>
                  <Avatar
                    alt={user?.nome || "User"}
                    src={user?.assinatura ? `data:image/png;base64,${user.assinatura}` : "/static/images/avatar/2.jpg"}
                    sx={{
                      width: 40,
                      height: 40,
                      border: "2px solid white",
                    }}
                  >
                    {!user?.assinatura && user?.nome?.charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Menu
            anchorEl={anchorElUser}
            open={Boolean(anchorElUser)}
            onClose={closeUserMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            slotProps={{ paper: { sx: { mt: 3, minWidth: 140, maxWidth: 200, boxShadow: 3 } } }}
          >
            {userSettings.map(({ label, icon, action }) => (
              <MenuItem
                key={label}
                onClick={() => {
                  closeUserMenu();
                  action();
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {icon}
                  <Typography variant="body2" textAlign="left" width="100%">
                    {label}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </AppBar>
      <Box sx={{ height: 100 }} />
    </Box>
  );
}

export default ResponsiveAppBar;
