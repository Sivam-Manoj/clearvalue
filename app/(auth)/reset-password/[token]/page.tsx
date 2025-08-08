import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <ResetPasswordForm token={token} />
    </main>
  );
}
