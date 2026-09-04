import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { logoutAction } from "@/app/(auth)/login/actions";
import { TopNav } from "./top-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { profile, email } = await requireProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-white/20">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard">
              <Image
                src="/brand/logo-wit.png"
                alt="i_lab"
                width={110}
                height={44}
                priority
                className="h-9 w-auto"
              />
            </Link>
            <TopNav />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right leading-tight text-white">
              <div className="font-medium">{profile.full_name || email}</div>
              <div className="text-white/70">
                {profile.role === "admin" ? "Beheerder" : "Lid"}
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-white/40 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/15"
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
