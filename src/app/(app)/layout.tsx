import type { ReactNode } from "react";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { logoutAction } from "@/app/(auth)/login/actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { profile, email } = await requireProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="text-lg font-semibold text-foreground">
            i-lab Hub
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right leading-tight">
              <div className="font-medium">{profile.full_name || email}</div>
              <div className="text-muted">
                {profile.role === "admin" ? "Beheerder" : "Lid"}
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-black/[.03]"
              >
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
