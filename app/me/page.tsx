"use client";

import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";

export default function Page() {
  const router = useRouter();
  const { user, loading, error, logout } = useAuthContext();

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Profile</h1>
          <button
            onClick={onLogout}
            className="rounded bg-gray-800 px-3 py-2 text-white hover:bg-black"
          >
            Logout
          </button>
        </div>
        {loading && (
          <div className="animate-pulse rounded border bg-white p-4">
            Loading...
          </div>
        )}
        {!loading && error && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}
        {!loading && user && (
          <div className="rounded border bg-white p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <div className="text-xs text-gray-500">Email</div>
                <div className="font-medium">{user.email}</div>
              </div>
              {user.username && (
                <div>
                  <div className="text-xs text-gray-500">Username</div>
                  <div className="font-medium">{user.username}</div>
                </div>
              )}
              {user.companyName && (
                <div>
                  <div className="text-xs text-gray-500">Company</div>
                  <div className="font-medium">{user.companyName}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-500">Verified</div>
                <div className="font-medium">
                  {user.isVerified ? "Yes" : "No"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
