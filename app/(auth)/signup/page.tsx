import SignupForm from "@/components/auth/SignupForm";

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-rose-50 to-white">
      {/* Background accents */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-20 -z-10 h-64 bg-gradient-to-b from-rose-100/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(244,63,94,0.12),transparent_55%)]"
        aria-hidden
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 sm:pb-14">
        <div className="mb-8 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs text-rose-700 ring-1 ring-rose-100 shadow-sm backdrop-blur">
            Create your account
          </span>
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-rose-600 to-rose-400 bg-clip-text text-transparent drop-shadow-sm">
              ClearValue
            </span>
          </h1>
          <p className="mt-2 text-sm sm:text-base text-rose-800/70">
            Join ClearValue to get started
          </p>
        </div>

        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          {/* Right: Form */}
          <div className="order-2 lg:order-2">
            <SignupForm />
          </div>

          <div className="order-1 lg:order-1 md:mt-[-25rem]">
            <div className="relative rounded-3xl bg-white/80 p-6 sm:p-8 ring-1 ring-rose-100 shadow-[0_20px_60px_rgba(244,63,94,0.12)] backdrop-blur">
              {/* Soft glowing blobs */}
              <div className="pointer-events-none absolute -top-8 -left-8 h-40 w-40 rounded-full bg-rose-200/60 blur-3xl animate-pulse" />
              <div className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-rose-300/50 blur-3xl animate-pulse" />

              {/* Illustration block */}
              <div className="relative">
                <div className="mx-auto flex h-40 w-full items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-100 via-rose-50 to-white ring-1 ring-rose-100 shadow-inner sm:h-48">
                  <div className="h-12 w-12 rounded-2xl bg-rose-500 shadow-lg shadow-rose-500/30" />
                </div>
                <ul className="mt-6 space-y-3 text-sm text-rose-900/90">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.15)]" />
                    Fast, secure appraisals
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.15)]" />
                    Smart workflows with a clean UI
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.15)]" />
                    Built for professionals
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
