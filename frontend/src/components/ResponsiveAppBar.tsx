import { useState } from "react";
import { useTheme } from "@mui/material";
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Menu,
  Avatar,
  Tooltip,
  MenuItem,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "../hooks/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import Sidebar from "./Sidebar";

const userSettings = ["Perfil", "Account", "Dashboard", "Logout"];

function ResponsiveAppBar() {
  const { logout } = useAuth();
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate(); // Inicializa o useNavigate

  const openUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const closeUserMenu = () => {
    setAnchorElUser(null);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <AppBar
        position="static"
        sx={{ backgroundColor: theme.palette.primary.main, borderRadius: 0 }}
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
          {/* Lado esquerdo: ícone, logo e texto */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton onClick={toggleSidebar} color="inherit" sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
            <Box
              component="img"
              src={logo}
              alt="Logo"
              sx={{
                height: 40, // valor fixo e controlado
                transform: {
                  xs: "scale(2.1)",
                  sm: "scale(2.75)",
                  md: "scale(2.8)",
                },
                transformOrigin: "left center",
                mr: 1,
              }}
            />

            <Typography
              variant="h6"
              component="a"
              href="/"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: ".2rem",
                color: "inherit",
                textDecoration: "none",
                fontSize: { xs: "1.2rem", sm: "1.8rem", md: "2.0rem" },
                marginLeft: {
                  xs: 1.65, // mais colado em telas pequenas
                  sm: 3.4,
                  md: 3.8,
                },
              }}
            >
              PFIRE
            </Typography>
          </Box>

          {/* Lado direito: Avatar */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Tooltip title="Open settings">
              <IconButton onClick={openUserMenu} sx={{ p: 0 }}>
                <Avatar alt="User Avatar" src="/static/images/avatar/2.jpg" />
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: "50px", width: "200px" }}
              anchorEl={anchorElUser}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              keepMounted
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              open={Boolean(anchorElUser)}
              onClose={closeUserMenu}
            >
              {userSettings.map((setting) => (
                <MenuItem
                  key={setting}
                  onClick={() => {
                    closeUserMenu();
                    if (setting === "Perfil") navigate("/EditProfilePage");
                    if (setting === "Logout") logout();
                  }}
                >
                  <Typography textAlign="center">{setting}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
}

export default ResponsiveAppBar;
