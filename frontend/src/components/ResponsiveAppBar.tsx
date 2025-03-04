import * as React from "react";
import { useTheme, useMediaQuery } from "@mui/material";
import { AppBar, Box, Toolbar, IconButton, Menu, Avatar, Tooltip, MenuItem, Typography, Button, Container} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "../hooks/AuthContext";
import logo from "../assets/images/logo.png";

const navigationPages = ["Products", "Pricing", "Blog"];
const userSettings = ["Profile", "Account", "Dashboard", "Logout"];

function ResponsiveAppBar() {
  const { user, logout } = useAuth();
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // Detecta se a tela é pequena

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

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: theme.palette.primary.main,
        borderRadius: 0,
        boxShadow: 0,
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo */}
          <img src={logo} alt="Logo" style={{ width: 80, height: 80, marginRight: 10 }} />

          {/* Nome da aplicação - aparece apenas em telas grandes */}
          <Typography
            variant="h6"
            noWrap
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

          {/* Se for tela pequena, mostra o Menu Hambúrguer */}
          {isMobile ? (
            <Box sx={{ flexGrow: 1, display: "flex" }}>
              <IconButton
                size="large"
                aria-label="open menu"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={openNavigationMenu}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "left",
                }}
                open={Boolean(anchorElNav)}
                onClose={closeNavigationMenu}
              >
                {navigationPages.map((page) => (
                  <MenuItem key={page} onClick={closeNavigationMenu}>
                    <Typography textAlign="center">{page}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          ) : (
            /* Se for tela grande, mostra os botões de navegação */
            <Box sx={{ flexGrow: 1, display: "flex" }}>
              {navigationPages.map((page) => (
                <Button
                  key={page}
                  onClick={closeNavigationMenu}
                  sx={{ my: 2, color: "white", display: "block" }}
                >
                  {page}
                </Button>
              ))}
            </Box>
          )}

          {/* Menu do usuário */}
          <Box sx={{ width: "auto", display: "flex", alignItems: "center" }}>
  <Tooltip title="Open settings">
    <IconButton onClick={openUserMenu} sx={{ p: 0 }}>
      <Avatar alt="User Avatar" src="/static/images/avatar/2.jpg" />
    </IconButton>
  </Tooltip>
  <Menu
  sx={{ mt: "45px", width: "250px", minWidth: "50px" }}
  id="menu-appbar"
  anchorEl={anchorElUser}
  anchorOrigin={{
    vertical: "top",
    horizontal: "right",
  }}
  keepMounted
  transformOrigin={{
    vertical: "top",
    horizontal: "right",
  }}
  open={Boolean(anchorElUser)}
  onClose={closeUserMenu}
>
  {userSettings.map((setting) => (
    <MenuItem
      key={setting}
      onClick={() => {
        closeUserMenu();
        if (setting === "Logout") {
          logout();
        }
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
  );
}

export default ResponsiveAppBar;