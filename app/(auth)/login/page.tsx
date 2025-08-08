import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function Page() {
  return (
    <main className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
