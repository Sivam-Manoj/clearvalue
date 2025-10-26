"use client";

import { useAuthContext } from "@/context/AuthContext";
import API from "@/lib/api";
import { UserService } from "@/services/user";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { Trash2, User, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  const [form, setForm] = useState({
    username: (user as any)?.username || "",
    companyName: (user as any)?.companyName || "",
    companyAddress: (user as any)?.companyAddress || "",
    contactEmail: (user as any)?.contactEmail || "",
    contactPhone: (user as any)?.contactPhone || "",
  });

  useEffect(() => {
    if (!isEditing) {
      setForm({
        username: (user as any)?.username || "",
        companyName: (user as any)?.companyName || "",
        companyAddress: (user as any)?.companyAddress || "",
        contactEmail: (user as any)?.contactEmail || "",
        contactPhone: (user as any)?.contactPhone || "",
      });
    }
  }, [user, isEditing]);

  const initial = useMemo(() => {
    const source =
      (user as any)?.username || (user as any)?.name || user?.email || "?";
    return String(source).trim().charAt(0).toUpperCase();
  }, [user]);

  const needsPassword = (user as any)?.authProvider === "email";
  const memberSince = useMemo(() => {
    const d = (user as any)?.createdAt;
    return d ? new Date(d).toLocaleDateString() : "-";
  }, [user]);
  const lastUpdated = useMemo(() => {
    const d = (user as any)?.updatedAt;
    return d ? new Date(d).toLocaleDateString() : "-";
  }, [user]);

  const openDelete = () => {
    setIsDeleteOpen(true);
    setConfirmText("");
    setDeletePassword("");
    setError(null);
  };

  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setCvFile(f);
  };

  const handleUploadCv = async () => {
    if (!cvFile) return;
    try {
      setUploadingCv(true);
      await UserService.uploadCv(cvFile);
      setCvFile(null);
      toast.success("CV uploaded");
      await refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to upload CV");
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
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to delete CV");
    } finally {
      setUploadingCv(false);
    }
  };

  const closeDelete = () => {
    if (deleting) return;
    setIsDeleteOpen(false);
    setConfirmText("");
    setDeletePassword("");
    setError(null);
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
      router.replace("/login");
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to delete account"
      );
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      router.replace("/login");
    } catch (e) {
      setLoggingOut(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await UserService.update({
        username: form.username || undefined,
        companyName: form.companyName || undefined,
        companyAddress: form.companyAddress || undefined,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
      });
      toast.success("Profile updated");
      setIsEditing(false);
      await refresh();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative isolate">
      <div
        className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-40 bg-gradient-to-b from-rose-100/80 to-transparent"
        aria-hidden
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-rose-600 to-rose-400 bg-clip-text text-transparent drop-shadow-sm">
            Settings
          </h1>
          <p className="mt-1 text-sm sm:text-base text-rose-800/70">
            Manage your profile and account.
          </p>
        </div>

        {/* Profile */}
        <section className="rounded-2xl bg-white ring-1 ring-rose-100 p-5 shadow-[0_10px_30px_rgba(244,63,94,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-lg font-semibold text-rose-700 ring-1 ring-rose-200 shadow-inner">
                {initial}
              </div>
              <div>
                <div className="flex items-center gap-2 text-rose-900">
                  <User className="h-4 w-4 text-rose-500" />
                  <span className="text-sm font-medium">Profile</span>
                </div>
                <p className="text-sm text-rose-700/70">
                  Your account information
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white ring-1 ring-red-800 shadow-sm transition-all hover:bg-red-500 hover:shadow-md active:translate-y-[1px]"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white ring-1 ring-green-800 shadow-sm transition-all hover:bg-green-500 hover:shadow-md active:translate-y-[1px]"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-rose-50/60 ring-1 ring-rose-100 p-3 shadow-inner">
                <p className="text-[10px] uppercase tracking-wide text-rose-600">
                  Full Name
                </p>
                <p className="mt-1 text-sm text-rose-900">
                  {(user as any)?.username ?? "-"}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50/60 ring-1 ring-rose-100 p-3 shadow-inner">
                <p className="text-[10px] uppercase tracking-wide text-rose-600">
                  Email
                </p>
                <p className="mt-1 text-sm text-rose-900">
                  {user?.email ?? "-"}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50/60 ring-1 ring-rose-100 p-3 shadow-inner">
                <p className="text-[10px] uppercase tracking-wide text-rose-600">
                  Company Name
                </p>
                <p className="mt-1 text-sm text-rose-900">
                  {(user as any)?.companyName ?? "-"}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50/60 ring-1 ring-rose-100 p-3 shadow-inner">
                <p className="text-[10px] uppercase tracking-wide text-rose-600">
                  Company Address
                </p>
                <p className="mt-1 text-sm text-rose-900">
                  {(user as any)?.companyAddress ?? "-"}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50/60 ring-1 ring-rose-100 p-3 shadow-inner">
                <p className="text-[10px] uppercase tracking-wide text-rose-600">
                  Contact Email
                </p>
                <p className="mt-1 text-sm text-rose-900">
                  {(user as any)?.contactEmail ?? "-"}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50/60 ring-1 ring-rose-100 p-3 shadow-inner">
                <p className="text-[10px] uppercase tracking-wide text-rose-600">
                  Contact Phone
                </p>
                <p className="mt-1 text-sm text-rose-900">
                  {(user as any)?.contactPhone ?? "-"}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50/60 ring-1 ring-rose-100 p-3 shadow-inner">
                <p className="text-[10px] uppercase tracking-wide text-rose-600">
                  Member Since
                </p>
                <p className="mt-1 text-sm text-rose-900">{memberSince}</p>
              </div>
              <div className="rounded-xl bg-rose-50/60 ring-1 ring-rose-100 p-3 shadow-inner">
                <p className="text-[10px] uppercase tracking-wide text-rose-600">
                  Last Updated
                </p>
                <p className="mt-1 text-sm text-rose-900">{lastUpdated}</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-rose-700">
                  Username
                </label>
                <input
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  placeholder="Your username"
                  className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-rose-700">
                  Email
                </label>
                <input
                  value={user?.email || ""}
                  readOnly
                  className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-rose-700">
                  Company Name
                </label>
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={onChange}
                  placeholder="Company name"
                  className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-rose-700">
                  Company Address
                </label>
                <input
                  name="companyAddress"
                  value={form.companyAddress}
                  onChange={onChange}
                  placeholder="Company address"
                  className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-rose-700">
                  Contact Email
                </label>
                <input
                  name="contactEmail"
                  value={form.contactEmail}
                  onChange={onChange}
                  placeholder="Contact email"
                  className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-rose-700">
                  Contact Phone
                </label>
                <input
                  name="contactPhone"
                  value={form.contactPhone}
                  onChange={onChange}
                  placeholder="Contact phone"
                  className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div className="sm:col-span-2 mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white ring-1 ring-red-800 shadow-sm transition-all hover:bg-red-500 hover:shadow-md active:translate-y-[1px] disabled:opacity-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-md hover:bg-green-500 active:translate-y-[1px] disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>Save Changes</>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Appraiser CV */}
        <section className="rounded-2xl bg-white ring-1 ring-rose-100 p-5 shadow-[0_8px_24px_rgba(244,63,94,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-rose-900">Appraiser CV</h2>
              <p className="mt-1 text-sm text-rose-700/80">
                Upload your CV. The link will appear on the last page of your reports.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-rose-50/60 ring-1 ring-rose-100 p-3 shadow-inner">
              <p className="text-[10px] uppercase tracking-wide text-rose-600">Current</p>
              {((user as any)?.cvUrl) ? (
                <div className="mt-1 text-sm text-rose-900 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate" title={(user as any)?.cvFilename || (user as any)?.cvUrl}>{(user as any)?.cvFilename || (user as any)?.cvUrl}</p>
                    <a
                      href={(user as any)?.cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-700 hover:underline"
                    >
                      View CV
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteCv}
                    disabled={uploadingCv}
                    className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-sm text-rose-900">No CV uploaded</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-rose-700">Upload CV</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleCvChange}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-rose-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-rose-500"
                />
                <button
                  type="button"
                  onClick={handleUploadCv}
                  disabled={!cvFile || uploadingCv}
                  className="rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white ring-1 ring-green-800 shadow-sm transition-all hover:bg-green-500 hover:shadow-md active:translate-y-[1px] disabled:opacity-50"
                >
                  {uploadingCv ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</span>
                  ) : (
                    <>Upload</>
                  )}
                </button>
              </div>
              {cvFile && (
                <p className="mt-1 text-xs text-gray-600">Selected: {cvFile.name}</p>
              )}
            </div>
          </div>
        </section>

        {/* Session */}
        <section className="rounded-2xl bg-white ring-1 ring-rose-100 p-5 shadow-[0_8px_24px_rgba(244,63,94,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-rose-900">Session</h2>
              <p className="mt-1 text-sm text-rose-700/80">
                Sign out of your account on this device.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200 shadow-sm transition-all hover:bg-rose-50 hover:shadow-md active:translate-y-[1px] disabled:opacity-50"
            >
              {loggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Logging out...
                </>
              ) : (
                <>Log out</>
              )}
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="rounded-2xl ring-1 ring-rose-200 bg-rose-50 p-5 shadow-[0_8px_24px_rgba(244,63,94,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-rose-800">
                <Trash2 className="h-4 w-4" /> Delete Account
              </h2>
              <p className="mt-1 text-sm text-rose-700">
                This action is permanent. All your reports and data will be
                removed.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={openDelete}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow-md hover:bg-rose-500"
            >
              <Trash2 className="h-4 w-4" /> Delete Account
            </button>
          </div>
        </section>

        {/* Delete Modal */}
        {isDeleteOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={closeDelete}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white ring-1 ring-rose-100 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
                <div className="flex items-center justify-between border-b border-rose-100 px-4 py-3">
                  <h3 className="text-base font-semibold text-gray-900">
                    Confirm Deletion
                  </h3>
                  <button
                    className="p-1 text-gray-500 hover:text-gray-700"
                    onClick={closeDelete}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-4 py-4">
                  <p className="text-sm text-gray-600">
                    This action will permanently delete your account and all
                    data. Type
                    <span className="px-1 font-semibold text-gray-900">
                      DELETE
                    </span>
                    to confirm.
                  </p>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700">
                      Type DELETE to confirm
                    </label>
                    <input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                  {needsPassword && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700">
                        Password
                      </label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Enter your password"
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                  )}
                  {error && (
                    <div className="mt-3 rounded-md border border-rose-300 bg-rose-50 p-2 text-sm text-rose-700">
                      {error}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 border-t px-4 py-3">
                  <button
                    type="button"
                    onClick={closeDelete}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={
                      deleting ||
                      confirmText !== "DELETE" ||
                      (needsPassword && !deletePassword)
                    }
                    className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-rose-500 disabled:opacity-50"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" /> Permanently Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
