import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProtectedRoute>
      <Navbar>{children}</Navbar>
    </ProtectedRoute>
  );
}
