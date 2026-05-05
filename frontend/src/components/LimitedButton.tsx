import { Button, Tooltip, Box } from "@mui/material";
import React from "react";

interface LimitedButtonProps {
  disabled: boolean;
  message: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "contained" | "outlined" | "text";
  color?: "primary" | "secondary" | "error" | "warning" | "info" | "success";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  sx?: any;
}

export function LimitedButton({
  disabled,
  message,
  onClick,
  children,
  variant = "contained",
  color = "primary",
  size = "medium",
  fullWidth = false,
  sx = {},
}: LimitedButtonProps) {
  return (
    <Tooltip title={disabled && message ? message : ""} arrow placement="top">
      <Box sx={{ display: "inline-block", width: fullWidth ? "100%" : "auto" }}>
        <Button
          variant={variant}
          color={color}
          size={size}
          fullWidth={fullWidth}
          disabled={disabled}
          onClick={onClick}
          sx={{
            ...sx,
            opacity: disabled ? 0.6 : 1,
            transition: "all 0.2s ease",
          }}
        >
          {children}
        </Button>
      </Box>
    </Tooltip>
  );
}
