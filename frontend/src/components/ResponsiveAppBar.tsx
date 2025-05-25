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
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import BusinessIcon from "@mui/icons-material/Business";
import LogoutIcon from "@mui/icons-material/Logout";

function ResponsiveAppBar() {
  const { logout, empresaId } = useAuth();
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
      action: logout,
    },
  ];

  return (
    <Box>
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
            px: {
              xs: 1,
              sm: 2,
              md: 3,
            },
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {/* Lado esquerdo */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            {empresaId && (
              <IconButton
                onClick={toggleSidebar}
                color="inherit"
                sx={{
                  marginRight: 2,
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
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
                fontSize: {
                  xs: "1.2rem",
                  sm: "1.8rem",
                  md: "2.0rem",
                },
                ml: {
                  xs: 1.65,
                  sm: 3.4,
                  md: 3.8,
                },
                cursor: "pointer",
              }}
              onClick={() => navigate("/")}
            >
              PFIRE
            </Typography>
          </Box>

          {/* Lado direito */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <Tooltip title="Open settings">
              <IconButton
                onClick={openUserMenu}
                sx={{
                  p: 0,
                }}
              >
                <Avatar alt="User Avatar" src="/static/images/avatar/2.jpg" />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorElUser}
              open={Boolean(anchorElUser)}
              onClose={closeUserMenu}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              PaperProps={{
                sx: {
                  mt: 3,
                  minWidth: 140,
                  maxWidth: 200,
                  boxShadow: 3,
                },
              }}
            >
              {userSettings.map(({ label, icon, action }) => (
                <MenuItem
                  key={label}
                  onClick={() => {
                    closeUserMenu();
                    action();
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {icon}
                    <Typography variant="body2" textAlign="left" width="100%">
                      {label}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ height: 100 }} />
    </Box>
  );
}

export default ResponsiveAppBar;
