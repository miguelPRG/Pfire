import { createTheme } from "@mui/material/styles";
import commonComponents from "./themeComponents";

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976D2" },
    secondary: { main: "#00C8FF" },
    error: { main: "#D32F2F" },
    warning: { main: "#FFA000" },
    success: { main: "#388E3C" },
    background: { default: "#ECEFF1", paper: "#FFFFFF" },
    text: { primary: "#212121", secondary: "#757575" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
  },
  components: commonComponents,
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#1976D2" },
    secondary: { main: "#00C8FF" },
    error: { main: "#FF4C4C" },
    warning: { main: "#FF9F00" },
    success: { main: "#39B54A" },
    background: { default: "#121212", paper: "#1D1D1D" },
    text: { primary: "#F1F1F1", secondary: "#B0B0B0" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
  },
  components: commonComponents,
});
