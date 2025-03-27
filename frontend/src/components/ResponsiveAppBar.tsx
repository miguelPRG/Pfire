import { useState } from "react";
import { useTheme, useMediaQuery } from "@mui/material";
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
  Button,
  Container,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "../hooks/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import Sidebar from "./Sidebar";

const navigationPages = [
  
  { label: "Utilizadores", path: "/UserManagementTable" },
  { label: "Clientes", path: "/ClientManagementTable" },
];

const userSettings = ["Profile", "Account", "Dashboard", "Logout"];

function ResponsiveAppBar() {
  const { logout } = useAuth();
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  const openNavigationMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const openUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const closeNavigationMenu = () => {
    setAnchorElNav(null);
  };

  const closeUserMenu = () => {
    setAnchorElUser(null);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <AppBar position="static" sx={{ backgroundColor: theme.palette.primary.main }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <IconButton size="large" onClick={toggleSidebar} color="inherit" sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>

            <img src={logo} alt="Logo" style={{ width: 80, height: 80, marginRight: 10 }} />

            <Typography
              variant="h6"
              component="a"
              href="/"
              sx={{
                mr: 2,
                display: { xs: "none", md: "flex" },
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: ".3rem",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              PFIRE
            </Typography>

            {isMobile ? (
              <Box sx={{ flexGrow: 1 }}>
                <IconButton size="large" onClick={openNavigationMenu} color="inherit">
                  <MenuIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorElNav}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  keepMounted
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                  open={Boolean(anchorElNav)}
                  onClose={closeNavigationMenu}
                >
                  {navigationPages.map(({ label, path }) => (
                    <MenuItem key={label} onClick={() => { closeNavigationMenu(); navigate(path); }}>
                      <Typography textAlign="center">{label}</Typography>
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            ) : (
              <Box sx={{ flexGrow: 1, display: "flex" }}>
                {navigationPages.map(({ label, path }) => (
                  <Button key={label} onClick={() => navigate(path)} sx={{ my: 2, color: "white" }}>
                    {label}
                  </Button>
                ))}
              </Box>
            )}

            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Tooltip title="Open settings">
                <IconButton onClick={openUserMenu} sx={{ p: 0 }}>
                  <Avatar alt="User Avatar" src="/static/images/avatar/2.jpg" />
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: "45px", width: "250px" }}
                anchorEl={anchorElUser}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                keepMounted
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                open={Boolean(anchorElUser)}
                onClose={closeUserMenu}
              >
                {userSettings.map((setting) => (
                  <MenuItem key={setting} onClick={() => { closeUserMenu(); if (setting === "Logout") logout(); }}>
                    <Typography textAlign="center">{setting}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </Box>
  );
}

export default ResponsiveAppBar;
