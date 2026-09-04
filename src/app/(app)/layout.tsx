import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { TopNav } from "./top-nav";
import { UserMenu } from "./user-menu";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { profile, email } = await requireProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-white/20">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="shrink-0">
              <Image
                src="/brand/logo-wit.png"
                alt="i_lab"
                width={110}
                height={44}
                priority
                className="h-8 w-auto sm:h-9"
              />
            </Link>
            <UserMenu
              naam={profile.full_name || email || "collega"}
              rol={profile.role === "admin" ? "Beheerder" : "Lid"}
              isAdmin={profile.role === "admin"}
            />
          </div>
          <div className="-mx-4 mt-2 px-4 sm:-mx-6 sm:px-6">
            <TopNav />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
