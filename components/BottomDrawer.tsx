"use client";

import {
  Box,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { CloseRounded } from "@mui/icons-material";

export default function BottomDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <Drawer
      anchor={desktop ? "right" : "bottom"}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        paper: {
          sx: {
            width: desktop ? "min(960px, 92vw)" : "100%",
            maxHeight: desktop ? "100%" : "92vh",
            borderTopLeftRadius: desktop ? 0 : 14,
            borderTopRightRadius: desktop ? 0 : 14,
            borderLeft: desktop ? "1px solid var(--app-border)" : undefined,
            borderTop: desktop ? undefined : "1px solid var(--app-border)",
            bgcolor: "var(--app-panel)",
            backgroundImage:
              "radial-gradient(circle at top left, rgba(225,29,72,0.08), transparent 24%), radial-gradient(circle at bottom right, rgba(37,99,235,0.08), transparent 24%)",
            boxShadow: "var(--app-shadow-modal)",
            overflow: "hidden",
          },
        },
      }}
    >
      <Stack sx={{ height: "100%" }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            px: { xs: 2, md: 3 },
            py: 2,
            borderBottom: "1px solid var(--app-border)",
            position: "sticky",
            top: 0,
            zIndex: 2,
            bgcolor: "var(--app-panel-soft)",
            backdropFilter: "blur(18px)",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title ? (
              <Typography variant="h6" sx={{ color: "var(--app-text)" }}>
                {title}
              </Typography>
            ) : null}
            <Typography variant="body2" sx={{ color: "var(--app-text-muted)" }}>
              Review and update details in a focused workspace.
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              border: "1px solid var(--app-border)",
              bgcolor: "var(--app-panel)",
            }}
          >
            <CloseRounded />
          </IconButton>
        </Stack>
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: { xs: 2, md: 3 },
            py: { xs: 2, md: 3 },
          }}
        >
          {children}
        </Box>
      </Stack>
    </Drawer>
  );
}
