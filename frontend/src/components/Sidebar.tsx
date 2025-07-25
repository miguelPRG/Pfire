import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import {
  Description as DescriptionIcon,
  Layers as LayersIcon,
  Engineering as EngineeringIcon,
} from "@mui/icons-material";
import GroupIcon from "@mui/icons-material/Group";
import { useAuth } from "../hooks/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const [openReports, setOpenReports] = useState(false);
  const { empresa } = useAuth();
  const handleToggleReports = () => {
    setOpenReports(!openReports);
  };

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
        {/* Relatórios - Com submenu */}
        <ListItem disablePadding>
          <ListItemButton onClick={handleToggleReports}>
            <ListItemIcon>
              <DescriptionIcon />
            </ListItemIcon>
            <ListItemText primary="Relatórios" />
          </ListItemButton>
        </ListItem>
        {/* Modelos - Com submenu */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation("/report-models")}>
            <ListItemIcon>
              <LayersIcon />
            </ListItemIcon>
            <ListItemText primary="Modelos" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation("/clients-list")}>
            <ListItemIcon>
              <GroupIcon />
            </ListItemIcon>
            <ListItemText primary="Clientes" />
          </ListItemButton>
        </ListItem>
        {empresa?.isAdmin && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigation("/users-list")}>
              <ListItemIcon>
                <EngineeringIcon />
              </ListItemIcon>
              <ListItemText primary="Funcionários" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
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
