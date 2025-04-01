import { useState } from "react";
import { useTheme} from "@mui/material";
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
  Container,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "../hooks/AuthContext";
import logo from "../assets/images/logo.png";
import Sidebar from "./Sidebar";

const userSettings = ["Profile", "Account", "Dashboard", "Logout"];

function ResponsiveAppBar() {
  const { logout } = useAuth();
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = useTheme();

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
    <Box sx={{border: 0}}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <AppBar
        position="static"
        sx={{ backgroundColor: theme.palette.primary.main}}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: 54 }}>
            <IconButton
              size="large"
              onClick={toggleSidebar}
              color="inherit"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <img
              src={logo}
              alt="Logo"
              style={{
                maxHeight: 70, // respeita a altura do header
                transform: "scale(2.0)", // aumenta visualmente o tamanho
                transformOrigin: "left center", // ajusta onde ele expande
                marginRight: 10,
              }}
            />

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
                marginLeft: 3,
                fontSize: "1.7rem",
              }}
            >
              PFIRE
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

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
                  <MenuItem
                    key={setting}
                    onClick={() => {
                      closeUserMenu();
                      if (setting === "Logout") logout();
                    }}
                  >
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
