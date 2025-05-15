import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
} from "@mui/material";
import {
  Description as DescriptionIcon,
  Star as StarIcon,
  Layers as LayersIcon,
  Info as InfoIcon,
  ExpandLess,
  ExpandMore,
  ArrowForwardIos as ArrowForwardIosIcon,
  Engineering as EngineeringIcon,
} from "@mui/icons-material";
import GroupIcon from "@mui/icons-material/Group";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const [openReports, setOpenReports] = useState(false);
  const [openModels, setOpenModels] = useState(false);
 

  const handleToggleReports = () => {
    setOpenReports(!openReports);
  };

  const handleToggleModels = () => {
    setOpenModels(!openModels);
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
            {openReports ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        {/* Submenu de Relatórios */}
        <Collapse in={openReports} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem disablePadding>
              <ListItemButton sx={{ width: "90%", pl: 4 }}>
                <ListItemIcon>
                  <ArrowForwardIosIcon
                    sx={{ marginRight: 2, fontSize: "small" }}
                  />
                </ListItemIcon>
                <ListItemText primary="Extintores" />
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>
        {/* Modelos - Com submenu */}
        <ListItem disablePadding>
          <ListItemButton onClick={handleToggleModels}>
            <ListItemIcon>
              <LayersIcon />
            </ListItemIcon>
            <ListItemText primary="Modelos" />
            {openModels ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        {/* Submenu de Modelos */}
        <Collapse in={openModels} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem disablePadding>
              <ListItemButton sx={{ width: "90%", pl: 4 }}>
                <ListItemIcon>
                  <ArrowForwardIosIcon
                    sx={{ marginRight: 2, fontSize: "small" }}
                  />
                </ListItemIcon>
                <ListItemText primary="Extintores" />
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>
        {/* Atualizar Plano */}
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <StarIcon />
            </ListItemIcon>
            <ListItemText primary="Atualizar Plano" />
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
      </List>
      <Divider />
      {/* Parte inferior - Utilizadores e Suporte */}
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {/* Utilizadores */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigation("/users-list")}>
            <ListItemIcon>
              <EngineeringIcon />
            </ListItemIcon>
            <ListItemText primary="Funcionários" />
          </ListItemButton>
        </ListItem>
        {/* Suporte */}
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="Suporte" />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Drawer
      open={isOpen}
      onClose={toggleSidebar}
      sx={{ width: 250, flexShrink: 0, "& .MuiDrawer-paper": { width: 250 } }}
    >
      {DrawerList}
    </Drawer>
  );
};

export default Sidebar;
