import { Suspense } from "react";
import VerifyEmailForm from "@/components/auth/VerifyEmailForm";

export default function Page() {
  return (
    <main className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <Suspense fallback={null}>
        <VerifyEmailForm />
      </Suspense>
    </main>
  );
}
