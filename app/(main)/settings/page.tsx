"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  DeleteOutlineRounded,
  CalendarMonthRounded,
  LogoutRounded,
  PersonRounded,
  RefreshRounded,
  SaveRounded,
  UploadFileRounded,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import API from "@/lib/api";
import { UserService } from "@/services/user";
import OutlookConnectionDialog from "@/components/outlook/OutlookConnectionDialog";
import { useAuthContext } from "@/context/AuthContext";
import { useOutlookCalendar } from "@/hooks/useOutlookCalendar";
import { PageHeader, SectionPanel, SurfaceCard } from "@/components/common/WorkspaceUI";

export default function SettingsPage() {
  const { user, logout, refresh } = useAuthContext();
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isOutlookDialogOpen, setIsOutlookDialogOpen] = useState(false);
  const {
    status: outlookStatus,
    loading: outlookLoading,
    busy: outlookBusy,
    error: outlookError,
    fetchStatus: refreshOutlookStatus,
    connect: connectOutlook,
    disconnect: disconnectOutlook,
  } = useOutlookCalendar();
  const [form, setForm] = useState({
    username: (user as any)?.username || "",
    companyName: (user as any)?.companyName || "",
    companyAddress: (user as any)?.companyAddress || "",
    crmAddress: (user as any)?.crmAddress || "",
    contactEmail: (user as any)?.contactEmail || "",
    contactPhone: (user as any)?.contactPhone || "",
  });

  useEffect(() => {
    if (!isEditing) {
      setForm({
        username: (user as any)?.username || "",
        companyName: (user as any)?.companyName || "",
        companyAddress: (user as any)?.companyAddress || "",
        crmAddress: (user as any)?.crmAddress || "",
        contactEmail: (user as any)?.contactEmail || "",
        contactPhone: (user as any)?.contactPhone || "",
      });
    }
  }, [isEditing, user]);

  const initial = useMemo(() => {
    const source =
      (user as any)?.username || (user as any)?.name || user?.email || "?";
    return String(source).trim().charAt(0).toUpperCase();
  }, [user]);

  const needsPassword = (user as any)?.authProvider === "email";
  const memberSince = useMemo(() => {
    const value = (user as any)?.createdAt;
    return value ? new Date(value).toLocaleDateString() : "—";
  }, [user]);
  const lastUpdated = useMemo(() => {
    const value = (user as any)?.updatedAt;
    return value ? new Date(value).toLocaleDateString() : "—";
  }, [user]);

  const handleCvChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setCvFile(null);
      return;
    }
    const validName = file.name.toLowerCase().endsWith(".docx");
    const validType =
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!validName || !validType) {
      setCvFile(null);
      toast.error("Only .docx files are allowed.");
      return;
    }
    setCvFile(file);
  };

  const handleUploadCv = async () => {
    if (!cvFile) return;
    try {
      setUploadingCv(true);
      await UserService.uploadCv(cvFile);
      setCvFile(null);
      toast.success("CV uploaded");
      await refresh();
    } catch (uploadError: any) {
      toast.error(
        uploadError?.response?.data?.message ||
          uploadError?.message ||
          "Failed to upload CV"
      );
    } finally {
      setUploadingCv(false);
    }
  };

  const handleDeleteCv = async () => {
    try {
      setUploadingCv(true);
      await UserService.deleteCv();
      toast.success("CV removed");
      await refresh();
    } catch (deleteError: any) {
      toast.error(
        deleteError?.response?.data?.message ||
          deleteError?.message ||
          "Failed to delete CV"
      );
    } finally {
      setUploadingCv(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await UserService.update({
        username: form.username || undefined,
        companyName: form.companyName || undefined,
        companyAddress: form.companyAddress || undefined,
        crmAddress: form.crmAddress || undefined,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
      });
      toast.success("Profile updated");
      setIsEditing(false);
      await refresh();
    } catch (saveError: any) {
      toast.error(
        saveError?.response?.data?.message ||
          saveError?.message ||
          "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      router.replace("/welcome");
    } catch {
      setLoggingOut(false);
    }
  };

  const confirmDelete = async () => {
    if (confirmText !== "DELETE") return;
    try {
      setDeleting(true);
      setError(null);
      await API.delete("/user", {
        data: needsPassword ? { password: deletePassword } : undefined,
      });
      await logout();
      router.replace("/welcome");
    } catch (deleteError: any) {
      setError(
        deleteError?.response?.data?.message ||
          deleteError?.message ||
          "Failed to delete account"
      );
      setDeleting(false);
    }
  };

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage profile information, company details, appraiser CV uploads, session controls, and destructive account actions."
      />

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", xl: "1.15fr 0.85fr" },
        }}
      >
        <SectionPanel
          title="Profile and company details"
          subtitle="This is the canonical profile surface for your authenticated workspace."
          action={
            isEditing ? (
              <Stack direction="row" spacing={1}>
                <Button variant="text" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveRounded />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </Stack>
            ) : (
              <Button variant="contained" onClick={() => setIsEditing(true)}>
                Edit profile
              </Button>
            )
          }
        >
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "var(--app-accent)",
                  fontSize: 26,
                  fontWeight: 800,
                }}
              >
                {initial}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ color: "var(--app-text)" }}>
                  {(user as any)?.username || user?.email || "Account"}
                </Typography>
                <Typography sx={{ color: "var(--app-text-muted)" }}>
                  Member since {memberSince} · Last updated {lastUpdated}
                </Typography>
              </Box>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              }}
            >
              {[
                { key: "username", label: "Username", value: form.username, readOnly: !isEditing },
                { key: "email", label: "Email", value: user?.email || "", readOnly: true },
                { key: "companyName", label: "Company name", value: form.companyName, readOnly: !isEditing },
                { key: "companyAddress", label: "Company address", value: form.companyAddress, readOnly: !isEditing },
                ...(user as any)?.isCrmAgent
                  ? [{ key: "crmAddress", label: "CRM service address", value: form.crmAddress, readOnly: !isEditing }]
                  : [],
                { key: "contactEmail", label: "Contact email", value: form.contactEmail, readOnly: !isEditing },
                { key: "contactPhone", label: "Contact phone", value: form.contactPhone, readOnly: !isEditing },
              ].map((field) => (
                <TextField
                  key={field.key}
                  name={field.key}
                  label={field.label}
                  value={field.value}
                  onChange={onChange}
                  fullWidth
                  disabled={field.readOnly}
                />
              ))}
            </Box>
          </Stack>
        </SectionPanel>

        <Stack spacing={2}>
          <SectionPanel
            title="Appraiser CV"
            subtitle="Upload a `.docx` CV to append it to report packages."
          >
            <Stack spacing={2}>
              <SurfaceCard sx={{ p: 2 }}>
                <Typography sx={{ color: "var(--app-text)", fontWeight: 800 }}>
                  Current file
                </Typography>
                {(user as any)?.cvUrl ? (
                  <Stack spacing={1.25} sx={{ mt: 1.2 }}>
                    <Typography sx={{ color: "var(--app-text-muted)" }}>
                      {(user as any)?.cvFilename || (user as any)?.cvUrl}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        component="a"
                        href={(user as any)?.cvUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View CV
                      </Button>
                      <Button
                        color="error"
                        variant="outlined"
                        onClick={handleDeleteCv}
                        disabled={uploadingCv}
                      >
                        Remove
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Typography sx={{ mt: 1.2, color: "var(--app-text-muted)" }}>
                    No CV uploaded yet.
                  </Typography>
                )}
              </SurfaceCard>

              <Stack spacing={1.5}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileRounded />}
                >
                  Select `.docx`
                  <input hidden type="file" accept=".docx" onChange={handleCvChange} />
                </Button>
                {cvFile ? (
                  <Alert severity="info">Selected file: {cvFile.name}</Alert>
                ) : null}
                <Button
                  variant="contained"
                  onClick={handleUploadCv}
                  disabled={!cvFile || uploadingCv}
                >
                  {uploadingCv ? "Uploading..." : "Upload CV"}
                </Button>
              </Stack>
            </Stack>
          </SectionPanel>

          <SectionPanel
            title="Session"
            subtitle="Sign out of the current device."
          >
            <Stack spacing={2}>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<LogoutRounded />}
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </Button>
            </Stack>
          </SectionPanel>

          <SectionPanel
            title="Outlook calendar"
            subtitle="Integration settings now live here, while quick connection access stays in the navbar."
            action={
              <Button
                size="small"
                startIcon={<RefreshRounded />}
                onClick={() => void refreshOutlookStatus()}
                disabled={outlookLoading || outlookBusy}
              >
                Refresh
              </Button>
            }
          >
            <Stack spacing={2}>
              <SurfaceCard sx={{ p: 2 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 3,
                      bgcolor: outlookStatus.connected
                        ? "rgba(5,150,105,0.12)"
                        : "rgba(37,99,235,0.12)",
                      color: outlookStatus.connected ? "#059669" : "#2563eb",
                    }}
                  >
                    <CalendarMonthRounded />
                  </Avatar>
                  <Box>
                    <Typography sx={{ color: "var(--app-text)", fontWeight: 800 }}>
                      {outlookStatus.connected ? "Outlook connected" : "Outlook not connected"}
                    </Typography>
                    <Typography sx={{ color: "var(--app-text-muted)" }}>
                      {outlookStatus.email || "Use the navbar calendar control or the button below to manage connection."}
                    </Typography>
                  </Box>
                </Stack>
              </SurfaceCard>

              {outlookError ? <Alert severity="error">{outlookError}</Alert> : null}

              <Button
                variant="contained"
                onClick={() => setIsOutlookDialogOpen(true)}
                disabled={outlookBusy}
              >
                Manage Outlook connection
              </Button>
            </Stack>
          </SectionPanel>
        </Stack>
      </Box>

      <SectionPanel
        title="Danger zone"
        subtitle="This action is permanent and removes your account and related data."
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          Deleting your account will permanently remove your profile, reports, and stored data.
        </Alert>
        <Button
          color="error"
          variant="contained"
          startIcon={<DeleteOutlineRounded />}
          onClick={() => {
            setIsDeleteOpen(true);
            setConfirmText("");
            setDeletePassword("");
            setError(null);
          }}
        >
          Delete account
        </Button>
      </SectionPanel>

      <Dialog open={isDeleteOpen} onClose={() => !deleting && setIsDeleteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Delete account</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="error">
              Type <strong>DELETE</strong> to confirm permanent account removal.
            </Alert>
            <TextField
              label="Type DELETE to confirm"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              fullWidth
            />
            {needsPassword ? (
              <TextField
                label="Password"
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                fullWidth
              />
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={
              deleting ||
              confirmText !== "DELETE" ||
              (needsPassword && !deletePassword)
            }
          >
            {deleting ? "Deleting..." : "Permanently delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <OutlookConnectionDialog
        open={isOutlookDialogOpen}
        onClose={() => setIsOutlookDialogOpen(false)}
        status={outlookStatus}
        loading={outlookLoading}
        busy={outlookBusy}
        error={outlookError}
        onRefresh={() => void refreshOutlookStatus()}
        onConnect={() => void connectOutlook()}
        onDisconnect={() => void disconnectOutlook()}
      />
    </Stack>
  );
}
