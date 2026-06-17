import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/system";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import FacebookOutlinedIcon from "@mui/icons-material/FacebookOutlined";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutlineOutlined";
import XIcon from "@mui/icons-material/Twitter";

const FooterContainer = styled("footer")(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  paddingTop: theme.spacing(6),
  paddingBottom: theme.spacing(4),
  position: "relative",
  overflowX: "hidden",
}));

const SocialIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.common.white,
  margin: theme.spacing(0, 1),
  transition: "transform 0.2s",
  "&:hover": {
    transform: "scale(1.1)",
    color: theme.palette.secondary.main,
  },
}));

const ScrollToTopButton = styled(IconButton)(({ theme }) => ({
  position: "fixed",
  left: theme.spacing(2),
  bottom: theme.spacing(2),
  backgroundColor: theme.palette.secondary.main,
  color: theme.palette.common.white,
  zIndex: 9999,
  "&:hover": {
    backgroundColor: theme.palette.secondary.dark,
  },
}));

const Footer = () => {
  const [email, setEmail] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleSubscription = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log("Subscribed:", email);
      setEmail("");
    }
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <FooterContainer>
      <Container>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          <Box
            component="nav"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            {["About", "Services", "Contact", "Privacy Policy"].map((link) => (
              <Typography
                key={link}
                variant="body2"
                component="div"
                sx={{
                  mb: 1,
                  cursor: "pointer",
                  "&:hover": {
                    color: theme.palette.secondary.main,
                  },
                }}
              >
                {link}
              </Typography>
            ))}
          </Box>

          <Box
            sx={{
              flex: "1",
              minWidth: 250,
              width: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                mb: 1,
              }}
            >
              <MailOutlineIcon
                style={{
                  marginRight: 8,
                }}
              />
              <Typography variant="body2">info@company.com</Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                mb: 1,
              }}
            >
              <LocalPhoneOutlinedIcon
                style={{
                  marginRight: 8,
                }}
              />
              <Typography variant="body2">+1 (555) 123-4567</Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
              }}
            >
              <LocationOnOutlinedIcon
                style={{
                  marginRight: 8,
                }}
              />
              <Typography variant="body2">123 Business Street, City, Country</Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            flex: "1",
            minWidth: 250,
            width: "100%",
          }}
        >
          <Box component="form" onSubmit={handleSubscription}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder="Enter your email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{
                backgroundColor: "transparent",
                input: {
                  color: "black",
                },
                paddingRight: "8px",
                mb: 2,
              }}
            />
            <Button type="submit" variant="contained" color="secondary">
              Send
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            mt: 6,
            pt: 3,
            borderTop: 1,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              mb: isMobile ? 2 : 0,
            }}
          >
            © {new Date().getFullYear()} PFIRE. All rights reserved.
          </Typography>
          <Box>
            <Tooltip title="Facebook">
              <SocialIconButton aria-label="Facebook">
                <FacebookOutlinedIcon />
              </SocialIconButton>
            </Tooltip>
            <Tooltip title="X">
              <SocialIconButton aria-label="X">
                <XIcon />
              </SocialIconButton>
            </Tooltip>
            <Tooltip title="LinkedIn">
              <SocialIconButton aria-label="LinkedIn">
                <LinkedInIcon />
              </SocialIconButton>
            </Tooltip>
            <Tooltip title="Instagram">
              <SocialIconButton aria-label="Instagram">
                <InstagramIcon />
              </SocialIconButton>
            </Tooltip>
          </Box>
        </Box>
      </Container>
      <ScrollToTopButton onClick={handleScrollToTop} aria-label="Scroll to top">
        <ArrowUpwardIcon />
      </ScrollToTopButton>
    </FooterContainer>
  );
};

export default Footer;
