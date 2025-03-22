import * as React from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import WorkIcon from "@mui/icons-material/Work";
import DescriptionIcon from "@mui/icons-material/Description";
import StarIcon from "@mui/icons-material/Star";
import LayersIcon from "@mui/icons-material/Layers";
import InfoIcon from "@mui/icons-material/Info";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const [openReports, setOpenReports] = React.useState(false);
  const [openModels, setOpenModels] = React.useState(false);

  const handleToggleReports = () => {
    setOpenReports(!openReports);
  };

  const handleToggleModels = () => {
    setOpenModels(!openModels);
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
        {/* Clientes */}
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <WorkIcon />
            </ListItemIcon>
            <ListItemText primary="Clientes" />
          </ListItemButton>
        </ListItem>

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
      </List>

      <Divider />

      {/* Parte inferior - Utilizadores e Suporte */}
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {/* Utilizadores */}
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <AccountCircleIcon />
            </ListItemIcon>
            <ListItemText primary="Utilizadores" />
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
      sx={{ width: 250, flexShrink: 0 }}
      PaperProps={{ sx: { width: 250 } }}
    >
      {DrawerList}
    </Drawer>
  );
};

export default Sidebar;
