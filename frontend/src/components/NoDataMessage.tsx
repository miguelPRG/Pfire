import { Box, Typography } from "@mui/material";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import { keyframes } from "@emotion/react";

const bounce = keyframes`
  0% { transform: translateY(0);}
  50% { transform: translateY(-10px);}
  100% { transform: translateY(0);}
`;

export default function NoDataMessage({ nome, isTablet = true }: { nome?: string; isTablet?: boolean }) {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 6,
        color: "text.secondary",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <SentimentDissatisfiedIcon
        sx={{
          fontSize: 60,
          animation: `${bounce} 1.2s infinite`,
        }}
      />
      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
        Ups! Não há {nome} para mostrar.
      </Typography>
      {isTablet && (
        <Typography variant="body2">
          Tenta pesquisar por outro nome ou convida alguém para se juntar à equipa!
        </Typography>
      )}
    </Box>
  );
}
