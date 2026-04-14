"use client";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  CalendarMonthRounded,
  CloseRounded,
  RefreshRounded,
} from "@mui/icons-material";
import type { OutlookCalendarStatus } from "@/services/outlook";

export default function OutlookConnectionDialog({
  open,
  onClose,
  status,
  loading,
  busy,
  error,
  onConnect,
  onDisconnect,
  onRefresh,
}: {
  open: boolean;
  onClose: () => void;
  status: OutlookCalendarStatus;
  loading: boolean;
  busy: boolean;
  error?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 7 }}>
        Outlook calendar
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 12,
            top: 12,
            border: "1px solid var(--app-border)",
            bgcolor: "var(--app-panel)",
          }}
        >
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 3,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(37,99,235,0.12)",
                color: "#2563eb",
              }}
            >
              <CalendarMonthRounded />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, color: "var(--app-text)" }}>
                Calendar connection
              </Typography>
              <Typography sx={{ color: "var(--app-text-muted)" }}>
                Manage Outlook sync from one dedicated modal.
              </Typography>
            </Box>
          </Stack>

          {loading ? (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <CircularProgress size={18} />
              <Typography sx={{ color: "var(--app-text-muted)" }}>
                Checking Outlook connection...
              </Typography>
            </Stack>
          ) : (
            <Alert severity={status.connected ? "success" : "info"} sx={{ borderRadius: 3 }}>
              {status.connected
                ? `Connected${status.email ? ` as ${status.email}` : ""}`
                : "Outlook calendar is not connected yet."}
            </Alert>
          )}

          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              border: "1px solid var(--app-border)",
              bgcolor: "var(--app-panel-soft)",
            }}
          >
            <Stack spacing={1}>
              <Typography sx={{ fontWeight: 700, color: "var(--app-text)" }}>
                Connection details
              </Typography>
              <Typography sx={{ color: "var(--app-text-muted)" }}>
                Status: {status.connected ? "Connected" : "Not connected"}
              </Typography>
              <Typography sx={{ color: "var(--app-text-muted)" }}>
                Email: {status.email || "Not available"}
              </Typography>
              <Typography sx={{ color: "var(--app-text-muted)" }}>
                Connected at:{" "}
                {status.connectedAt ? new Date(status.connectedAt).toLocaleString() : "Not available"}
              </Typography>
            </Stack>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          variant="text"
          startIcon={<RefreshRounded />}
          onClick={onRefresh}
          disabled={loading || busy}
        >
          Refresh
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Close</Button>
        {status.connected ? (
          <Button color="error" variant="contained" onClick={onDisconnect} disabled={busy}>
            {busy ? "Disconnecting..." : "Disconnect"}
          </Button>
        ) : (
          <Button variant="contained" onClick={onConnect} disabled={busy}>
            {busy ? "Connecting..." : "Connect Outlook"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
