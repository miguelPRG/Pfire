import { useNavigate } from "react-router-dom";
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, useTheme } from "@mui/material";
import {
  Layers as LayersIcon,
  Engineering as EngineeringIcon,
  CardMembership as CardMembershipIcon,
} from "@mui/icons-material";
import GroupIcon from "@mui/icons-material/Group";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../hooks/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const { empresa, logout } = useAuth();
  const theme = useTheme();
  const iconColor = theme.palette.mode === "dark" ? "#fff" : "#000";

  const handleNavigation = (path: string) => {
    navigate(path);
    toggleSidebar(); // Fecha o Sidebar ao navegar
  };

  const DrawerList = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        justifyContent: "space-between",
      }}
      role="presentation"
    >
      {/* Lista principal */}
      <List sx={{ flexGrow: 1 }}>
        {/* Modelos - Com submenu */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation("/report-models")}>
            <ListItemIcon>
              <LayersIcon sx={{ color: iconColor }} />
            </ListItemIcon>
            <ListItemText primary="Modelos" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation("/clients-list")}>
            <ListItemIcon>
              <GroupIcon sx={{ color: iconColor }} />
            </ListItemIcon>
            <ListItemText primary="Clientes" />
          </ListItemButton>
        </ListItem>
        {empresa?.isAdmin && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigation("/users-list")}>
              <ListItemIcon>
                <EngineeringIcon sx={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Funcionários" />
            </ListItemButton>
          </ListItem>
        )}
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation("/plans")}>
            <ListItemIcon>
              <CardMembershipIcon sx={{ color: iconColor }} />
            </ListItemIcon>
            <ListItemText primary="Planos" />
          </ListItemButton>
        </ListItem>
      </List>
      {/* Botão de logout fixo no rodapé do Drawer */}
      <Box sx={{ p: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={async () => {
              try {
                await logout();
              } finally {
                navigate("/login", { replace: true });
                toggleSidebar();
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: "auto" }}>
              <LogoutIcon fontSize="small" sx={{ mr: 1, color: iconColor }} />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Drawer
      open={isOpen}
      onClose={toggleSidebar}
      sx={{
        width: 250,
        flexShrink: 0,
        "& .MuiDrawer-paper": { width: 250 },
      }}
    >
      {DrawerList}
    </Drawer>
  );
};

export default Sidebar;
