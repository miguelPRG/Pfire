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

  // dispara quando a página rola
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
  });

  return (
    <Box>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <AppBar
        position="fixed"
        elevation={trigger ? 4 : 0}
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
          {/* Lado esquerdo */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              onClick={toggleSidebar}
              color="inherit"
              sx={{ marginRight: 2 }}
            >
              <MenuIcon />
            </IconButton>

            <Box
              component="img"
              src={logo}
              alt="Logo"
              sx={{
                cursor: "pointer",
                height: 40,
                transform: {
                  xs: "scale(2.1)",
                  sm: "scale(2.75)",
                  md: "scale(2.8)",
                },
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

          {/* Lado direito */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Tooltip title="Open settings">
              <IconButton onClick={openUserMenu} sx={{ p: 0 }}>
                <Avatar alt="User Avatar" src="/static/images/avatar/2.jpg" />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorElUser}
              open={Boolean(anchorElUser)}
              onClose={closeUserMenu}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 140,
                  maxWidth: 200,
                  boxShadow: 3,
                },
              }}
            >
              {userSettings.map((setting) => (
                <MenuItem
                  key={setting}
                  onClick={() => {
                    closeUserMenu();
                    if (setting === "Perfil") navigate("/edit-profile");
                    if (setting === "Logout") logout();
                  }}
                >
                  <Typography variant="body2" textAlign="left" width="100%">
                    {setting}
                  </Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Espaço para não sobrepor o conteúdo */}
      <Box sx={{ height: 100 }} />
    </Box>
  );
}

export default ResponsiveAppBar;
