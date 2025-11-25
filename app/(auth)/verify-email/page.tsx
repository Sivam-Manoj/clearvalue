import { Suspense } from "react";
import VerifyEmailForm from "@/components/auth/VerifyEmailForm";

// Force dynamic rendering to avoid static generation issues with useSearchParams
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <Suspense fallback={null}>
        <VerifyEmailForm />
      </Suspense>
    </main>
  );
}
