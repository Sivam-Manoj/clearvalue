export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
        <p className="text-sm text-rose-700">Loading...</p>
      </div>
    </div>
  );
}
