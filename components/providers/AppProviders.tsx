"use client";

import { ColorModeProvider, useColorMode } from "@/components/providers/ColorModeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { ToastContainer } from "react-toastify";

function ProvidersContent({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useColorMode();

  return (
    <AuthProvider>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme={resolvedTheme === "dark" ? "dark" : "colored"}
      />
    </AuthProvider>
  );
}

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ColorModeProvider>
      <ProvidersContent>{children}</ProvidersContent>
    </ColorModeProvider>
  );
}
