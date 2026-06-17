import { Chip } from "@mui/material";
import { styled, emphasize } from "@mui/material/styles";

const StyledBreadcrumb = styled(Chip)(({ theme }) => ({
  backgroundColor: "transparent", // Mostra sempre o fundo do Paper
  height: theme.spacing(3),
  color: theme.palette.text.primary,
  fontWeight: theme.typography.fontWeightRegular,
  transition: "background-color 0.3s", // Suaviza a transição
  "&:hover": {
    backgroundColor: emphasize(theme.palette.background.paper, 0.06),
  },
}));

export default StyledBreadcrumb;
